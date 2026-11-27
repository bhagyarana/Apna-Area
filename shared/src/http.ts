/**
 * Feature: Isomorphic Timeout & Jittered Retry Fetch Helper
 * Purpose: Wraps standard fetch with an AbortController timeout and a single jittered backoff retry on HTTP 429 or 503.
 * Inputs: Request URL, standard RequestInit options, and timeoutMs from shared/config.ts.
 * Outputs: Resolved HTTP Response object.
 * Deliberately excludes: Retrying non-idempotent client 4xx errors other than 429.
 */
import { TIMEOUTS_MS } from "./config.js";

export interface RetryFetchOptions extends RequestInit {
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Executes an HTTP fetch with a hard timeout and one jittered backoff retry on 429 or 503 responses.
 *
 * @param url - Request URL string.
 * @param options - Fetch init options plus optional timeoutMs override.
 * @returns Resolved HTTP Response.
 * @throws Error when aborted by caller, timed out, or network transport fails after retry.
 */
export async function fetchWithRetry(
  url: string,
  options: RetryFetchOptions = {},
): Promise<Response> {
  const { timeoutMs = TIMEOUTS_MS.routesMatrix, signal: externalSignal, ...init } = options;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if ((response.status === 429 || response.status === 503) && attempt === 0) {
        const jitter = Math.floor(Math.random() * TIMEOUTS_MS.retryMaxJitter);
        await sleep(TIMEOUTS_MS.retryBaseBackoff + jitter);
        continue;
      }
      return response;
    } catch (err: unknown) {
      if (externalSignal?.aborted || attempt === 1) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * TIMEOUTS_MS.retryMaxJitter);
      await sleep(TIMEOUTS_MS.retryBaseBackoff + jitter);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }

  throw new Error("Exhausted fetch retry attempts.");
}
