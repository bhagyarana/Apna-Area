/**
 * Feature: Cloud Logging Structured JSON Logger
 * Purpose: Writes single-line JSON log entries to stdout with automatic redaction of transcripts, audio, images, and API keys.
 * Inputs: Log severity, event name, optional requestId/durationMs, and arbitrary metadata.
 * Outputs: Sanitised JSON line written to process.stdout (or custom sink in unit tests).
 * Deliberately excludes: console.log calls, Node-only built-ins in browser bundles, or retention of raw user voice transcripts.
 */

export type LogSeverity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

/**
 * Computes a fast, deterministic 16-character hex fingerprint (dual 32-bit FNV-1a) in both Node and browser runtimes.
 *
 * @param text - Input text to fingerprint.
 * @returns 16-character lowercase hexadecimal digest.
 */
function fingerprintHex16(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code ^ (i & 0xff);
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${p1}${p2}`;
}

export interface LogEntry {
  severity: LogSeverity;
  event: string;
  timestamp: string;
  requestId?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface GeminiCallLogInput {
  requestId?: string;
  model: string;
  config?: Record<string, unknown>;
  prompt: string;
  output?: string;
  durationMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

const REDACTED_KEYS = new Set([
  "transcript",
  "audio",
  "audiowavbase64",
  "inlinedata",
  "apikey",
  "x-goog-api-key",
  "authorization",
  "token",
  "geminiapikey",
  "mapsserverkey",
  "mapsbrowserkey",
]);

const API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}/g;

/**
 * Recursively sanitises an object or primitive, redacting sensitive keys and Google API key strings.
 *
 * @param value - Arbitrary metadata value to sanitise.
 * @param depth - Current recursion depth guard.
 * @returns Safe, JSON-serialisable copy with secrets, audio, and transcripts stripped.
 */
export function sanitiseLogValue(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return "[MAX_DEPTH]";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return value.replace(API_KEY_PATTERN, "[REDACTED_KEY]");
  }
  if (typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitiseLogValue(item, depth + 1));
  }
  const record = value as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else {
      cleaned[key] = sanitiseLogValue(raw, depth + 1);
    }
  }
  return cleaned;
}

export type LogSink = (line: string) => void;

const defaultStdoutSink: LogSink = (line: string) => {
  if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
    process.stdout.write(`${line}\n`);
  }
};

/**
 * Creates a structured logger bound to an output sink (defaults to process.stdout).
 *
 * @param sink - Line writer function, injectable for deterministic unit testing.
 * @returns Structured logger with info, warn, error, debug, and logGeminiCall helpers.
 */
export function createLogger(sink: LogSink = defaultStdoutSink) {
  function emit(
    severity: LogSeverity,
    event: string,
    options?: {
      requestId?: string;
      durationMs?: number;
      meta?: Record<string, unknown>;
    },
  ): void {
    const entry: LogEntry = {
      severity,
      event,
      timestamp: new Date().toISOString(),
    };
    if (options?.requestId !== undefined) {
      entry.requestId = options.requestId;
    }
    if (options?.durationMs !== undefined) {
      entry.durationMs = Math.round(options.durationMs);
    }
    if (options?.meta !== undefined) {
      entry.meta = sanitiseLogValue(options.meta) as Record<string, unknown>;
    }
    sink(JSON.stringify(entry));
  }

  return {
    debug: (event: string, options?: { requestId?: string; durationMs?: number; meta?: Record<string, unknown> }) =>
      emit("DEBUG", event, options),
    info: (event: string, options?: { requestId?: string; durationMs?: number; meta?: Record<string, unknown> }) =>
      emit("INFO", event, options),
    warn: (event: string, options?: { requestId?: string; durationMs?: number; meta?: Record<string, unknown> }) =>
      emit("WARNING", event, options),
    error: (event: string, options?: { requestId?: string; durationMs?: number; meta?: Record<string, unknown> }) =>
      emit("ERROR", event, options),
    /**
     * Logs a Gemini SDK call with SHA-256 prompt hash, truncated prompt/output previews, token counts, and latency.
     */
    logGeminiCall: (input: GeminiCallLogInput) => {
      const safePrompt = sanitiseLogValue(input.prompt) as string;
      const promptHash = fingerprintHex16(safePrompt);
      const safeOutput =
        input.output !== undefined ? (sanitiseLogValue(input.output) as string).slice(0, 2_000) : undefined;
      emit("INFO", "gemini.call", {
        requestId: input.requestId,
        durationMs: input.durationMs,
        meta: {
          model: input.model,
          config: input.config ?? {},
          promptHash,
          promptPreview: safePrompt.slice(0, 500),
          outputPreview: safeOutput,
          usage: input.usage ?? {},
        },
      });
    },
  };
}

/** Default singleton structured logger for server modules. */
export const logger = createLogger();
