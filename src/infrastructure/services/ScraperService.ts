import { IScraperService } from "../../domain/interfaces/IScraperService";
import { IProxyService } from "../../domain/interfaces/IProxyService";
import { ILogger } from "../../domain/interfaces/ILogger";
import { ProductData } from "../../domain/entities/Product";
import { ShopeeHttpClient } from "../http/ShopeeHttpClient";
import { PlaywrightFallbackService } from "./PlaywrightFallbackService";
import { ScraperApiService } from "./ScraperApiService";
import { ScraperError } from "../../domain/errors/ScraperError";
import { env } from "../../config/environment";

export class ScraperService implements IScraperService {
  private readonly playwrightFallback: PlaywrightFallbackService;
  private readonly scraperApiService?: ScraperApiService;

  constructor(
    private readonly logger: ILogger,
    private readonly proxyService?: IProxyService
  ) {
    this.playwrightFallback = new PlaywrightFallbackService(logger);

    // Initialize ScraperAPI if key is configured
    if (env.SCRAPERAPI_KEY) {
      this.scraperApiService = new ScraperApiService(
        {
          apiKey: env.SCRAPERAPI_KEY,
          countryCode: env.SCRAPERAPI_COUNTRY_CODE || "tw",
          premium: env.SCRAPERAPI_PREMIUM,
          ultraPremium: env.SCRAPERAPI_ULTRA_PREMIUM,
          render: env.SCRAPERAPI_RENDER,
        },
        logger
      );
    }
  }

  async fetchProduct(storeId: string, dealId: string): Promise<ProductData> {
    const scraperLogger = this.logger.child({ storeId, dealId, scope: "ScraperService" });
    const strategies: string[] = [];

    // Strategy 0: ScraperAPI (paid proxy service, handles anti-bot automatically)
    // Only runs if SCRAPERAPI_KEY is configured. Best for target sulit like Shopee.
    if (this.scraperApiService) {
      try {
        scraperLogger.info("[STRATEGY] Attempting Strategy 0: ScraperAPI");
        const data = await this.scraperApiService.fetchProduct(storeId, dealId);
        if (data) {
          scraperLogger.info("[STRATEGY] Strategy 0 succeeded: ScraperAPI", { strategies: [...strategies, "scraperapi"] });
          return this.normalizeResponse(data);
        }
      } catch (error) {
        strategies.push("scraperapi");
        scraperLogger.warn("[STRATEGY] Strategy 0 failed: ScraperAPI", { error: (error as Error).message, strategy: "scraperapi" });
      }
    }

    // Strategy 1: Direct API call via get_pc (with proxy rotation if available)
    try {
      scraperLogger.info("[STRATEGY] Attempting Strategy 1: Direct API (get_pc)");
      const data = await this.tryDirectApi(storeId, dealId, "get_pc");
      if (data) {
        scraperLogger.info("[STRATEGY] Strategy 1 succeeded: Direct get_pc", { strategies: [...strategies, "direct_get_pc"] });
        return this.normalizeResponse(data);
      }
    } catch (error) {
      strategies.push("direct_get_pc");
      scraperLogger.warn("[STRATEGY] Strategy 1 failed: Direct get_pc", { error: (error as Error).message, strategy: "direct_get_pc" });
    }

    // Strategy 2: Direct API call via get_rw (with proxy rotation if available)
    try {
      scraperLogger.info("[STRATEGY] Attempting Strategy 2: Direct API (get_rw)");
      const data = await this.tryDirectApi(storeId, dealId, "get_rw");
      if (data) {
        scraperLogger.info("[STRATEGY] Strategy 2 succeeded: Direct get_rw", { strategies: [...strategies, "direct_get_rw"] });
        return this.normalizeResponse(data);
      }
    } catch (error) {
      strategies.push("direct_get_rw");
      scraperLogger.warn("[STRATEGY] Strategy 2 failed: Direct get_rw", { error: (error as Error).message, strategy: "direct_get_rw" });
    }

    // Strategy 3: Playwright browser interception
    try {
      scraperLogger.info("[STRATEGY] Attempting Strategy 3: Playwright Browser Fallback");
      const data = await this.playwrightFallback.fetchWithBrowser(storeId, dealId);
      if (data) {
        scraperLogger.info("[STRATEGY] Strategy 3 succeeded: Playwright Fallback", { strategies: [...strategies, "playwright"] });
        return this.normalizeResponse(data);
      }
    } catch (error) {
      strategies.push("playwright");
      scraperLogger.error("[STRATEGY] Strategy 3 failed: Playwright Fallback", { error: (error as Error).message, strategy: "playwright" });
    }

    scraperLogger.error("[STRATEGY] All scraping strategies exhausted", { strategies });
    throw new ScraperError(
      `Failed to fetch product after all strategies: ${strategies.join(" -> ")}`,
      503,
      false
    );
  }

