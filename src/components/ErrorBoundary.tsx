"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Catches render errors in children so a failing tab/component cannot crash
 * the whole Admin Panel (or page). Shows a graceful fallback instead.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] caught:", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-overlay border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm font-bold text-amber-800">This section failed to load.</p>
            <p className="text-sm text-amber-600 mt-1 break-all">{this.state.message}</p>
            <Button variant="unstyled"
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="mt-3 rounded-control bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Try again
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
