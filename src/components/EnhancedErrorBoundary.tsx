import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Bug, Info } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  retryCount: number;
  lastErrorTime: number;
  errorHistory: Array<{ error: Error; timestamp: number; retryCount: number }>;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      lastErrorTime: 0,
      errorHistory: []
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('EnhancedErrorBoundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      errorInfo,
      errorHistory: [
        ...prevState.errorHistory,
        { error, timestamp: Date.now(), retryCount: prevState.retryCount }
      ].slice(-5) // Keep last 5 errors
    }));

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error reporting service here
      console.error('Error reported to monitoring service:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if resetKeys have changed
    if (this.props.resetOnPropsChange && this.state.hasError) {
      const keysChanged = this.props.resetKeys?.some((key, index) => 
        prevProps.resetKeys?.[index] !== key
      );
      
      if (keysChanged) {
        this.resetError();
      }
    }
  }

  handleRetry = () => {
    const { retryCount, lastErrorTime } = this.state;
    const now = Date.now();
    const timeSinceLastError = now - lastErrorTime;
    
    // Prevent rapid retries
    if (timeSinceLastError < 1000) {
      console.warn('Retry blocked: too soon since last error');
      return;
    }

    // Limit retries
    if (retryCount >= 3) {
      console.warn('Max retries reached');
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
      lastErrorTime: now
    }));
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      lastErrorTime: 0
    });
  };

  clearErrorHistory = () => {
    this.setState({ errorHistory: [] });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          errorHistory={this.state.errorHistory}
          onRetry={this.handleRetry}
          onReset={this.resetError}
          onClearHistory={this.clearErrorHistory}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: any;
  retryCount: number;
  errorHistory: Array<{ error: Error; timestamp: number; retryCount: number }>;
  onRetry: () => void;
  onReset: () => void;
  onClearHistory: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  retryCount,
  errorHistory,
  onRetry,
  onReset,
  onClearHistory
}) => {
  const maxRetries = 3;
  const canRetry = retryCount < maxRetries;
  
  const handleGoHome = () => {
    try {
      // Try to use navigate if available (Router context)
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (e) {
      // Fallback to window.location if navigate is not available
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
            <Badge variant="destructive" className="ml-auto">
              Retry {retryCount}/{maxRetries}
            </Badge>
          </div>
          <CardDescription>
            An unexpected error occurred. We've logged this issue and our team has been notified.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription className="text-xs font-mono break-words">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          {errorInfo?.componentStack && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Component Stack</AlertTitle>
              <AlertDescription className="text-xs font-mono max-h-32 overflow-y-auto">
                {errorInfo.componentStack}
              </AlertDescription>
            </Alert>
          )}

          {errorHistory.length > 0 && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertTitle>Recent Errors ({errorHistory.length})</AlertTitle>
              <AlertDescription className="space-y-2">
                {errorHistory.slice(-3).map((item, index) => (
                  <div key={index} className="text-xs">
                    <div className="font-medium">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {item.error.message}
                    </div>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearHistory}
                  className="mt-2"
                >
                  Clear History
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2">
            {canRetry && (
              <Button 
                onClick={onRetry} 
                className="flex-1"
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button 
              onClick={onReset} 
              variant="outline"
              className="flex-1"
            >
              Reset Component
            </Button>
            
            <Button 
              onClick={handleGoHome} 
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          {!canRetry && (
            <Alert>
              <AlertTitle>Maximum retries reached</AlertTitle>
              <AlertDescription>
                Please try refreshing the page or contact support if the issue persists.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Hook version for functional components
export const withEnhancedErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  options?: Omit<Props, 'children' | 'fallback'>
) => {
  return (props: P) => (
    <EnhancedErrorBoundary fallback={fallback} {...options}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );
};
