import { env } from "../../config/environment";
import { ILogger } from "../../domain/interfaces/ILogger";
import { ScraperError } from "../../domain/errors/ScraperError";

export async function withRetry<T>(
  operation: () => Promise<T>,
  logger: ILogger,
  maxRetries: number = env.MAX_RETRIES,
  baseDelayMs: number = env.RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Retry attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;

        if (error instanceof ScraperError && !(error as ScraperError).isRetryable) {
        throw error;
      }

      if (attempt === maxRetries) {
        logger.error(`All ${maxRetries} retry attempts failed`, { error: lastError.message });
        throw new ScraperError(
          `Failed after ${maxRetries} attempts: ${lastError.message}`,
          503,
          false
        );
      }

      const jitter = Math.random() * 1000;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      logger.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`, {
        error: lastError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
