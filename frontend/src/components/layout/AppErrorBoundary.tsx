import React from "react";
import { Card } from "../ui/Card";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
          <Card accent="orange" className="max-w-xl text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-orange">Interruption</p>
            <h1 className="mt-3 font-display text-3xl text-brand-text">
              La page doit etre relancee
            </h1>
            <p className="mt-3 text-sm text-brand-muted">
              Rechargez la page pour reprendre votre session. Si le souci persiste, revenez un peu
              plus tard.
            </p>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
