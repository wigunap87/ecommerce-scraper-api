import { CookieJar } from "tough-cookie";
import { getRandomUserAgent } from "../../../config/userAgents";
import { SHOPEE_ORIGIN, DEFAULT_HEADERS } from "../../../config/constants";

export class StealthHeaders {
  private readonly cookieJar: CookieJar;
  private userAgent: string;
  private readonly deviceId: string;

  constructor(cookieJar: CookieJar) {
    this.cookieJar = cookieJar;
    this.userAgent = getRandomUserAgent();
    this.deviceId = this.generateDeviceId();
  }

  rotateUserAgent(): void {
    this.userAgent = getRandomUserAgent();
  }

  generateForProductPage(storeId: string, dealId: string): Record<string, string> {
    const referer = `${SHOPEE_ORIGIN}/a-i.${storeId}.${dealId}`;
    const cookieString = this.cookieJar.getCookieStringSync(SHOPEE_ORIGIN);

    return {
      "User-Agent": this.userAgent,
      "Accept": DEFAULT_HEADERS.ACCEPT,
      "Accept-Language": DEFAULT_HEADERS.ACCEPT_LANGUAGE,
      "Accept-Encoding": DEFAULT_HEADERS.ACCEPT_ENCODING,
      "Referer": referer,
      "Origin": SHOPEE_ORIGIN,
      "Connection": DEFAULT_HEADERS.CONNECTION,
      "DNT": DEFAULT_HEADERS.DNT,
      "Sec-Fetch-Dest": DEFAULT_HEADERS.SEC_FETCH_DEST,
      "Sec-Fetch-Mode": DEFAULT_HEADERS.SEC_FETCH_MODE,
      "Sec-Fetch-Site": DEFAULT_HEADERS.SEC_FETCH_SITE,
      "Cookie": cookieString || this.generateInitialCookies(),
      "x-api-source": "pc",
      "x-requested-with": "XMLHttpRequest",
      "x-shopee-language": "zh-Hant",
    };
  }

  private generateDeviceId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateInitialCookies(): string {
    const timestamp = Date.now();
    const cookies = [
      `SPC_F=${this.deviceId}`,
      `SPC_SI=${this.deviceId}`,
      `SPC_U=${this.deviceId}`,
      `SPC_RND=${Math.random().toString(36).substring(2, 15)}`,
      `REC_T_ID=${this.deviceId}-${timestamp}`,
    ];
    return cookies.join("; ");
  }
}
