/**
 * Test script for ScraperAPI integration with Shopee Taiwan.
 *
 * Usage:
 *   SCRAPERAPI_KEY=your_key_here npx ts-node scripts/test-scraperapi.ts [storeId] [dealId]
 *
 * Make sure you have signed up for the free trial at:
 *   https://www.scraperapi.com/signup
 *
 * Free: 5,000 API calls (no credit card required).
 */

import { ScraperApiService } from "../src/infrastructure/services/ScraperApiService";
import { Logger } from "../src/infrastructure/services/Logger";

async function main() {
  const apiKey = process.env.SCRAPERAPI_KEY;

  if (!apiKey) {
    console.error("❌ SCRAPERAPI_KEY tidak ditemukan.");
    console.error("");
    console.error("📋 CARA DAPATKAN FREE TRIAL:");
    console.error("   1. Buka: https://www.scraperapi.com/signup");
    console.error("   2. Daftar pakai email (tidak perlu kartu kredit)");
    console.error("   3. Dapatkan API Key di dashboard");
    console.error("   4. Free trial: 5,000 API calls");
    console.error("");
    console.error("🚀 CARA MENJALANKAN:");
    console.error("   SCRAPERAPI_KEY=your_key npx ts-node scripts/test-scraperapi.ts");
    console.error("");
    console.error("   Atau dengan custom product ID:");
    console.error("   SCRAPERAPI_KEY=your_key npx ts-node scripts/test-scraperapi.ts 178926468 21448123549");
    process.exit(1);
  }

  const logger = new Logger();
  const service = new ScraperApiService(
    {
      apiKey,
      countryCode: "tw",
      premium: false, // Free trial doesn't include premium proxies
      ultraPremium: false,
      render: false,
    },
    logger
  );

  // Ambil storeId dan dealId dari argument CLI atau pakai default
  const storeId = process.argv[2] || "178926468";
  const dealId = process.argv[3] || "21448123549";

  console.log(`🚀 Testing ScraperAPI untuk Shopee Taiwan...`);
  console.log(`   Shop ID : ${storeId}`);
  console.log(`   Item ID : ${dealId}`);
  console.log(`   URL     : https://shopee.tw/a-i.${storeId}.${dealId}`);
  console.log("");

  const start = Date.now();

  try {
    const result = await service.fetchProduct(storeId, dealId);
    const duration = Date.now() - start;

    console.log(`✅ SUKSES! (${duration}ms)`);
    console.log("📦 Response dari ScraperAPI:\n");
    console.log(JSON.stringify(result, null, 2));

    // Summary
    const data = result as Record<string, unknown>;
    if (data.error === 0 || data.error === null) {
      console.log("\n🎉 Product data berhasil diambil!");
    } else {
      console.log(`\n⚠️ Shopee API returned error code: ${data.error}`);
      console.log(`   Message: ${data.error_msg || "N/A"}`);
    }
  } catch (error) {
    const duration = Date.now() - start;
    const message = (error as Error).message;

    console.error(`\n❌ GAGAL (${duration}ms):`, message);

    // Detect plan limitation
    if (message.includes("403")) {
      console.error("\n⚠️  ScraperAPI mengembalikan 403 Forbidden.");
      console.error("   Ini biasanya terjadi karena:");
      console.error("   1. Shopee Taiwan dianggap 'heavily protected' oleh ScraperAPI");
      console.error("   2. Free trial ScraperAPI TIDAK mencakup Premium/Ultra Premium proxies");
      console.error("   3. Untuk scrape Shopee, butuh plan berbayar dengan Ultra Premium");
      console.error("\n💡 ALTERNATIF YANG BISA DICOBA:");
      console.error("   1. SmartProxy/Decodo — free trial $10 credit, support Shopee");
      console.error("   2. Bright Data — free trial, residential proxy kuat");
      console.error("   3. Oxylabs — free trial, cocok untuk e-commerce");
      console.error("   4. Gunakan proxy list sendiri via PROXY_LIST di .env");
      console.error("\n📖 Dokumentasi ScraperAPI:");
      console.error("   https://docs.scraperapi.com/control-and-optimization/premium-residential-mobile-proxy-pools");
    }

    process.exit(1);
  }
}

main();