  private async tryDirectApi(storeId: string, dealId: string, endpoint: "get_pc" | "get_rw"): Promise<unknown> {
    const apiLogger = this.logger.child({ storeId, dealId, endpoint, scope: "DirectApi" });

    // Build proxy list: if proxyService available, try 3 different proxies
    // Otherwise, try direct connection only
    const proxies: (string | undefined)[] = [];
    if (this.proxyService) {
      for (let i = 0; i < 3; i++) {
        const proxy = this.proxyService.getNextProxy();
        if (proxy) proxies.push(proxy);
      }
      // If no proxies available from service, try direct as last resort
      if (proxies.length === 0) proxies.push(undefined);
    } else {
      proxies.push(undefined);
    }

    let lastError: Error | undefined;

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      const attemptNum = i + 1;

      if (proxy) {
        apiLogger.info(`[REQUEST] Attempt ${attemptNum}/${proxies.length} via proxy`, { proxy: proxy.replace(/:\/\/.*@/, "://***@") });
      } else {
        apiLogger.info(`[REQUEST] Attempt ${attemptNum}/${proxies.length} direct connection (no proxy)`);
      }

      try {
        const client = new ShopeeHttpClient(this.logger, proxy || undefined);
        const result = endpoint === "get_pc"
          ? await client.fetchGetPc(storeId, dealId)
          : await client.fetchGetRw(storeId, dealId);

        apiLogger.info(`[RESPONSE] Attempt ${attemptNum} succeeded`, { endpoint, usedProxy: !!proxy });
        return result;
      } catch (error) {
        lastError = error as Error;
        if (this.proxyService && proxy) {
          this.proxyService.markProxyFailed(proxy);
          apiLogger.warn(`[PROXY] Proxy marked as failed`, { proxy: proxy.replace(/:\/\/.*@/, "://***@") });
        }
        // Continue to next proxy even if non-retryable (we want to try all proxies)
        apiLogger.warn(`[RESPONSE] Attempt ${attemptNum} failed`, { error: lastError.message });
      }
    }

    throw lastError || new ScraperError(`All ${endpoint} attempts failed`, 503, false);
  }

  private normalizeResponse(rawData: unknown): ProductData {
    if (!rawData || typeof rawData !== "object") {
      throw new ScraperError("Invalid response format", 500, false);
    }

    const data = rawData as Record<string, unknown>;

    const hasShopeeError = data.error && data.error !== 0 && data.error !== null;

    this.logger.info("[RESPONSE] Response normalized", {
      hasData: !!data.data,
      errorCode: data.error,
      errorMsg: data.error_msg,
      isShopeeError: hasShopeeError,
    });

    // If Shopee API returned an error (like item not found), still return it as valid data
    // This is not a scraper error, but a valid Shopee API response
    if (hasShopeeError && !data.data) {
      return {
        bff_meta: null,
        data: null,
        error: typeof data.error === "number" ? data.error : null,
        error_msg: typeof data.error_msg === "string" ? data.error_msg : null,
      };
    }

    return {
      bff_meta: null,
      data: (data.data as Record<string, unknown>) || null,
      error: typeof data.error === "number" ? data.error : null,
      error_msg: typeof data.error_msg === "string" ? data.error_msg : null,
    };
  }
}
