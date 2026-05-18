/**
 * Request Batching & Coalescing Utility
 * 
 * Solves N+1 query problems by:
 * 1. Batching multiple symbol requests into fewer API calls
 * 2. Coalescing duplicate simultaneous requests
 * 3. Adding retry logic with exponential backoff
 */

type RequestKey = string;
type RequestConfig = {
  url: string;
  options?: RequestInit;
  retries?: number;
  backoffMs?: number;
};

interface CoalesceEntry {
  promise: Promise<Response>;
  timestamp: number;
}

interface BatchEntry {
  symbol: string;
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

class RequestBatcher {
  // Coalesce cache: same request made within window returns same promise
  private coalescedRequests = new Map<RequestKey, CoalesceEntry>();
  private coalesceTTL = 50; // ms - window for coalescing
  private coalescePruneInterval: NodeJS.Timeout | null = null;

  // Quote batching: batch multiple symbols into parallel fetches
  private quoteBatch = new Map<string, BatchEntry>();
  private quoteBatchSize = 5; // fetch 5 symbols in parallel
  private quoteBatchDelayMs = 100; // wait up to 100ms to collect symbols

  constructor() {
    this.startCoalescePruning();
  }

  /**
   * Fetch with coalescing: if same request made within 50ms, return same promise
   */
  async fetchWithCoalescing(
    url: string,
    options?: RequestInit,
    retries = 3,
    backoffMs = 100
  ): Promise<Response> {
    const key = this.buildRequestKey(url, options);
    const existing = this.coalescedRequests.get(key);

    // Return existing promise if still fresh
    if (existing && Date.now() - existing.timestamp < this.coalesceTTL) {
      return existing.promise;
    }

    // Create new request promise with retry logic
    const promise = this.fetchWithRetry(url, options, retries, backoffMs);

    this.coalescedRequests.set(key, { promise, timestamp: Date.now() });
    return promise;
  }

  /**
   * Fetch with exponential backoff retry
   */
  private async fetchWithRetry(
    url: string,
    options?: RequestInit,
    retries: number,
    backoffMs: number
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, { ...options, cache: "no-store" });

        // Retry on 502, 503, 429 (transient errors)
        if (res.status === 502 || res.status === 503 || res.status === 429) {
          if (attempt < retries) {
            const delayMs = backoffMs * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
        }

        return res;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < retries) {
          const delayMs = backoffMs * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Batch quote requests: queue symbols and fetch in groups
   * 
   * Instead of:
   *   fetch quote(AAPL) → fetch quote(TSLA) → fetch quote(NVDA) [sequential]
   * 
   * Do:
   *   Promise.all([fetch quote(AAPL), fetch quote(TSLA), fetch quote(NVDA)]) [parallel]
   */
  async queueQuoteFetch(
    symbol: string,
    fetcherFn: (sym: string) => Promise<any>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add to batch
      const timeout = setTimeout(async () => {
        // Timeout reached - process batch
        const batch = Array.from(this.quoteBatch.entries());
        this.quoteBatch.clear();

        const symbols = batch.map(([s]) => s);
        try {
          // Fetch all in parallel
          const results = await Promise.all(symbols.map((s) => fetcherFn(s)));
          batch.forEach(([, entry], i) => entry.resolve(results[i]));
        } catch (e) {
          batch.forEach(([, entry]) => entry.reject(e as Error));
        }
      }, this.quoteBatchDelayMs);

      this.quoteBatch.set(symbol, { symbol, resolve, reject, timeout });

      // If batch is full, process immediately
      if (this.quoteBatch.size >= this.quoteBatchSize) {
        clearTimeout(timeout);
        const batch = Array.from(this.quoteBatch.entries());
        this.quoteBatch.clear();

        const symbols = batch.map(([s]) => s);
        Promise.all(symbols.map((s) => fetcherFn(s))).then((results) => {
          batch.forEach(([, entry], i) => entry.resolve(results[i]));
        });
      }
    });
  }

  /**
   * Build cache key from URL and options
   */
  private buildRequestKey(url: string, options?: RequestInit): string {
    return `${url}|${JSON.stringify(options || {})}`;
  }

  /**
   * Periodically clean up stale coalesced requests
   */
  private startCoalescePruning() {
    this.coalescePruneInterval = setInterval(() => {
      const now = Date.now();
      const toPrune: RequestKey[] = [];

      this.coalescedRequests.forEach((entry, key) => {
        if (now - entry.timestamp > this.coalesceTTL * 2) {
          toPrune.push(key);
        }
      });

      toPrune.forEach((key) => this.coalescedRequests.delete(key));
    }, this.coalesceTTL * 10);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.coalescePruneInterval) {
      clearInterval(this.coalescePruneInterval);
    }
    this.quoteBatch.forEach(([, entry]) => clearTimeout(entry.timeout));
    this.quoteBatch.clear();
    this.coalescedRequests.clear();
  }

  /**
   * Get stats for monitoring
   */
  getStats() {
    return {
      coalescedRequests: this.coalescedRequests.size,
      queuedSymbols: this.quoteBatch.size,
    };
  }
}

export const requestBatcher = new RequestBatcher();
