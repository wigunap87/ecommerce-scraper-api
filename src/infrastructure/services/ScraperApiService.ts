import axios, { AxiosInstance } from "axios";
import { ILogger } from "../../domain/interfaces/ILogger";
import { ScraperError } from "../../domain/errors/ScraperError";
import { SHOPEE_API, SHOPEE_ORIGIN } from "../../config/constants";
import { withRetry } from "../utils/RetryUtil";

export interface ScraperApiConfig {
  apiKey: string;
  countryCode?: string; // e.g. "tw", "sg", "my"
  premium?: boolean;
  ultraPremium?: boolean; // for heavily protected sites like Shopee (costs 30 credits)
  render?: boolean; // for JS rendering (slower, more expensive)
}

/**
 * ScraperAPI integration service.
 * Uses https://www.scraperapi.com to handle proxy rotation, CAPTCHAs, and anti-bot.
 *
 * Free trial: 5,000 API calls (no credit card required).
 * Pricing: starts at ~$49/mo for 100,000 calls (~$0.00049/call).
 *
 * For Shopee Taiwan product detail scraping, this service proxies requests
 * through ScraperAPI to avoid IP bans and anti-bot detection.
 */
export class ScraperApiService {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseParams: Record<string, string | boolean | undefined>;

  constructor(
    private readonly config: ScraperApiConfig,
    private readonly logger: ILogger
  ) {
    this.axiosInstance = axios.create({
      timeout: 30000, // ScraperAPI can be slower
      maxRedirects: 5,
      validateStatus: () => true,
    });

    this.baseParams = {
      api_key: config.apiKey,
      country_code: config.countryCode,
      premium: config.premium ?? true,
      ultra_premium: config.ultraPremium ?? false,
      render: config.render ?? false,
    };
  }

  /**
   * Fetch product detail from Shopee Taiwan via ScraperAPI.
   * Uses the internal Shopee API endpoint for maximum reliability.
   */
  async fetchProduct(storeId: string, dealId: string): Promise<unknown> {
    const serviceLogger = this.logger.child({
      storeId,
      dealId,
      scope: "ScraperApiService",
    });

    return withRetry(async () => {
      try {
        // Strategy A: Use Shopee internal API via ScraperAPI (fast, cheap)
        const apiUrl = this.buildScraperApiUrl(
          `${SHOPEE_ORIGIN}${SHOPEE_API.GET_PC}`,
          {
            shopid: storeId,
            itemid: dealId,
            tmpl: "1",
          }
        );

        serviceLogger.info("[REQUEST] Calling ScraperAPI (get_pc)", {
          targetHost: "shopee.tw",
          endpoint: SHOPEE_API.GET_PC,
        });

        const start = Date.now();
        const response = await this.axiosInstance.get(apiUrl, {
          headers: {
            Accept: "application/json",
            "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            Referer: `${SHOPEE_ORIGIN}/`,
          },
        });
        const duration = Date.now() - start;

        if (response.status !== 200) {
          serviceLogger.warn("[RESPONSE] ScraperAPI returned non-200", {
            status: response.status,
            durationMs: duration,
          });
          throw new ScraperError(
            `ScraperAPI error: HTTP ${response.status}`,
            response.status,
            response.status >= 500
          );
        }

        const data = response.data;

        if (!data || typeof data !== "object") {
          throw new ScraperError("Invalid response format from ScraperAPI", 500, true);
        }

        // ScraperAPI sometimes returns a stringified JSON inside data
        const parsedData = this.parseResponse(data);

        serviceLogger.info("[RESPONSE] ScraperAPI success", {
          durationMs: duration,
          hasData: !!parsedData.data || !!parsedData,
          errorCode: parsedData.error,
        });

        return parsedData;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            throw new ScraperError(
              `ScraperAPI HTTP error: ${error.response.status}`,
              error.response.status,
              error.response.status >= 500 || error.response.status === 429
            );
          }
          if (error.code === "ECONNABORTED") {
            throw new ScraperError("ScraperAPI request timeout", 504, true);
          }
          throw new ScraperError(`ScraperAPI network error: ${error.message}`, 503, true);
        }
        throw error;
      }
    }, serviceLogger);
  }

  /**
   * Build the ScraperAPI request URL.
   * Format: https://api.scraperapi.com/?api_key=KEY&url=ENCODED_URL&country_code=tw
   */
  private buildScraperApiUrl(
    targetUrl: string,
    queryParams?: Record<string, string>
  ): string {
    const url = new URL("https://api.scraperapi.com/");
    url.searchParams.set("api_key", this.config.apiKey);

    // Build target URL with query params
    let finalTargetUrl = targetUrl;
    if (queryParams) {
      const target = new URL(targetUrl);
      Object.entries(queryParams).forEach(([key, value]) => {
        target.searchParams.set(key, value);
      });
      finalTargetUrl = target.toString();
    }

    url.searchParams.set("url", finalTargetUrl);

    // Optional params
    if (this.baseParams.country_code) {
      url.searchParams.set("country_code", this.baseParams.country_code as string);
    }
    if (this.baseParams.premium) {
      url.searchParams.set("premium", "true");
    }
    if (this.baseParams.ultra_premium) {
      url.searchParams.set("ultra_premium", "true");
    }
    if (this.baseParams.render) {
      url.searchParams.set("render", "true");
    }

    return url.toString();
  }

  /**
   * Parse ScraperAPI response.
   * Handles both direct JSON and stringified JSON edge cases.
   */
  private parseResponse(data: unknown): Record<string, unknown> {
    if (typeof data === "string") {
      try {
        return JSON.parse(data) as Record<string, unknown>;
      } catch {
        return { raw: data, error: 500, error_msg: "Invalid JSON response" };
      }
    }
    return data as Record<string, unknown>;
  }
}
