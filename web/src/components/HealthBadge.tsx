/**
 * Feature: Live Server Health Status Badge
 * Purpose: Polls GET /api/health once on load, displays an accessible status dot, and reveals live commit metadata on hover, focus, or tap.
 * Inputs: None (reads /api/health relative to same origin).
 * Outputs: Accessible button + build metadata popover with data-testid="health-dot".
 * Deliberately excludes: Continuous background polling loops that waste server requests.
 */
import { useEffect, useState, type JSX, type KeyboardEvent } from "react";
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
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checkNonce, setCheckNonce] = useState(0);

  useEffect(() => {
    let unmounted = false;
    let timedOut = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUTS_MS.healthCheck);

    fetch("/api/health", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("bad_status");
        }
        const json = (await res.json()) as { ok?: boolean; data?: unknown };
        const parsed = HealthDataSchema.safeParse(json.data);
        if (!json.ok || !parsed.success) {
          throw new Error("invalid_schema");
        }
        if (!unmounted) {
          setHealth({ status: "ok", data: parsed.data, errorMessage: null });
        }
      })
      .catch(() => {
        if (unmounted) {
          return;
        }
        setHealth({
          status: "error",
          data: null,
          errorMessage: timedOut
            ? "Server health check timed out, so tap Recheck."
            : "Could not reach the Apna Area server, so tap Recheck.",
        });
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      unmounted = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checkNonce]);

  const open = !dismissed && (hovered || focused || pinned);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      setPinned(false);
      setDismissed(true);
    }
  };

  const label =
    health.status === "ok"
      ? "Live"
      : health.status === "loading"
        ? "Checking"
        : "Offline";

  return (
    <div
      className="health-wrapper"
      onMouseEnter={() => {
        setDismissed(false);
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="health-pill"
        aria-expanded={open}
        aria-label={`Server status: ${health.status}`}
        onFocus={() => {
          setDismissed(false);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onClick={() => {
          setDismissed(false);
          setPinned((prev) => !prev);
        }}
      >
        <span
          className="health-dot"
          data-testid="health-dot"
          data-status={health.status}
          aria-hidden="true"
        />
        <span className="health-label">{label}</span>
      </button>

      {open && (
        <div className="health-popover" role="status">
          {health.status === "ok" && health.data ? (
            <>
              <strong>Service healthy</strong>
              <span>Places verified: {health.data.upstreams.placesLoaded}</span>
              <span>Commit: {health.data.commit}</span>
              <span>Built: {health.data.builtAt}</span>
            </>
          ) : health.status === "loading" ? (
            <span>Checking Outer Ring Road server health.</span>
          ) : (
            <>
              <span>{health.errorMessage ?? "Could not reach the server, so tap Recheck."}</span>
              <button
                type="button"
                className="change-office-btn"
                onClick={() => {
                  setHealth({ status: "loading", data: null, errorMessage: null });
                  setCheckNonce((n) => n + 1);
                }}
              >
                Recheck
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
