import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { CookieJar } from "tough-cookie";
import { env } from "../../config/environment";
import { SHOPEE_API, SHOPEE_ORIGIN } from "../../config/constants";
import { ILogger } from "../../domain/interfaces/ILogger";
import { ScraperError } from "../../domain/errors/ScraperError";
import { withRetry } from "../utils/RetryUtil";
import { randomDelay } from "../utils/DelayUtil";

export interface ShopeePcParams {
  shopid: number;
  itemid: number;
  tmpl: number;
}

export class ShopeeHttpClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly cookieJar: CookieJar;
  private sessionStartTime: number;
  private csrfToken: string | null = null;

  constructor(
    private readonly logger: ILogger,
    private readonly proxyUrl?: string
  ) {
    this.cookieJar = new CookieJar();
    this.sessionStartTime = Date.now();

    const axiosConfig: AxiosRequestConfig = {
      timeout: env.REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
      decompress: true,
      validateStatus: () => true,
    };

    if (proxyUrl) {
      try {
        const url = new URL(proxyUrl);
        // Use https-proxy-agent for better compatibility with residential proxies
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { HttpsProxyAgent } = require("https-proxy-agent");
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
        this.logger.info("[REQUEST] Proxy configured", { proxyHost: url.hostname });
      } catch {
        this.logger.warn(`[ERROR] Invalid proxy URL: ${proxyUrl}`);
      }
    }

    this.axiosInstance = axios.create(axiosConfig);
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(async (config) => {
      if (env.ENABLE_STEALTH) {
        await randomDelay(200, 800);
      }
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => {
        const setCookieHeader = response.headers["set-cookie"];
        if (setCookieHeader) {
          setCookieHeader.forEach((cookie: string) => {
            try {
              this.cookieJar.setCookieSync(cookie, response.config.url || SHOPEE_ORIGIN);
            } catch {
              // Ignore malformed cookies
            }
          });
        }
        return response;
      },
      (error) => Promise.reject(error)
    );
  }

  private shouldRotateSession(): boolean {
    return Date.now() - this.sessionStartTime > env.SESSION_ROTATE_INTERVAL_MS;
  }

  private rotateSession(): void {
    this.cookieJar.removeAllCookiesSync();
    this.csrfToken = null;
    this.sessionStartTime = Date.now();
    this.logger.info("[SESSION] Session rotated");
  }

  private getBaseHeaders(storeId: string, dealId: string): Record<string, string> {
    const referer = `${SHOPEE_ORIGIN}/a-i.${storeId}.${dealId}`;
    const cookieString = this.cookieJar.getCookieStringSync(SHOPEE_ORIGIN);

    const headers: Record<string, string> = {
      "User-Agent": this.getRandomUserAgent(),
      "Accept": "application/json",
      "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": referer,
      "Origin": SHOPEE_ORIGIN,
      "Connection": "keep-alive",
      "DNT": "1",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "x-api-source": "pc",
      "x-requested-with": "XMLHttpRequest",
      "x-shopee-language": "zh-Hant",
      "x-shopee-platform": "pc",
      "x-shopee-client": "pc",
      "x-request-id": this.generateRequestId(),
      "Cookie": cookieString || this.generateInitialCookies(),
    };

    if (this.csrfToken) {
      headers["x-csrftoken"] = this.csrfToken;
      headers["x-csrftoken-2"] = this.csrfToken;
    }

    return headers;
  }

  private generateRequestId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getRandomUserAgent(): string {
    const agents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private generateDeviceId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateInitialCookies(): string {
    const deviceId = this.generateDeviceId();
    const sessionId = this.generateSessionId();
    const timestamp = Date.now();
    const timestampSec = Math.floor(timestamp / 1000);
    const cookies = [
      `SPC_F=${deviceId}`,
      `SPC_SI=${sessionId}`,
      `SPC_U=${sessionId}`,
      `SPC_RND=${Math.random().toString(36).substring(2, 15)}`,
      `REC_T_ID=${deviceId}-${timestamp}`,
      `SPC_T_ID=${deviceId}`,
      `SPC_EC=${sessionId}`,
      `SPC_ST=${timestampSec}`,
      `SPC_T_IV=1`,
      `SPC_T_T=1`,
      `SPC_CDS=${timestamp}`,
    ];
    return cookies.join("; ");
  }

  private extractCsrfToken(html: string): string | null {
    const match = html.match(/<meta[^>]+name="csrftoken"[^>]+content="([^"]+)"/i);
    if (match) return match[1];
    const match2 = html.match(/"csrfToken"\s*:\s*"([^"]+)"/);
    if (match2) return match2[1];
    const match3 = html.match(/csrftoken=([^;\s]+)/);
    if (match3) return match3[1];
    return null;
  }

  async prewarmProductPage(storeId: string, dealId: string): Promise<void> {
    const url = `${SHOPEE_ORIGIN}/a-i.${storeId}.${dealId}`;
    const cookieString = this.cookieJar.getCookieStringSync(SHOPEE_ORIGIN) || this.generateInitialCookies();

    const headers: Record<string, string> = {
      "User-Agent": this.getRandomUserAgent(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
      "DNT": "1",
      "Cookie": cookieString,
    };

    try {
      this.logger.info("[REQUEST] Pre-warming product page", { url, method: "GET" });
      const start = Date.now();
      const response = await this.axiosInstance.get(url, { headers });
      const duration = Date.now() - start;

      if (response.status === 200 && typeof response.data === "string") {
        const csrf = this.extractCsrfToken(response.data);
        if (csrf) {
          this.csrfToken = csrf;
          this.logger.info("[RESPONSE] CSRF token extracted", { csrfPrefix: csrf.substring(0, 8) + "...", durationMs: duration });
        } else {
          this.logger.warn("[RESPONSE] No CSRF token found in page", { durationMs: duration });
        }
      } else if (response.status === 403) {
        this.logger.warn("[RESPONSE] Pre-warm blocked (403), likely anti-bot", { status: response.status, durationMs: duration });
      } else {
        this.logger.warn("[RESPONSE] Pre-warm returned non-200", { status: response.status, durationMs: duration });
      }
    } catch (err) {
      const error = err as any;
      if (error.response?.status === 403) {
        this.logger.warn("[RESPONSE] Pre-warm blocked by anti-bot", { status: 403 });
      } else {
        this.logger.warn("[ERROR] Pre-warm failed, continuing anyway", { error: error.message });
      }
    }
  }

  async fetchGetPc(storeId: string, dealId: string): Promise<unknown> {
    if (this.shouldRotateSession()) {
      this.rotateSession();
    }

    // Pre-warm cookies by visiting the product page HTML first
    await this.prewarmProductPage(storeId, dealId);

    const headers = this.getBaseHeaders(storeId, dealId);

    const params = {
      shopid: parseInt(storeId, 10),
      itemid: parseInt(dealId, 10),
      tmpl: 1,
    };

    return withRetry(async () => {
      try {
        this.logger.info("[REQUEST] Calling Shopee get_pc API", { shopid: params.shopid, itemid: params.itemid, endpoint: SHOPEE_API.GET_PC });
        const start = Date.now();
        const response = await this.axiosInstance.get(`${SHOPEE_ORIGIN}${SHOPEE_API.GET_PC}`, {
          headers,
          params,
        });
        const duration = Date.now() - start;

        if (response.status === 403 || response.status === 429) {
          this.logger.warn("[RESPONSE] Blocked by anti-bot", { status: response.status, durationMs: duration });
          throw new ScraperError(
            `Blocked by anti-bot: HTTP ${response.status}`,
            response.status,
            true
          );
        }

        if (response.status !== 200) {
          this.logger.warn("[RESPONSE] Unexpected status", { status: response.status, durationMs: duration });
          throw new ScraperError(
            `Unexpected status: ${response.status}`,
            response.status,
            response.status >= 500
          );
        }

        const data = response.data;

        if (!data || typeof data !== "object") {
          throw new ScraperError("Invalid response format", 500, true);
        }

        // Shopee API error (like 90309999 item not found) is a valid response
        // Return it so caller can decide how to handle
        if (data.error && data.error !== 0 && data.error !== null) {
          this.logger.warn("[RESPONSE] Shopee API returned error code", { error: data.error, errorMsg: data.error_msg, durationMs: duration });
          return data;
        }

        this.logger.info("[RESPONSE] Shopee get_pc success", { durationMs: duration, hasData: !!data.data });
        return data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            throw new ScraperError(
              `HTTP error: ${error.response.status}`,
              error.response.status,
              error.response.status >= 500 || error.response.status === 429
            );
          }
          if (error.code === "ECONNABORTED") {
            throw new ScraperError("Request timeout", 504, true);
          }
          throw new ScraperError(`Network error: ${error.message}`, 503, true);
        }
        throw error;
      }
    }, this.logger);
  }

  async fetchGetRw(storeId: string, dealId: string): Promise<unknown> {
    if (this.shouldRotateSession()) {
      this.rotateSession();
    }

    await this.prewarmProductPage(storeId, dealId);

    const headers = this.getBaseHeaders(storeId, dealId);

    const params = {
      shopid: parseInt(storeId, 10),
      itemid: parseInt(dealId, 10),
    };

    return withRetry(async () => {
      try {
        this.logger.info("[REQUEST] Calling Shopee get_rw API", { shopid: params.shopid, itemid: params.itemid, endpoint: SHOPEE_API.GET_RW });
        const start = Date.now();
        const response = await this.axiosInstance.get(`${SHOPEE_ORIGIN}${SHOPEE_API.GET_RW}`, {
          headers,
          params,
        });
        const duration = Date.now() - start;

        if (response.status === 403 || response.status === 429) {
          this.logger.warn("[RESPONSE] Blocked by anti-bot", { status: response.status, durationMs: duration });
          throw new ScraperError(
            `Blocked by anti-bot: HTTP ${response.status}`,
            response.status,
            true
          );
        }

        if (response.status !== 200) {
          this.logger.warn("[RESPONSE] Unexpected status", { status: response.status, durationMs: duration });
          throw new ScraperError(
            `Unexpected status: ${response.status}`,
            response.status,
            response.status >= 500
          );
        }

        const data = response.data;
        if (!data || typeof data !== "object") {
          throw new ScraperError("Invalid response format", 500, true);
        }

        // Shopee API error is a valid response
        if (data.error && data.error !== 0 && data.error !== null) {
          this.logger.warn("[RESPONSE] Shopee API returned error code", { error: data.error, errorMsg: data.error_msg, durationMs: duration });
          return data;
        }

        this.logger.info("[RESPONSE] Shopee get_rw success", { durationMs: duration, hasData: !!data.data });
        return data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            throw new ScraperError(
              `HTTP error: ${error.response.status}`,
              error.response.status,
              error.response.status >= 500 || error.response.status === 429
            );
          }
          if (error.code === "ECONNABORTED") {
            throw new ScraperError("Request timeout", 504, true);
          }
          throw new ScraperError(`Network error: ${error.message}`, 503, true);
        }
        throw error;
      }
    }, this.logger);
  }
}
