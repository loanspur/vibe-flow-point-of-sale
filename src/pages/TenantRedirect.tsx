import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const TenantRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleTenantRedirect = async () => {
      try {
        // Get redirect parameters
        const tenantDomain = searchParams.get('tenant_domain');
        const redirectTo = searchParams.get('redirect_to') || '/reset-password';
        const fromParam = searchParams.get('from');
        const email = searchParams.get('email');
        const tenantId = searchParams.get('tenant_id');

        console.log('Tenant redirect parameters:', {
          tenantDomain,
          redirectTo,
          fromParam,
          email,
          tenantId
        });

        if (!tenantDomain) {
          throw new Error('Missing tenant domain parameter');
        }

        // Extract any auth tokens from the current URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const tokenType = urlParams.get('token_type');
        const expiresIn = urlParams.get('expires_in');
        
        // Get any hash parameters (Supabase auth sometimes uses hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const hashTokenType = hashParams.get('token_type');
        const hashExpiresIn = hashParams.get('expires_in');

        // Use hash tokens if available, otherwise use query tokens
        const finalAccessToken = hashAccessToken || accessToken;
        const finalRefreshToken = hashRefreshToken || refreshToken;
        const finalTokenType = hashTokenType || tokenType;
        const finalExpiresIn = hashExpiresIn || expiresIn;

        console.log('Auth tokens found:', {
          accessToken: finalAccessToken ? 'present' : 'missing',
          refreshToken: finalRefreshToken ? 'present' : 'missing',
          tokenType: finalTokenType,
          expiresIn: finalExpiresIn
        });

        // Build the tenant redirect URL
        let tenantRedirectUrl = `https://${tenantDomain}${redirectTo}`;
        
        // Add original parameters
        const tenantParams = new URLSearchParams();
        if (fromParam) tenantParams.set('from', fromParam);
        if (email) tenantParams.set('email', email);
        if (tenantId) tenantParams.set('tenant_id', tenantId);
        
        // Add auth tokens if present
        if (finalAccessToken) tenantParams.set('access_token', finalAccessToken);
        if (finalRefreshToken) tenantParams.set('refresh_token', finalRefreshToken);
        if (finalTokenType) tenantParams.set('token_type', finalTokenType);
        if (finalExpiresIn) tenantParams.set('expires_in', finalExpiresIn);

        // Add any other auth-related parameters
        const authParams = ['type', 'token_hash', 'error', 'error_code', 'error_description'];
        authParams.forEach(param => {
          const value = urlParams.get(param) || hashParams.get(param);
          if (value) tenantParams.set(param, value);
        });

        if (tenantParams.toString()) {
          tenantRedirectUrl += `?${tenantParams.toString()}`;
        }

        console.log('Redirecting to tenant URL:', tenantRedirectUrl);

        // Perform the redirect
        window.location.href = tenantRedirectUrl;

      } catch (err: any) {
        console.error('Tenant redirect error:', err);
        setError(err.message || 'Failed to redirect to tenant domain');
        setIsRedirecting(false);
        
        toast({
          title: "Redirect Error",
          description: err.message || 'Failed to redirect to tenant domain',
          variant: "destructive",
        });

        // Fallback: redirect to main auth page after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    handleTenantRedirect();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-destructive mb-4">Redirect Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Redirecting to login page in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <LoadingSpinner />
          <h2 className="text-xl font-semibold mt-4 mb-2">Redirecting to your workspace</h2>
          <p className="text-muted-foreground">
            Please wait while we redirect you to your tenant domain...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantRedirect;