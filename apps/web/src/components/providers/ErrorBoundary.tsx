/**
 * APTLY — Error Boundary
 *
 * React error boundary for catching render errors.
 * Shows ErrorState instead of a blank/broken page.
 */

"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to observability in production (Phase 1+: Sentry/Datadog)
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorState
            title="Something went wrong"
            message="An unexpected error occurred. Please try again."
            onRetry={this.handleReset}
          />
        )
      );
    }
    return this.props.children;
  }
}
