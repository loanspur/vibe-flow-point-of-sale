import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Shield, Crown } from 'lucide-react';
import { PermissionError, PermissionErrorHandler, PermissionErrorType } from '@/lib/permission-errors';

interface Props {
  children: ReactNode;
  fallback?: (error: PermissionError, retry: () => void) => ReactNode;
  onError?: (error: PermissionError, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  permissionError: PermissionError | null;
}

export class PermissionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, permissionError: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a permission-related error
    let permissionError: PermissionError;

    if (error.message.includes('permission') || error.message.includes('access')) {
      permissionError = PermissionErrorHandler.createError(PermissionErrorType.PERMISSION_DENIED);
    } else if (error.message.includes('auth') || error.message.includes('login')) {
      permissionError = PermissionErrorHandler.createError(PermissionErrorType.AUTHENTICATION_REQUIRED);
    } else if (error.message.includes('subscription') || error.message.includes('plan')) {
      permissionError = PermissionErrorHandler.createError(PermissionErrorType.SUBSCRIPTION_REQUIRED);
    } else if (error.message.includes('role')) {
      permissionError = PermissionErrorHandler.createError(PermissionErrorType.INSUFFICIENT_ROLE);
    } else {
      permissionError = PermissionErrorHandler.createError(PermissionErrorType.UNKNOWN_PERMISSION_ERROR);
    }

    return { hasError: true, permissionError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.state.permissionError && this.props.onError) {
      this.props.onError(this.state.permissionError, errorInfo);
    }

    console.error('Permission Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, permissionError: null });
  };

  renderError(error: PermissionError) {
    if (this.props.fallback) {
      return this.props.fallback(error, this.handleRetry);
    }

    const isUpgradeRequired = PermissionErrorHandler.shouldShowUpgradeDialog(error);
    const actionableMessage = PermissionErrorHandler.getActionableMessage(error);

    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              {isUpgradeRequired ? (
                <div className="bg-orange-100 rounded-full p-3">
                  <Crown className="h-6 w-6 text-orange-600" />
                </div>
              ) : (
                <div className="bg-red-100 rounded-full p-3">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-lg">
              {isUpgradeRequired ? 'Premium Feature Required' : 'Access Restricted'}
            </CardTitle>
            <CardDescription>
              {error.userMessage}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error.suggestedActions.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Suggested Actions</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1">
                    {error.suggestedActions.map((action, index) => (
                      <li key={index} className="text-sm">
                        • {action}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={this.handleRetry}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              {isUpgradeRequired && (
                <Button 
                  onClick={() => window.location.href = '/admin/settings?tab=billing'}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError && this.state.permissionError) {
      return this.renderError(this.state.permissionError);
    }

    return this.props.children;
  }
}

// HOC for wrapping components with permission error boundary
export function withPermissionErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorHandlerOptions?: Pick<Props, 'fallback' | 'onError'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <PermissionErrorBoundary {...errorHandlerOptions}>
      <WrappedComponent {...props} />
    </PermissionErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withPermissionErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
}