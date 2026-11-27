/**
 * Feature: Lazy Chunk Error Boundary & Smoked-Acrylic Suspense Fallback (web/src/components/StageSuspenseCard.tsx)
 * Purpose: Prevents blank flashes or uncaught React crashes when lazy-loading MissionDialog or SurvivalKit chunks over venue Wi-Fi.
 * Inputs: Child lazy React node, loading label, and onBack escape callback.
 * Outputs: Accessible smoked-acrylic loading/retry card bounded within the ORR map stage.
 * Deliberately excludes: Blocking full-screen overlays without a Back/Cancel action.
 */
import { Component, Suspense, type JSX, type ReactNode } from "react";
import { logger } from "@apna-area/shared";

interface StageSuspenseBoundaryProps {
  loadingLabel: string;
  onBack: () => void;
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
  retryKey: number;
}

/**
 * Wraps a lazy-loaded stage screen in both an ErrorBoundary (with 1-click Retry + Back) and a smoked-acrylic Suspense card.
 */
export class StageSuspenseBoundary extends Component<StageSuspenseBoundaryProps, BoundaryState> {
  public override state: BoundaryState = { failed: false, retryKey: 0 };

  public static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  public override componentDidCatch(error: Error): void {
    logger.error("ui.stage_chunk_failed", { meta: { error: error.message } });
  }

  private readonly handleRetry = (): void => {
    this.setState((prev) => ({ failed: false, retryKey: prev.retryKey + 1 }));
  };

  public override render(): JSX.Element {
    const { loadingLabel, onBack, children } = this.props;

    if (this.state.failed) {
      return (
        <main className="shell-main">
          <section className="picker-card picker-card-compact" role="alert" data-testid="chunk-error-card">
            <p className="picker-subtitle">
              Could not load this screen on the current connection, so tap Retry or return to the map.
            </p>
            <div className="mission-nav-row">
              <button type="button" className="mission-secondary-btn" onClick={onBack}>
                Back to map
              </button>
              <button type="button" className="primary-cta-btn mission-primary-cta" onClick={this.handleRetry}>
                Retry
              </button>
            </div>
          </section>
        </main>
      );
    }

    return (
      <Suspense
        key={this.state.retryKey}
        fallback={
          <main className="shell-main">
            <section className="picker-card picker-card-compact" aria-busy="true" data-testid="stage-loading-card">
              <p className="picker-subtitle">{loadingLabel}</p>
              <button type="button" className="change-office-btn" onClick={onBack}>
                Back to map
              </button>
            </section>
          </main>
        }
      >
        {children}
      </Suspense>
    );
  }
}
