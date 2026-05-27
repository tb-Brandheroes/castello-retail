import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

const RELOAD_DELAY_MS = 3000;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  private reloadTimer: number | null = null;

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Log so Fully Kiosk remote-logs / browser devtools pick it up
    console.error("[ErrorBoundary] React crash:", error, info);
    if (this.reloadTimer == null) {
      this.reloadTimer = window.setTimeout(() => {
        window.location.reload();
      }, RELOAD_DELAY_MS);
    }
  }

  componentWillUnmount() {
    if (this.reloadTimer != null) window.clearTimeout(this.reloadTimer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            color: "#9d6a75",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.5rem",
            zIndex: 99999,
          }}
        >
          Genstarter…
        </div>
      );
    }
    return this.props.children;
  }
}
