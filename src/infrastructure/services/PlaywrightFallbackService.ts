import { ILogger } from "../../domain/interfaces/ILogger";
import { ScraperError } from "../../domain/errors/ScraperError";
import { env } from "../../config/environment";

export class PlaywrightFallbackService {
  constructor(private readonly logger: ILogger) {}

  /**
   * Launch browser with optional proxy. If proxy fails, retry without proxy.
   */
  private async launchBrowser(): Promise<any> {
    const { chromium } = await import("playwright-extra");
    const stealth = await import("puppeteer-extra-plugin-stealth");
    const stealthPlugin = (stealth as any).default || stealth;
    chromium.use(stealthPlugin());

    const baseArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials",
      "--disable-features=InterestCohort",
    ];

    // Try with proxy first (if configured)
    if (env.PROXY_LIST_RAW) {
      const proxyUrl = env.PROXY_LIST_RAW.split(",")[0].trim();
      try {
        this.logger.info("[REQUEST] Playwright trying with proxy", {
          proxy: proxyUrl.replace(/:\/\/.*@/, "://***@"),
        });
        const browser = await chromium.launch({
          headless: true,
          args: baseArgs,
          proxy: { server: proxyUrl },
        });
        return { browser, proxyUsed: true };
      } catch (error) {
        this.logger.warn("[WARNING] Playwright proxy launch failed, retrying without proxy", {
          error: (error as Error).message,
        });
      }
    }

    // Launch without proxy
    const browser = await chromium.launch({
      headless: true,
      args: baseArgs,
    });
    return { browser, proxyUsed: false };
  }

  async fetchWithBrowser(storeId: string, dealId: string): Promise<unknown> {
    let browser: any = null;

    try {
      const launchResult = await this.launchBrowser();
      browser = launchResult.browser;

      const context = await browser.newContext({
        locale: "zh-TW",
        timezoneId: "Asia/Taipei",
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        colorScheme: "light",
        reducedMotion: "no-preference",
      });

      const page = await context.newPage();

      let apiResponse: unknown | null = null;
      let apiErrorResponse: unknown | null = null;

      // Intercept the get_pc API call
      page.on("response", async (response: any) => {
        const url = response.url();
        if (url.includes("/api/v4/pdp/get_pc") || url.includes("/api/v4/pdp/get_rw")) {
          try {
            const json = await response.json();
            apiResponse = json;
          } catch {
            // Not JSON, ignore
          }
        }
        if (url.includes("/api/v4/pdp/get") && response.status() >= 400) {
          try {
            const json = await response.json();
            apiErrorResponse = json;
          } catch {
            // Not JSON
          }
        }
      });

      const productUrl = `https://shopee.tw/a-i.${storeId}.${dealId}`;
      this.logger.info("[REQUEST] Navigating with Playwright", { url: productUrl, method: "GET" });

      await page.goto(productUrl, { waitUntil: "networkidle", timeout: 30000 });

      // Simulate human behavior
      await this.simulateHumanBehavior(page);

      // Get page info
      const pageTitle = await page.title();
      this.logger.info("[DEBUG] Playwright page title", { title: pageTitle });

      // Check for blocks
      const pageContent = await page.content();
      const isBlocked =
        pageContent.toLowerCase().includes("captcha") ||
        pageContent.toLowerCase().includes("verify") ||
        pageContent.toLowerCase().includes("are you a robot") ||
        pageContent.toLowerCase().includes("blocked");

      if (isBlocked) {
        this.logger.warn("[WARNING] Playwright detected possible block/captcha", { url: productUrl });
      }

      // Return successful API response
      if (apiResponse) {
        const response = apiResponse as Record<string, unknown>;
        if (response.error && response.error !== 0 && response.error !== null) {
          this.logger.warn("[RESPONSE] Playwright intercepted API but got error code", {
            url: productUrl,
            error: response.error,
            errorMsg: response.error_msg,
          });
          return apiResponse;
        }
        this.logger.info("[RESPONSE] Playwright intercepted API response", { url: productUrl });
        return apiResponse;
      }

      // Return error response if we got one
      if (apiErrorResponse) {
        this.logger.warn("[RESPONSE] Playwright intercepted API error response", { url: productUrl });
        return apiErrorResponse;
      }

      throw new ScraperError("Playwright could not intercept API response", 503, false);
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      this.logger.error("[ERROR] Playwright fallback failed", { error: (error as Error).message });
      throw new ScraperError(`Browser fallback failed: ${(error as Error).message}`, 503, false);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Alternative: Fetch from Shopee Indonesia
   */
  async fetchWithBrowserIndonesia(itemId: string, shopId: string): Promise<unknown> {
    let browser: any = null;

    try {
      const launchResult = await this.launchBrowser();
      browser = launchResult.browser;

      const context = await browser.newContext({
        locale: "id-ID",
        timezoneId: "Asia/Jakarta",
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      });

      const page = await context.newPage();

      let apiResponse: unknown | null = null;

      page.on("response", async (response: any) => {
        const url = response.url();
        if (url.includes("/api/v4/pdp/get_pc") || url.includes("/api/v4/pdp/get_rw")) {
          try {
            const json = await response.json();
            apiResponse = json;
          } catch {
            // Not JSON
          }
        }
      });

      const productUrl = `https://shopee.co.id/product/${shopId}/${itemId}`;
      this.logger.info("[REQUEST] Navigating Shopee ID", { url: productUrl });

      await page.goto(productUrl, { waitUntil: "networkidle", timeout: 30000 });
      await this.simulateHumanBehavior(page);

      if (apiResponse) {
        const response = apiResponse as Record<string, unknown>;
        if (response.error && response.error !== 0 && response.error !== null) {
          this.logger.warn("[RESPONSE] Shopee ID API error code", {
            error: response.error,
            errorMsg: response.error_msg,
          });
          return apiResponse;
        }
        this.logger.info("[RESPONSE] Shopee ID intercepted API response");
        return apiResponse;
      }

      throw new ScraperError("Playwright could not intercept Shopee ID API response", 503, false);
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      this.logger.error("[ERROR] Playwright Shopee ID fallback failed", { error: (error as Error).message });
      throw new ScraperError(`Browser fallback failed for Shopee ID: ${(error as Error).message}`, 503, false);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Simulate human-like browsing behavior
   */
  private async simulateHumanBehavior(page: any): Promise<void> {
    try {
      // Wait random time after page load
      await page.waitForTimeout(2000 + Math.random() * 1000);

      // Move mouse randomly
      await this.simulateMouseMovements(page);

      // Scroll down with pauses
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(1500 + Math.random() * 500);
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(1000 + Math.random() * 500);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(2000);

      // Sometimes scroll back up
      if (Math.random() > 0.5) {
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(1000);
      }

      // Wait for API calls to settle
      await page.waitForTimeout(3000);
    } catch (err) {
      this.logger.warn("[WARNING] Human behavior simulation failed", { error: (err as Error).message });
    }
  }

  /**
   * Simulate natural mouse movements across the page
   */
  private async simulateMouseMovements(page: any): Promise<void> {
    const movements = [
      { x: 400, y: 300 },
      { x: 600, y: 500 },
      { x: 800, y: 400 },
      { x: 500, y: 700 },
    ];

    for (const pos of movements) {
      try {
        await page.mouse.move(pos.x + Math.random() * 50 - 25, pos.y + Math.random() * 50 - 25);
        await page.waitForTimeout(300 + Math.random() * 400);
      } catch {
        // Ignore mouse movement errors
      }
    }
  }
}
