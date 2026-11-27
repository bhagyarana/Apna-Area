/**
 * Feature: Live Server Health Status Badge
 * Purpose: Polls GET /api/health once on load, displays an accessible status dot, and reveals live commit metadata on hover or focus.
 * Inputs: None (reads /api/health relative to same origin).
 * Outputs: Accessible button + build metadata popover with data-testid="health-dot".
 * Deliberately excludes: Continuous background polling loops that waste server requests.
 */
import { useEffect, useState, type JSX } from "react";
import { HealthDataSchema, TIMEOUTS_MS, type HealthData } from "@apna-area/shared";

type ConnectionState = "loading" | "ok" | "error";

interface HealthState {
  status: ConnectionState;
  data: HealthData | null;
  errorMessage: string | null;
}

/**
 * Renders the top-right server health indicator with commit and build timestamp inspection.
 *
 * @returns Accessible status pill and metadata tooltip.
 */
export function HealthBadge(): JSX.Element {
  const [health, setHealth] = useState<HealthState>({
    status: "loading",
    data: null,
    errorMessage: null,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUTS_MS.healthCheck);

    fetch("/api/health", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        const json = (await res.json()) as { ok?: boolean; data?: unknown };
        const parsed = HealthDataSchema.safeParse(json.data);
        if (!json.ok || !parsed.success) {
          throw new Error("Health payload did not match schema");
        }
        setHealth({ status: "ok", data: parsed.data, errorMessage: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setHealth({
          status: "error",
          data: null,
          errorMessage:
            err instanceof Error
              ? err.message
              : "Could not reach the Apna Area server. Refresh to retry.",
        });
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const label =
    health.status === "ok"
      ? `LIVE · ${health.data?.commit.slice(0, 7) ?? "ready"}`
      : health.status === "loading"
        ? "CHECKING"
        : "OFFLINE";

  return (
    <div
      className="health-wrapper"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="health-pill"
        aria-expanded={open}
        aria-label={`Server status: ${health.status}`}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          className="health-dot"
          data-testid="health-dot"
          data-status={health.status}
          aria-hidden="true"
        />
        <span>{label}</span>
      </button>

      {open && (
        <div className="health-popover" role="status">
          {health.status === "ok" && health.data ? (
            <>
              <strong>Service healthy</strong>
              <span>Commit: {health.data.commit}</span>
              <span>Built: {health.data.builtAt}</span>
              <span>Version: {health.data.version}</span>
            </>
          ) : health.status === "loading" ? (
            <span>Checking Outer Ring Road server health...</span>
          ) : (
            <span>{health.errorMessage ?? "Server unreachable. Refresh to retry."}</span>
          )}
        </div>
      )}
    </div>
  );
}
