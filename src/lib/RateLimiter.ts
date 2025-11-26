import { RateLimiterOptions } from '../types/index.js';

export class RateLimiter {
  private requestsPerSecond: number;
  private interval: number;
  private lastRequestTime: number;
  private queue: Array<() => void>;

  constructor(options: RateLimiterOptions) {
    this.requestsPerSecond = options.requestsPerSecond;
    this.interval = 1000 / this.requestsPerSecond;
    this.lastRequestTime = 0;
    this.queue = [];
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();

    try {
      return await fn();
    } finally {
      this.processQueue();
    }
  }

  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const timeToWait = Math.max(0, this.interval - timeSinceLastRequest);

      if (timeToWait === 0) {
        this.lastRequestTime = now;
        resolve();
      } else {
        setTimeout(() => {
          this.lastRequestTime = Date.now();
          resolve();
        }, timeToWait);
      }
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  getRate(): number {
    return this.requestsPerSecond;
  }

  setRate(requestsPerSecond: number): void {
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
  }
}

export function createRateLimiter(requestsPerSecond: number): RateLimiter {
  return new RateLimiter({ requestsPerSecond });
}
