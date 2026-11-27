/**
 * Feature: Timeout & Jittered Retry Fetch Unit Tests
 * Purpose: Verifies fetchWithRetry retries once on HTTP 503/429 and does not retry client 400 errors.
 * Inputs: Mocked global fetch implementation.
 * Outputs: Vitest assertions.
 * Deliberately excludes: Live external HTTP calls.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "../http.js";

describe("shared/http fetchWithRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries once on HTTP 503 and returns the second response", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("https://example.test/api", { timeoutMs: 1_000 });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("does not retry on HTTP 400", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("bad", { status: 400 }));

    const res = await fetchWithRetry("https://example.test/api", { timeoutMs: 1_000 });
    expect(res.status).toBe(400);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
