import dotenv from "dotenv";

dotenv.config();

interface Environment {
  PORT: number;
  NODE_ENV: string;
  LOG_LEVEL: string;
  CACHE_TTL_MS: number;
  MAX_RETRIES: number;
  RETRY_DELAY_MS: number;
  REQUEST_TIMEOUT_MS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  PROXY_LIST: string[];
  PROXY_LIST_RAW: string;
  SHOPEE_BASE_URL: string;
  ENABLE_STEALTH: boolean;
  SESSION_ROTATE_INTERVAL_MS: number;
  SCRAPERAPI_KEY: string;
  SCRAPERAPI_COUNTRY_CODE: string;
  SCRAPERAPI_PREMIUM: boolean;
  SCRAPERAPI_ULTRA_PREMIUM: boolean;
  SCRAPERAPI_RENDER: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value !== undefined ? value : defaultValue!;
}

function parseProxyList(proxyString?: string): string[] {
  if (!proxyString) return [];
  return proxyString.split(",").map((p) => p.trim()).filter(Boolean);
}

export const env: Environment = {
  PORT: parseInt(getEnvVar("PORT", "3000"), 10),
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  LOG_LEVEL: getEnvVar("LOG_LEVEL", "info"),
  CACHE_TTL_MS: parseInt(getEnvVar("CACHE_TTL_MS", "300000"), 10),
  MAX_RETRIES: parseInt(getEnvVar("MAX_RETRIES", "3"), 10),
  RETRY_DELAY_MS: parseInt(getEnvVar("RETRY_DELAY_MS", "2000"), 10),
  REQUEST_TIMEOUT_MS: parseInt(getEnvVar("REQUEST_TIMEOUT_MS", "15000"), 10),
  RATE_LIMIT_WINDOW_MS: parseInt(getEnvVar("RATE_LIMIT_WINDOW_MS", "60000"), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(getEnvVar("RATE_LIMIT_MAX_REQUESTS", "100"), 10),
  PROXY_LIST: parseProxyList(process.env.PROXY_LIST),
  PROXY_LIST_RAW: process.env.PROXY_LIST || "",
  SHOPEE_BASE_URL: getEnvVar("SHOPEE_BASE_URL", "https://shopee.tw"),
  ENABLE_STEALTH: getEnvVar("ENABLE_STEALTH", "true") === "true",
  SESSION_ROTATE_INTERVAL_MS: parseInt(getEnvVar("SESSION_ROTATE_INTERVAL_MS", "300000"), 10),
  SCRAPERAPI_KEY: getEnvVar("SCRAPERAPI_KEY", ""),
  SCRAPERAPI_COUNTRY_CODE: getEnvVar("SCRAPERAPI_COUNTRY_CODE", "tw"),
  SCRAPERAPI_PREMIUM: getEnvVar("SCRAPERAPI_PREMIUM", "true") === "true",
  SCRAPERAPI_ULTRA_PREMIUM: getEnvVar("SCRAPERAPI_ULTRA_PREMIUM", "false") === "true",
  SCRAPERAPI_RENDER: getEnvVar("SCRAPERAPI_RENDER", "false") === "true",
};
