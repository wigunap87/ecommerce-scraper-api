#!/usr/bin/env node

/**
 * Test proxy connection dan Shopee access
 * Cara pakai:
 *   npx ts-node scripts/test-proxy.ts
 *
 * Script ini akan test:
 * 1. Proxy bisa connect ke internet (check IP)
 * 2. Proxy bisa akses Shopee page
 * 3. Proxy bisa akses Shopee API
 */

import * as dotenv from "dotenv";

dotenv.config();

async function testProxy(proxy: string, label: string) {
  const axios = (await import("axios")).default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { HttpsProxyAgent } = require("https-proxy-agent");

  console.log(`\n🧪 Testing ${label}: ${proxy.replace(/:\/\/.*@/, "://***@")}`);

  // Test 1: Check IP
  try {
    const agent = new HttpsProxyAgent(proxy);
    const ipResponse = await axios.get("https://httpbin.org/ip", {
      httpsAgent: agent,
      timeout: 15000,
    });
    console.log(`   ✅ IP Check: ${JSON.stringify(ipResponse.data)}`);
  } catch (error) {
    console.log(`   ❌ IP Check failed:`, (error as Error).message);
    return false;
  }

  // Test 2: Check Shopee page
  try {
    const agent = new HttpsProxyAgent(proxy);
    const shopeeResponse = await axios.get("https://shopee.tw", {
      httpsAgent: agent,
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
      },
    });
    console.log(`   ✅ Shopee Page: Status ${shopeeResponse.status}`);
  } catch (error) {
    console.log(`   ❌ Shopee Page failed:`, (error as Error).message);
    return false;
  }

  // Test 3: Check Shopee API
  try {
    const agent = new HttpsProxyAgent(proxy);
    const apiResponse = await axios.get(
      "https://shopee.tw/api/v4/pdp/get_pc?shopid=178926468&itemid=21448123549",
      {
        httpsAgent: agent,
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "x-api-source": "pc",
          "x-requested-with": "XMLHttpRequest",
          "x-shopee-language": "zh-Hant",
        },
      }
    );
    console.log(`   ✅ Shopee API: Status ${apiResponse.status}`);
    if (apiResponse.data && typeof apiResponse.data === "object") {
      const data = apiResponse.data as Record<string, unknown>;
      if (data.error === 0 || data.error === null) {
        console.log(`   🎉 SUCCESS! Data received`);
      } else {
        console.log(`   ⚠️ API returned error: ${data.error} - ${data.error_msg}`);
      }
    }
    return true;
  } catch (error) {
    const err = error as any;
    if (err.response?.status === 403) {
      console.log(`   ❌ Shopee API blocked (403)`);
    } else {
      console.log(`   ❌ Shopee API failed:`, err.message);
    }
    return false;
  }
}

async function main() {
  const proxyList = process.env.PROXY_LIST;

  if (!proxyList) {
    console.error("❌ PROXY_LIST tidak ditemukan di .env!");
    console.log("💡 Tambahkan ke .env:");
    console.log('   PROXY_LIST=http://user:pass@host:port');
    process.exit(1);
  }

  const proxies = proxyList.split(",").map((p) => p.trim()).filter(Boolean);
  console.log(`🔍 Testing ${proxies.length} proxy...`);

  let successCount = 0;
  for (let i = 0; i < proxies.length; i++) {
    const success = await testProxy(proxies[i], `Proxy ${i + 1}/${proxies.length}`);
    if (success) successCount++;
  }

  console.log(`\n📊 Results: ${successCount}/${proxies.length} proxy berhasil`);

  if (successCount === 0) {
    console.log("\n💡 Saran:");
    console.log("   1. Kalau pakai proxy gratis: mereka sering mati, coba refresh");
    console.log("   2. Kalau pakai proxy berbayar: cek credentials di dashboard provider");
    console.log("   3. Coba ganti region/country di dashboard proxy provider");
    process.exit(1);
  }
}

main();
