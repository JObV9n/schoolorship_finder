import logger from '../config/logger.js';
import { RetryOptions } from '../types/index.js';

export class RetryHandler {
  private retries: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(options: RetryOptions = {}) {
    this.retries = options.retries ?? 3;
    this.baseDelay = options.baseDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 10000;
  }

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const retries = options.retries ?? this.retries;
    const baseDelay = options.baseDelay ?? this.baseDelay;
    const maxDelay = options.maxDelay ?? this.maxDelay;
    const onRetry = options.onRetry;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retries) {
          logger.error(`All ${retries + 1} attempts failed`, {
            error: lastError.message,
            stack: lastError.stack,
          });
          throw lastError;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxAttempts: retries + 1,
          nextDelay: delay,
        });

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new RetryHandler();
