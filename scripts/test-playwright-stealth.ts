/**
 * Test script untuk mencoba Shopee scraping dengan Playwright + Stealth
 * 
 * Usage:
 *   npx ts-node scripts/test-playwright-stealth.ts [storeId] [dealId]
 * 
 * Examples:
 *   # Shopee Taiwan
 *   npx ts-node scripts/test-playwright-stealth.ts 10001 12345
 * 
 *   # Shopee Indonesia (gunakan method khusus)
 *   npx ts-node scripts/test-playwright-stealth.ts id 123456789 987654321
 */

import { PlaywrightFallbackService } from "../src/infrastructure/services/PlaywrightFallbackService";
import { Logger } from "../src/infrastructure/services/Logger";

async function main() {
  const logger = new Logger();
  const service = new PlaywrightFallbackService(logger);

  const args = process.argv.slice(2);
  
  if (args[0] === "id" && args.length >= 3) {
    // Test Shopee Indonesia
    const itemId = args[1];
    const shopId = args[2];
    logger.info("=== Testing Shopee Indonesia ===", { itemId, shopId });
    
    try {
      const result = await service.fetchWithBrowserIndonesia(itemId, shopId);
      logger.info("SUCCESS", { result });
    } catch (error) {
      logger.error("FAILED", { error: (error as Error).message });
    }
    return;
  }

  if (args.length < 2) {
    logger.error("Usage: npx ts-node scripts/test-playwright-stealth.ts [storeId] [dealId]");
    logger.error("   or: npx ts-node scripts/test-playwright-stealth.ts id [itemId] [shopId]");
    process.exit(1);
  }

  // Test Shopee Taiwan
  const storeId = args[0];
  const dealId = args[1];
  logger.info("=== Testing Shopee Taiwan ===", { storeId, dealId });

    try {
      console.log("Starting Playwright test...");
      const result = await service.fetchWithBrowser(storeId, dealId);
      console.log("SUCCESS:", JSON.stringify(result).substring(0, 1000));
      logger.info("SUCCESS", { result: JSON.stringify(result).substring(0, 500) + "..." });
    } catch (error) {
      console.error("FAILED:", (error as Error).message);
      logger.error("FAILED", { error: (error as Error).message });
    }
}

main().catch(console.error);
