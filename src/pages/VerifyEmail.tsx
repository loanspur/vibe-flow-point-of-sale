import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    handleVerification();
  }, [token]);

  const handleVerification = async () => {
    if (!token) return;

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-and-create-user', {
        body: { token }
      });

      if (error) {
        throw error;
      }

      setStatus('success');
      
      if (data.type === 'invitation') {
        setMessage('Your email has been verified and your account has been created! You can now log in to access your workspace.');
      } else {
        setMessage(`Your email has been verified and your business account "${data.tenant.name}" has been created! You can now log in to start using VibePOS.`);
      }

      toast({
        title: "Success!",
        description: "Your account has been created successfully. You can now log in.",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to verify email. The link may have expired or is invalid.');
      
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryVerification = () => {
    if (token) {
      setStatus('verifying');
      setMessage('');
      handleVerification();
    }
  };

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'verifying' && (
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-xl">
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified Successfully!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {status === 'verifying' && 'Please wait while we verify your email address and create your account...'}
            {message}
          </p>

          {status === 'success' && (
            <div className="space-y-3">
              <Button onClick={handleGoToLogin} className="w-full">
                Go to Login
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                Back to Home
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              {token && (
                <Button 
                  onClick={handleRetryVerification} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                Back to Home
              </Button>
            </div>
          )}

          {status === 'verifying' && loading && (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" />
              Creating your account...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;