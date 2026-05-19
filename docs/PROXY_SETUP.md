# Proxy Setup Guide

## ⚠️ Catatan Penting

Proxy **datacenter** (termasuk Webshare.io free tier) sering **tidak cukup** untuk scraping Shopee karena Shopee memiliki anti-bot yang sangat ketat dan bisa mendeteksi IP datacenter.

Untuk hasil terbaik, gunakan proxy **residential** atau **ISP**.

---

## Rekomendasi Provider

### 1. Decodo (formerly Smartproxy) ⭐ RECOMMENDED

**Website:** https://decodo.com/ (dulu smartproxy.com)

**Free Trial:** 3 hari, **100MB gratis** (tidak perlu kartu kredit untuk trial)

**Langkah Setup:**
1. Daftar di https://decodo.com/
2. Pilih **"Start free trial"** atau **"Start for free"**
3. Verifikasi email
4. Masuk ke dashboard
5. Pilih **"Residential Proxies"**
6. Pilih **"Proxy Setup"**
7. Copy credentials Anda:
   ```
   Username: <your_username>
   Password: <your_password>
   Endpoint: gate.smartproxy.com
   Port: 7000 (rotating)
   ```

**Format .env:**
```env
# Rotating (IP berubah tiap request)
PROXY_LIST=http://username:password@gate.smartproxy.com:7000

# Sticky session (IP sama 1-10 menit)
PROXY_LIST=http://username:password@gate.smartproxy.com:7000?session=12345
```

**Kelebihan:**
- 115M+ residential IPs di 195+ lokasi
- 99.86% success rate
- 99.99% uptime
- Support HTTP(S) & SOCKS5
- Free trial 3 hari (100MB)
- Harga mulai $2/GB

**Setup Khusus untuk Shopee:**
```env
# Untuk shopee.tw - target Taiwan
PROXY_LIST=http://username:password@gate.smartproxy.com:7000?country=TW

# Untuk shopee.co.id - target Indonesia
PROXY_LIST=http://username:password@gate.smartproxy.com:7000?country=ID
```

---

### 2. Bright Data (Residential Proxy)

**Website:** https://brightdata.com/

**Free Trial:** 3 hari, $5 credit gratis

**Langkah Setup:**
1. Daftar di https://brightdata.com/ (bisa pakai email)
2. Pilih **"Start free trial"**
3. Pilih **"Proxy Networks"** → **"Residential"**
4. Setelah approve, masuk ke dashboard
5. Buat **zone** baru (nama: `shopee_scraper`)
6. Pilih:
   - Network type: Residential
   - IP type: Rotating
   - Country: Taiwan (untuk shopee.tw) atau Indonesia (untuk shopee.co.id)
7. Copy proxy URL yang muncul, formatnya:
   ```
   http://brd-customer-<ID>-zone-<ZONE>:<PASSWORD>@brd.superproxy.io:22225
   ```

**Format .env:**
```env
PROXY_LIST=http://brd-customer-xxx-zone-shopee_scraper:password@brd.superproxy.io:22225
```

**Kelebihan:**
- IP residential asli (berasal dari ISP rumahan)
- Sangat sulit terdeteksi sebagai bot
- Rotating otomatis tiap request
- Support Geo-targeting (pilih negara)

---

### 3. Oxylabs (Residential Proxy)

**Website:** https://oxylabs.io/

**Free Trial:** 7 hari

**Langkah Setup:**
1. Daftar di https://oxylabs.io/free-trial
2. Pilih **"Residential Proxies"**
3. Setelah approve, masuk ke dashboard
4. Go to **"Proxy Setup"**
5. Copy credentials:
   ```
   Username: <your_username>
   Password: <your_password>
   Host: pr.oxylabs.io
   Port: 7777
   ```

**Format .env:**
```env
PROXY_LIST=http://username:password@pr.oxylabs.io:7777
```

**Kelebihan:**
- 102M+ residential IPs
- Free trial lebih lama (7 hari)
- Support Socks5 juga

---

### 4. Webshare.io (Datacenter Proxy - Free Tier)

**Website:** https://www.webshare.io/

**Free Plan:**
- 10 proxy gratis
- 1 GB bandwidth/bulan
- **Tidak perlu kartu kredit**

**⚠️ Keterbatasan:**
- Proxy **datacenter**, bukan residential
- Shopee bisa mendeteksi dan memblokir IP datacenter
- **Tidak direkomendasikan untuk production**, tapi bisa dicoba untuk testing

