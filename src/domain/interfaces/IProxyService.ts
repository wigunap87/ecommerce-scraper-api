export interface IProxyService {
  getNextProxy(): string | undefined;
  markProxyFailed(proxyUrl: string): void;
  getProxyStats(): { total: number; failed: number };
}
