/**
 * RoboViz Error Boundary
 *
 * Catches 3D rendering errors and prevents the entire application from crashing.
 * Provides graceful degradation with retry capability.
 */

import * as React from 'react';

export interface RoboVizErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom error UI - can be a ReactNode or a render function */
  fallback?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);
  /** Error callback for logging/monitoring */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Whether to automatically retry after a delay */
  autoRetry?: boolean;
  /** Auto-retry delay in milliseconds */
  retryDelay?: number;
  /** Maximum number of auto-retries */
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error Boundary component for RoboViz 3D rendering
 *
 * @example
 * ```tsx
 * <RoboVizErrorBoundary
 *   onError={(error) => console.error('RoboViz error:', error)}
 *   fallback={(error, retry) => (
 *     <div>
 *       <p>Something went wrong: {error.message}</p>
 *       <button onClick={retry}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <RoboVizCore {...props} />
 * </RoboVizErrorBoundary>
 * ```
 */
export class RoboVizErrorBoundary extends React.Component<RoboVizErrorBoundaryProps, State> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  static defaultProps = {
    autoRetry: false,
    retryDelay: 3000,
    maxRetries: 3,
  };

  state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[RoboVizErrorBoundary] Caught error:', error);
    console.error('[RoboVizErrorBoundary] Component stack:', errorInfo.componentStack);

    // Call user-provided error handler
    this.props.onError?.(error, errorInfo);

    // Handle WebGL context loss specially
    if (this.isWebGLContextLoss(error)) {
      console.warn('[RoboVizErrorBoundary] WebGL context lost, attempting recovery...');
    }

    // Auto-retry if enabled
    if (this.props.autoRetry && this.state.retryCount < (this.props.maxRetries ?? 3)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isWebGLContextLoss(error: Error): boolean {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    return (
      message.includes('context') ||
      message.includes('webgl') ||
      name.includes('webgl') ||
      name === 'webglcontextlosterror'
    );
  }

  private scheduleRetry(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, this.props.retryDelay);
  }

  private handleRetry = (): void => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  private handleManualRetry = (): void => {
    // Reset retry count on manual retry
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props;
      const error = this.state.error!;

      // Use custom fallback if provided
      if (typeof fallback === 'function') {
        return fallback(error, this.handleManualRetry);
      }

      if (fallback) {
        return fallback;
      }

      // Default error UI
      return <DefaultErrorUI error={error} onRetry={this.handleManualRetry} />;
    }

    return this.props.children;
  }
}

/**
 * Default error UI component
 */
interface DefaultErrorUIProps {
  error: Error;
  onRetry: () => void;
}

function DefaultErrorUI({ error, onRetry }: DefaultErrorUIProps): React.JSX.Element {
  const isWebGLError =
    error.message?.toLowerCase().includes('webgl') ||
    error.message?.toLowerCase().includes('context');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: '200px',
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Error Icon */}
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
          opacity: 0.8,
        }}
      >
        ⚠️
      </div>

      {/* Title */}
      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: 600,
        }}
      >
        {isWebGLError ? 'WebGL Error' : '3D Rendering Error'}
      </h2>

      {/* Error Message */}
      <p
        style={{
          margin: '0 0 8px 0',
          color: '#888888',
          textAlign: 'center',
          maxWidth: '400px',
          fontSize: '14px',
        }}
      >
        {error.message || 'An unexpected error occurred while rendering the 3D scene.'}
      </p>

      {/* Hint for WebGL errors */}
      {isWebGLError && (
        <p
          style={{
            margin: '0 0 16px 0',
            color: '#666666',
            textAlign: 'center',
            fontSize: '12px',
          }}
        >
          This may be caused by GPU driver issues or browser limitations.
        </p>
      )}

      {/* Retry Button */}
      <button
        onClick={onRetry}
        style={{
          padding: '10px 24px',
          backgroundColor: '#4a90d9',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#3a80c9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#4a90d9';
        }}
      >
        Retry
      </button>

      {/* Error Details (collapsed by default) */}
      <details
        style={{
          marginTop: '16px',
          color: '#666666',
          fontSize: '12px',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          Error Details
        </summary>
        <pre
          style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#0d0d1a',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '150px',
            fontSize: '11px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.stack || error.toString()}
        </pre>
      </details>
    </div>
  );
}

export default RoboVizErrorBoundary;
