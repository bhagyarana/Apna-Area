/**
 * Feature: Structured Logger Unit Tests
 * Purpose: Proves single-line Cloud Logging JSON format and strict redaction of transcripts, audio, and API keys.
 * Inputs: Synthetic log payloads containing sensitive fields and AIza key patterns.
 * Outputs: Vitest assertions against captured sink strings.
 * Deliberately excludes: Writing to real stdout during tests.
 */
import { describe, expect, it } from "vitest";
import { createLogger } from "../logger.js";

describe("shared/logger", () => {
  it("writes structured JSON lines and redacts transcripts, audio, tokens, and AIza keys", () => {
    const lines: string[] = [];
    const testLogger = createLogger((line) => lines.push(line));

    const syntheticKey = ["AIza", "SyDummyTestOnlyNotARealKey123456"].join("");
    testLogger.info("score.request", {
      requestId: "req-99",
      durationMs: 214.6,
      meta: {
        missionId: "m1",
        transcript: [{ speaker: "player", text: "private speech" }],
        input_transcript: "snake case transcript",
        ephemeral_token: "tok-123",
        api_key: "secret-val",
        audio: "AAAA_BASE64",
        leak: `Key is ${syntheticKey}`,
      },
    });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(parsed.severity).toBe("INFO");
    expect(parsed.event).toBe("score.request");
    expect(parsed.requestId).toBe("req-99");
    expect(parsed.durationMs).toBe(215);

    const meta = parsed.meta as Record<string, unknown>;
    expect(meta.missionId).toBe("m1");
    expect(meta.transcript).toBe("[REDACTED]");
    expect(meta.input_transcript).toBe("[REDACTED]");
    expect(meta.ephemeral_token).toBe("[REDACTED]");
    expect(meta.api_key).toBe("[REDACTED]");
    expect(meta.audio).toBe("[REDACTED]");
    expect(meta.leak).toBe("Key is [REDACTED_KEY]");
  });

  it("logs Gemini calls with prompt hash and truncates prompt to 500 chars", () => {
    const lines: string[] = [];
    const testLogger = createLogger((line) => lines.push(line));
    const longPrompt = "P".repeat(750);

    testLogger.logGeminiCall({
      requestId: "req-gem-1",
      model: "gemini-4-neon",
      config: { thinking_level: "medium" },
      prompt: longPrompt,
      output: "O".repeat(2_400),
      durationMs: 4120,
      usage: { totalTokens: 640 },
    });

    const parsed = JSON.parse(lines[0] ?? "{}") as {
      meta: {
        promptHash: string;
        promptPreview: string;
        outputPreview: string;
        usage: { totalTokens: number };
      };
    };
    expect(parsed.meta.promptHash).toHaveLength(16);
    expect(parsed.meta.promptPreview).toHaveLength(500);
    expect(parsed.meta.outputPreview).toHaveLength(2_000);
    expect(parsed.meta.usage).toEqual({ totalTokens: 640 });
  });
});