**Langkah Setup:**
1. Daftar di https://www.webshare.io/ (email saja)
2. Dashboard → Proxy List
3. Copy proxy, format: `http://proxy-user:password@proxy.webshare.io:80`
4. Update `.env`

**Format .env:**
```env
PROXY_LIST=http://proxy-user:password@proxy.webshare.io:80
```

**Status Testing:**
- ❌ Masih kena 403 dari Shopee Taiwan
- ❌ Pre-warm tidak berhasil mendapatkan CSRF token
- Kesimpulan: Perlu proxy residential atau perbaikan Playwright approach

---

## Format .env untuk Proxy Berbayar

### Single Proxy (Rotating)
```env
PROXY_LIST=http://username:password@host:port
```

### Multiple Proxies (Static IPs)
```env
PROXY_LIST=http://user:pass@ip1:port,http://user:pass@ip2:port,http://user:pass@ip3:port
```

### Contoh Lengkap .env
```env
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Scraping Configuration
CACHE_TTL_MS=300000
MAX_RETRIES=1
RETRY_DELAY_MS=2000
REQUEST_TIMEOUT_MS=15000
SESSION_ROTATE_INTERVAL_MS=300000
ENABLE_STEALTH=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Shopee
SHOPEE_BASE_URL=https://shopee.tw

# Proxy Berbayar (Decodo/Smartproxy Example)
# Format: http://user:pass@host:port
PROXY_LIST=http://username:password@gate.smartproxy.com:7000

# Untuk target negara tertentu (opsional):
# Taiwan: PROXY_LIST=http://username:password@gate.smartproxy.com:7000?country=TW
# Indonesia: PROXY_LIST=http://username:password@gate.smartproxy.com:7000?country=ID
```

---

## Cara Test Proxy

Setelah setup proxy di `.env`, jalankan:

```bash
# Test proxy + scraping
npm run dev

# Di terminal lain
curl "http://localhost:3000/shopee?storeId=178926468&dealId=21448123549"
```

Atau test proxy dulu sebelum scraping:

```bash
# Test proxy connection
npx ts-node scripts/test-proxy.ts

# Test proxy with Decodo/Smartproxy
npx ts-node scripts/test-smartproxy.ts
```

---

## Troubleshooting

### Proxy tidak dipakai
- Pastikan `MAX_RETRIES=1` di `.env`
- Restart server setelah ganti `.env`
- Cek log ada tulisan "via proxy" atau "direct connection"

### Masih kena 403
- Coba ganti country di dashboard proxy provider
  - Untuk shopee.tw → pilih Taiwan atau Singapore
  - Untuk shopee.co.id → pilih Indonesia
- Aktifkan session sticky (keep same IP) kalau perlu cookies
- Naikkan timeout: `REQUEST_TIMEOUT_MS=30000`

### Request timeout
- Proxy residential bisa lambat, naikkan timeout
- Coba pakai proxy yang lebih dekat geografis dengan target

### Error "unable to get local issuer certificate"
- Ini terjadi dengan beberapa proxy provider
- Coba gunakan Playwright approach (browser automation) bukan direct API
- Atau update CA certificates sistem Anda

---

## Perbandingan Provider

| Provider | Free Trial | IP Pool | Avg Speed | Shopee Success |
|----------|-----------|---------|-----------|----------------|
| Decodo (Smartproxy) | 3 hari / 100MB | 115M+ | Fast | ⭐⭐⭐⭐⭐ |
| Bright Data | 3 hari / $5 | 72M+ | Fast | ⭐⭐⭐⭐⭐ |
| Oxylabs | 7 hari | 102M+ | Fast | ⭐⭐⭐⭐⭐ |

**Rekomendasi:** Mulai dari Decodo (Smartproxy) karena:
- Free trial tidak perlu kartu kredit
- 100MB cukup untuk testing
- Harga paling terjangkau ($2/GB)
- Setup paling mudah

---

## Langkah Cepat (Quick Start)

1. **Daftar Decodo (Smartproxy):**
   ```
   https://decodo.com/
   ```

2. **Verifikasi email dan ambil credentials**

3. **Update .env:**
   ```env
   PROXY_LIST=http://your_username:your_password@gate.smartproxy.com:7000
   ```

4. **Restart server:**
   ```bash
   npm run dev
   ```

5. **Test:**
   ```bash
   curl "http://localhost:3000/shopee?storeId=178926468&dealId=21448123549"
   ```
