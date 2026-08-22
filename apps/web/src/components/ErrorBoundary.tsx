import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  onError?: () => void;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Render-level guard: any uncaught rendering exception in the child tree falls
 * back to the provided fallback instead of leaving a blank screen. The error is
 * still available in the console for debugging.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError();
    } else {
      console.error("Uncaught render error", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
