export class ScraperError extends Error {
  public readonly statusCode: number;
  public readonly isRetryable: boolean;

  constructor(message: string, statusCode: number = 500, isRetryable: boolean = true) {
    super(message);
    this.name = "ScraperError";
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, ScraperError.prototype);
  }
}
