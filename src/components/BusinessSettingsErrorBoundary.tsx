import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class BusinessSettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BusinessSettingsErrorBoundary] Error caught:', {
      componentName: this.props.componentName,
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <h3 className="text-red-800 font-semibold">Business Settings Error</h3>
          <p className="text-red-600 text-sm mt-1">
            Component: {this.props.componentName}
          </p>
          <p className="text-red-600 text-sm mt-1">
            Error: {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
