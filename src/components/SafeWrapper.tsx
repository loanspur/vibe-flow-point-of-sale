import React, { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface SafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class SafeErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Component Error Boundary Caught:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4">
          <div className="text-2xl">⚠️</div>
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-muted-foreground">
            An error occurred while loading this section. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SafeWrapper({ children, fallback = <LoadingSpinner /> }: SafeWrapperProps) {
  const { toast } = useToast();

  const handleError = (error: Error) => {
    toast({
      title: "Error",
      description: "Something went wrong. Please try again.",
      variant: "destructive",
    });
  };

  return (
    <SafeErrorBoundary onError={handleError}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </SafeErrorBoundary>
  );
}