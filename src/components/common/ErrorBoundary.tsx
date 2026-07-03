import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopyError = async () => {
    const text = [
      `Error: ${this.state.error?.message || 'Unknown'}`,
      this.state.error?.stack && `\nStack:\n${this.state.error.stack}`,
      this.state.errorInfo && `\nComponent Stack:\n${this.state.errorInfo}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '32px',
          backgroundColor: 'var(--md-sys-color-surface)',
          color: 'var(--md-sys-color-on-surface)',
          fontFamily: 'inherit',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: 'var(--md-sys-color-error-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--md-sys-color-error)' }}>
              error
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px' }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)',
            margin: '0 0 8px', maxWidth: '400px', textAlign: 'center', lineHeight: '20px',
          }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          {this.state.errorInfo && (
            <details style={{
              maxWidth: '500px', width: '100%', marginTop: '12px',
              fontSize: '11px', fontFamily: 'monospace', color: 'var(--md-sys-color-outline)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderRadius: '8px', padding: '12px', maxHeight: '120px', overflow: 'auto',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Error details
              </summary>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.errorInfo}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 24px', borderRadius: '20px', border: 'none',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Try again
            </button>
            <button
              onClick={this.handleCopyError}
              style={{
                padding: '10px 20px', borderRadius: '20px',
                border: '1px solid var(--md-sys-color-outline)',
                backgroundColor: 'transparent',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
              Copy error
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 20px', borderRadius: '20px',
                border: '1px solid var(--md-sys-color-outline)',
                backgroundColor: 'transparent',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
