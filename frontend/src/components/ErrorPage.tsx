import { Component, type ErrorInfo, type ReactNode } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";

export function ErrorPage({ notFound = false }: { notFound?: boolean }) {
  return (
    <main className="error-page">
      <a href="/" className="error-brand"><img src="/icon.png" alt="" />Dr.Writer</a>
      <div className="error-content">
        <div className="error-document" aria-hidden="true"><span /><span /><span /></div>
        <h1>{notFound ? "We couldn’t find that page." : "Something went wrong."}</h1>
        <p>{notFound ? "The page may have moved, or the link might be incorrect." : "The app couldn’t load this page. You can try again or return to the home page."}</p>
        {!notFound && <p className="error-note">Reloading may discard unsaved changes.</p>}
        <div className="error-actions">
          <a className="error-primary" href="/">Go to homepage <span aria-hidden="true">→</span></a>
          {!notFound && <button className="error-secondary" type="button" onClick={() => window.location.reload()}>Reload page</button>}
        </div>
      </div>
      <div className="error-footer">Your space for better writing.</div>
    </main>
  );
}

export function RouteError() {
  const error = useRouteError();
  return <ErrorPage notFound={isRouteErrorResponse(error) && error.status === 404} />;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Application render failed", error, info); }
  render() { return this.state.failed ? <ErrorPage /> : this.props.children; }
}
