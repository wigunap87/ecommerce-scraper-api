# Shopee Scraper API

A scalable RESTful API built with **TypeScript** and **Node.js** for scraping product data from Shopee. Implements Clean Architecture with multiple fallback strategies (Direct API, Proxy Rotation, ScraperAPI, Playwright Browser) for maximum reliability.

> **Status Update (May 2026):** Shopee Taiwan has implemented platform-wide login requirements for all product pages. Direct API scraping without authentication is no longer possible. The API infrastructure below is fully functional and will work when:
> - Shopee removes login requirements, OR
> - Valid authentication cookies are provided, OR
> - The scraper is repurposed for platforms without login walls.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step-by-Step Setup](#step-by-step-setup)
- [Running the API](#running-the-api)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Scraping Strategies](#scraping-strategies)
- [Proxy Setup](#proxy-setup)
- [Hosting with Ngrok](#hosting-with-ngrok)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | v18+ | `node --version` |
| npm | v9+ | `npm --version` |
| Git | any | `git --version` |

> **Note:** This project was tested on Node.js v26 and npm v10.

---

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd shopee-scraper-api
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages including Express, Axios, Playwright, Pino, etc.

### Step 3: Install Playwright Browser

Playwright is used as the fallback strategy (real browser automation).

```bash
npx playwright install chromium
```

This downloads a Chromium browser binary (~150MB).

### Step 4: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your preferred settings. The minimal configuration to get started:

```bash
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Scraping
CACHE_TTL_MS=300000
MAX_RETRIES=3
RETRY_DELAY_MS=2000
REQUEST_TIMEOUT_MS=15000
ENABLE_STEALTH=true

# Optional: Proxy (see Proxy Setup section)
PROXY_LIST=

# Optional: ScraperAPI (see ScraperAPI section)
SCRAPERAPI_KEY=
```

See [Environment Variables](#environment-variables) for the full list.

### Step 5: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Step 6: Run the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000`.

You should see:
```
[SERVER] Shopee Scraper API running on port 3000
[SERVER] Environment: development
[SERVER] Base URL: http://localhost:3000
```

### Step 7: Verify It's Working

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"success":true,"status":"healthy","timestamp":"2026-05-19T14:29:38.934Z"}
```

---

## Running the API

### Development Mode

```bash
npm run dev
```

Uses `nodemon` to automatically restart the server when source files change. Best for active development.

### Production Mode

```bash
npm run build
npm start
```

Builds the TypeScript project first, then runs the compiled JavaScript from `dist/`.

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running. The server handles `SIGINT` and `SIGTERM` gracefully, completing any ongoing requests before shutting down.

---

## API Endpoints

### 1. Health Check

```bash
GET /health
```

**Purpose:** Verify the API is running.

**Example:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-19T12:00:00.000Z"
}
```

### 2. Get Product Details

```bash
GET /shopee?storeId={storeId}&dealId={dealId}
```

**Purpose:** Fetch product details from Shopee.

**Query Parameters:**

| Parameter | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| storeId   | string | Yes      | Shopee shop ID       |
| dealId    | string | Yes      | Shopee item/deal ID  |

**Extracting IDs from Shopee URL:**

Shopee product URLs follow this format:
```
https://shopee.tw/a-i.{storeId}.{dealId}
```

Example: `https://shopee.tw/a-i.178926468.21448123549`
- `storeId` = `178926468`
- `dealId` = `21448123549`

**Example Request:**
```bash
curl "http://localhost:3000/shopee?storeId=178926468&dealId=21448123549"
```

**Example Success Response:**
```json
{
  "bff_meta": null,
  "data": {
    "item": {
      "itemid": 21448123549,
      "shopid": 178926468,
      "name": "Product Name",
      "price": 299000,
      "price_min": 299000,
      "price_max": 299000,
      "currency": "TWD",
      "stock": 150,
      "sold": 1200,
      "item_rating": {
        "rating_star": 4.8,
        "rating_count": [0, 0, 0, 0, 150]
      }
    },
    "product_images": { ... },
    "product_price": { ... },
    "shop_detailed": { ... },
    "product_review": { ... }
  },
  "error": null,
  "error_msg": null
}
```

**Error Response (Item Not Found / Login Required):**
```json
{
  "bff_meta": null,
  "data": null,
  "error": 90309999,
  "error_msg": null
}
```

**Validation Error (Missing Parameter):**
```bash
curl "http://localhost:3000/shopee?storeId=123"
```
```json
{"success":false,"error":"Missing or invalid 'dealId' parameter"}
```

---

## Testing

### Test Scripts

The `scripts/` folder contains utility scripts for testing different scraping strategies:

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-scraperapi.ts` | Test ScraperAPI integration | `SCRAPERAPI_KEY=xxx npx ts-node scripts/test-scraperapi.ts [storeId] [dealId]` |
| `test-direct-api.ts` | Test direct API call with headers | `npx ts-node scripts/test-direct-api.ts` |
| `test-proxy.ts` | Test proxy connection | `npx ts-node scripts/test-proxy.ts` |
| `test-playwright-stealth.ts` | Test Playwright browser fallback | `npx ts-node scripts/test-playwright-stealth.ts [storeId] [dealId]` |

**Example:**
```bash
# Test Playwright fallback for a specific product
npx ts-node scripts/test-playwright-stealth.ts 178926468 21448123549

# Test proxy connection
npx ts-node scripts/test-proxy.ts
```

### Quick API Test

```bash
# Health check
curl http://localhost:3000/health

# Get product
curl "http://localhost:3000/shopee?storeId=178926468&dealId=21448123549"

# Pretty-print JSON response
curl -s "http://localhost:3000/shopee?storeId=178926468&dealId=21448123549" | jq .
```

> **Note:** `jq` is a JSON formatter. Install with `brew install jq` (macOS) or `apt-get install jq` (Linux).

---

## Project Structure

```
shopee-scraper-api/
├── .env                          # Environment variables (not committed)
├── .env.example                  # Example environment variables
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # This file
│
├── scripts/                      # Utility test scripts
│   ├── test-scraperapi.ts        # Test ScraperAPI integration
│   ├── test-direct-api.ts        # Test direct API call
│   ├── test-proxy.ts             # Test proxy connection
│   └── test-playwright-stealth.ts # Test Playwright browser fallback
│
├── dist/                         # Compiled JavaScript (generated by tsc)
│
└── src/                          # Source code (TypeScript)
    ├── index.ts                  # Entry point - starts Express server
    │
    ├── config/                   # Configuration
    │   ├── environment.ts        # Env var loader & validator
    │   ├── constants.ts          # API paths & default headers
    │   └── userAgents.ts         # Rotating User-Agent pool
    │
    ├── domain/                   # Domain layer (Clean Architecture)
    │   ├── entities/
    │   │   └── Product.ts        # Product entity & types
    │   ├── interfaces/
    │   │   ├── IScraperService.ts   # Scraper contract
    │   │   ├── ICacheService.ts     # Cache contract
    │   │   ├── IProxyService.ts     # Proxy contract
    │   │   └── ILogger.ts           # Logger contract
    │   └── errors/
    │       ├── ScraperError.ts      # Scraping-specific errors
    │       └── ValidationError.ts   # Input validation errors
    │
    ├── application/              # Application layer (business logic)
    │   ├── dto/
    │   │   ├── ProductRequestDto.ts    # Input DTO validation
    │   │   └── ProductResponseDto.ts   # Output DTO
    │   └── useCases/
    │       └── GetProductUseCase.ts    # Main business logic
    │
    ├── infrastructure/           # Infrastructure layer
    │   ├── http/
    │   │   ├── ShopeeHttpClient.ts       # Axios client with stealth
    │   │   └── headers/
    │   │       └── StealthHeaders.ts     # Header generator
    │   ├── services/
    │   │   ├── ScraperService.ts         # Orchestrates all strategies
    │   │   ├── ScraperApiService.ts      # ScraperAPI integration
    │   │   ├── PlaywrightFallbackService.ts  # Browser automation fallback
    │   │   ├── CacheService.ts           # In-memory cache
    │   │   ├── ProxyService.ts           # Proxy rotation
    │   │   └── Logger.ts                 # Pino structured logger
    │   └── utils/
    │       ├── RetryUtil.ts              # Retry with exponential backoff
    │       └── DelayUtil.ts              # Random delays
    │
    └── interface/                # Interface layer (HTTP)
        ├── middleware/
        │   ├── errorHandler.ts       # Global error handler
        │   ├── rateLimiter.ts        # Express rate limiter
        │   └── requestValidator.ts   # Query param validator
        ├── controllers/
        │   └── ProductController.ts  # HTTP controller
        ├── routes/
        │   └── productRoutes.ts      # Route definitions
        └── server.ts                 # Express app factory
```

---

## Environment Variables

All configuration is managed through environment variables in `.env`.

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `LOG_LEVEL` | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |

### Scraping Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL_MS` | `300000` | Cache time-to-live in milliseconds (5 min) |
| `MAX_RETRIES` | `3` | Max retry attempts per request |
| `RETRY_DELAY_MS` | `2000` | Base retry delay in milliseconds |
| `REQUEST_TIMEOUT_MS` | `15000` | Axios request timeout in milliseconds |
| `SESSION_ROTATE_INTERVAL_MS` | `300000` | Session rotation interval (5 min) |
| `ENABLE_STEALTH` | `true` | Enable anti-detection features |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window per IP |

### Shopee Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SHOPEE_BASE_URL` | `https://shopee.tw` | Shopee base URL |

### Proxy Configuration (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_LIST` | *(empty)* | Comma-separated proxy URLs |

**Format:** `http://user:pass@host:port,http://user:pass@host:port`

**Example providers:**
- Decodo (Smartproxy): `http://user:pass@gate.decodo.com:10001`
- Bright Data: `http://brd-customer-xxx:pass@brd.superproxy.io:22225`
- Oxylabs: `http://user:pass@pr.oxylabs.io:7777`

### ScraperAPI Configuration (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `SCRAPERAPI_KEY` | *(empty)* | ScraperAPI API key |
| `SCRAPERAPI_COUNTRY_CODE` | `tw` | Target country code for geo-targeting |
| `SCRAPERAPI_PREMIUM` | `true` | Use premium (residential) proxies |
| `SCRAPERAPI_ULTRA_PREMIUM` | `false` | Use ultra premium proxies (30 credits/call) |
| `SCRAPERAPI_RENDER` | `false` | Enable JS rendering (slower, more expensive) |

> **Note:** ScraperAPI requires a paid plan with Ultra Premium for Shopee Taiwan. Free trial does not work.

---

## Scraping Strategies

The API uses a cascading fallback system. It tries strategies in order until one succeeds:

```
┌─────────────────────────────────────────────────────────┐
│  Strategy 0: ScraperAPI (optional, if SCRAPERAPI_KEY set)│
│  → Automatic proxy rotation + CAPTCHA solving            │
│  → Fails? Continue to Strategy 1                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Strategy 1: Direct API (get_pc)                          │
│  → Call Shopee internal API with stealth headers          │
│  → Uses proxy if PROXY_LIST configured                    │
│  → Fails? Continue to Strategy 2                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Strategy 2: Direct API (get_rw)                          │
│  → Alternative Shopee API endpoint                        │
│  → Uses proxy if PROXY_LIST configured                    │
│  → Fails? Continue to Strategy 3                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Strategy 3: Playwright Browser Fallback                  │
│  → Real Chromium browser navigates product page           │
│  → Intercepts Shopee API response in browser network      │
│  → Most reliable, but slower (~20-35s)                    │
└─────────────────────────────────────────────────────────┘
```

### Strategy Selection Flow

1. If `SCRAPERAPI_KEY` is configured → Try Strategy 0 first
2. If Strategy 0 fails (or not configured) → Try Strategy 1
3. If Strategy 1 fails → Try Strategy 2
4. If Strategy 2 fails → Try Strategy 3 (Playwright)
5. If all fail → Return error response

---

## Proxy Setup

### Why Use Proxies?

Shopee implements anti-bot detection that blocks:
- Datacenter IPs (AWS, DigitalOcean, etc.)
- Repeated requests from the same IP
- Requests without proper browser headers

A rotating residential proxy provides:
- Fresh IP for every request
- IPs from real ISP (looks like home user)
- Geo-targeting (e.g., Taiwan IPs for Shopee Taiwan)

### Recommended Providers

| Provider | Free Trial | Taiwan IPs | Notes |
|----------|-----------|------------|-------|
| **Decodo (Smartproxy)** | $10 credit | Yes | Used in this project, good success rate |
| **Bright Data** | Yes | Yes | Premium, expensive but reliable |
| **Oxylabs** | Yes | Yes | Good for e-commerce |
| **Webshare** | 10 free | Limited | Budget option |

### Configuration

1. Sign up with a provider and get your proxy credentials
2. Add to `.env`:
   ```bash
   PROXY_LIST=http://user:pass@gate.decodo.com:10001
   ```
3. Restart the server
4. Test:
   ```bash
   npx ts-node scripts/test-proxy.ts
   ```

### Multiple Proxies

For proxy rotation, add multiple proxies:
```bash
PROXY_LIST=http://user1:pass1@proxy1:8080,http://user2:pass2@proxy2:8080,http://user3:pass3@proxy3:8080
```

The system will:
- Rotate through proxies round-robin
- Mark failed proxies as temporarily unavailable
- Retry with the next proxy automatically

---

## Hosting with Ngrok

To make your local API accessible publicly (for testing by clients):

### 1. Install Ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Authenticate

```bash
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```

Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken

### 3. Start Your API

```bash
npm start
```

### 4. Start Ngrok Tunnel

In a new terminal:
```bash
ngrok http 3000
```

### 5. Get Public URL

Ngrok will display:
```
Forwarding  https://abc123-def.ngrok-free.app -> http://localhost:3000
```

**Share this HTTPS URL** with your client/tester.

### 6. Test Public URL

```bash
curl https://abc123-def.ngrok-free.app/health
curl "https://abc123-def.ngrok-free.app/shopee?storeId=178926468&dealId=21448123549"
```

> **Note:** Ngrok free tier URLs change every time you restart Ngrok. For a permanent URL, upgrade to a paid plan or use a cloud VPS.

---

## Troubleshooting

### Server won't start

**Error:** `Error: Cannot find module 'dist/index.js'`
```bash
npm run build
npm start
```

**Error:** `Error: Cannot find module 'playwright'`
```bash
npm install
npx playwright install chromium
```

### API returns `error: 90309999`

**Meaning:** Item not found or login required.

**Causes:**
- The item ID doesn't exist
- Shopee has removed the product
- **Shopee requires login** (current situation for all products)

**Solutions:**
- Verify the `storeId` and `dealId` are correct
- Try different product IDs
- If all items return 90309999, Shopee has implemented login wall

### API returns `error: 403`

**Meaning:** Anti-bot block.

**Solutions:**
- Enable `ENABLE_STEALTH=true` in `.env`
- Configure `PROXY_LIST` with rotating residential proxies
- Reduce request frequency (increase `RETRY_DELAY_MS`)
- Wait for Playwright fallback (Strategy 3)

### Playwright browser not found

```bash
npx playwright install chromium
```

### Proxy connection fails

```bash
# Test your proxy
npx ts-node scripts/test-proxy.ts
```

Common issues:
- Wrong credentials → Check with proxy provider dashboard
- Proxy dead → Try refreshing proxy list
- Wrong format → Use `http://user:pass@host:port`

### Build fails

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

If TypeScript errors persist:
```bash
rm -rf node_modules
npm install
npm run build
```

---

## Response Error Codes Reference

| Error Code | Meaning | Likely Cause |
|------------|---------|--------------|
| `0` / `null` | Success | Product data returned |
| `403` | Anti-bot block | IP blocked; enable proxy or stealth |
| `429` | Rate limited | Too many requests; slow down |
| `503` | Service unavailable | Shopee server issue; retry |
| `90309999` | Item not found / login required | Invalid ID or Shopee login wall |
| `-1` | All strategies failed | Check proxy config and item validity |

---

## License

MIT
