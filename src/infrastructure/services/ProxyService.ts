import { IProxyService } from "../../domain/interfaces/IProxyService";

export class ProxyService implements IProxyService {
  private readonly proxies: string[];
  private failedProxies = new Set<string>();
  private currentIndex = 0;

  constructor(proxyList: string[]) {
    this.proxies = [...proxyList];
  }

  getNextProxy(): string | undefined {
    if (this.proxies.length === 0) return undefined;

    const available = this.proxies.filter((p) => !this.failedProxies.has(p));
    if (available.length === 0) {
      // All proxies failed, reset and try again
      this.failedProxies.clear();
      return this.proxies[0];
    }

    const proxy = available[this.currentIndex % available.length];
    this.currentIndex++;
    return proxy;
  }

  markProxyFailed(proxyUrl: string): void {
    this.failedProxies.add(proxyUrl);
  }

  getProxyStats(): { total: number; failed: number } {
    return { total: this.proxies.length, failed: this.failedProxies.size };
  }
}
