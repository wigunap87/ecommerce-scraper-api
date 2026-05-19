/**
 * Try direct API call with all required headers (mimicking browser request)
 */

const https = require('https');

// Try to call Shopee API directly with proper headers
const options = {
  hostname: 'shopee.tw',
  path: '/api/v4/pdp/get_pc?item_id=21448123549&shop_id=178926468&tz_offset_in_minutes=480',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://shopee.tw/a-i.178926468.21448123549',
    'Origin': 'https://shopee.tw',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Connection': 'keep-alive',
  }
};

console.log('[TEST] Making direct API call...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('[TEST] Status:', res.statusCode);
    console.log('[TEST] Headers:', JSON.stringify(res.headers, null, 2).substring(0, 500));
    try {
      const json = JSON.parse(data);
      console.log('[TEST] Response:', JSON.stringify(json, null, 2).substring(0, 1000));
      if (json.error === 0 || json.error === null) {
        console.log('[TEST] ✅ VALID RESPONSE!');
      } else {
        console.log('[TEST] ❌ API Error:', json.error);
      }
    } catch (e) {
      console.log('[TEST] Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('[TEST] Error:', e.message);
});

req.setTimeout(15000, () => {
  console.log('[TEST] Timeout');
  req.destroy();
});

req.end();
