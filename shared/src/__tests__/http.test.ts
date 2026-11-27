/**
 * Feature: Timeout, Jittered Retry & Error Normaliser Unit Tests (shared/src/__tests__/http.test.ts)
 * Purpose: Verifies fetchWithRetry retry boundaries (503/429 vs 400) and toUserErrorMessage single-sentence error formatting.
 * Inputs: Mocked global fetch responses and simulated browser/upstream Error objects.
 * Outputs: Deterministic Vitest assertions.
 * Deliberately excludes: Live external HTTP calls.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, toUserErrorMessage } from "../http.js";

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

describe("toUserErrorMessage (T6.1)", () => {
  it("maps raw browser Failed to fetch and NetworkError strings to single-sentence offline copy", () => {
    expect(
      toUserErrorMessage(
        new TypeError("Failed to fetch"),
        "Fallback message.",
        "You appear to be offline, so reconnect and tap Retry.",
      ),
    ).toBe("You appear to be offline, so reconnect and tap Retry.");

    expect(
      toUserErrorMessage(
        new Error("NetworkError when attempting to fetch resource."),
        "Fallback message.",
        "Offline custom.",
      ),
    ).toBe("Offline custom.");
  });

  it("maps AbortError and timeout messages to the plain fallback sentence", () => {
    expect(
      toUserErrorMessage(
        new Error("The operation was aborted"),
        "Could not build your Week One plan right now, so tap Retry.",
      ),
    ).toBe("Could not build your Week One plan right now, so tap Retry.");
  });

  it("preserves clean server error messages and replaces em dashes cleanly", () => {
    expect(
      toUserErrorMessage(
        new Error("Rate limit reached \u2014 wait 10 seconds before retrying."),
        "Fallback.",
      ),
    ).toBe("Rate limit reached, wait 10 seconds before retrying.");
  });
});
