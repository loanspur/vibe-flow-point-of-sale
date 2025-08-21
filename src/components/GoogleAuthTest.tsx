import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function GoogleAuthTest() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const currentDomain = window.location.hostname;
  const isMainDomain = currentDomain === 'vibenet.online' || currentDomain === 'www.vibenet.online';
  const expectedRedirectUrl = `https://qwtybhvdbbkbcelisuek.supabase.co/auth/v1/callback`;
  const expectedSiteUrl = isMainDomain ? 'https://vibenet.online' : `https://${currentDomain}`;

  const requiredUrls = {
    'JavaScript Origins': [
      'https://vibenet.online',
      'https://vibenet.shop',
      'http://localhost:3000',
      !isMainDomain ? `https://${currentDomain}` : null
    ].filter(Boolean),
    'Redirect URIs': [
      expectedRedirectUrl,
      'https://vibenet.online/auth/callback',
      'https://vibenet.shop/auth/callback'
    ],
    'Supabase Site URL': expectedSiteUrl,
    'Supabase Redirect URLs': [
      'https://vibenet.online/**',
      'https://vibenet.shop/**',
      'https://*.vibenet.online/**',
      'https://*.vibenet.shop/**',
      'http://localhost:3000/**'
    ]
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testSupabaseConfig = async () => {
    try {
      // Test if Google provider is enabled
      const { data } = await supabase.auth.getSession();
      setTestResults(prev => ({ ...prev, supabaseSession: !!data.session }));
    } catch (error) {
      console.error('Supabase test failed:', error);
      setTestResults(prev => ({ ...prev, supabaseSession: false }));
    }
  };

  const StatusIcon = ({ status }: { status: boolean | undefined }) => {
    if (status === undefined) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Google OAuth Configuration Checker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="grid md:grid-cols-2 gap-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Domain:</strong> {currentDomain}<br />
                <strong>User Authenticated:</strong> {user ? '✅ Yes' : '❌ No'}<br />
                <strong>User Email:</strong> {user?.email || 'N/A'}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button onClick={testSupabaseConfig} variant="outline" className="w-full">
                Test Supabase Connection
              </Button>
              <GoogleSignInButton 
                buttonText="Test Google Sign-In"
                onSuccess={(user) => {
                  console.log('✅ Google auth successful:', user);
                  setTestResults(prev => ({ ...prev, googleAuth: true }));
                }}
                onError={(error) => {
                  console.error('❌ Google auth failed:', error);
                  setTestResults(prev => ({ ...prev, googleAuth: false }));
                }}
              />
            </div>
          </div>

          {/* Configuration Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Required Configuration</h3>
            
            {Object.entries(requiredUrls).map(([section, urls]) => (
              <Card key={section}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {section}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(Array.isArray(urls) ? urls.join('\n') : urls)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(urls) ? (
                    <ul className="space-y-1">
                      {urls.map((url, index) => (
                        <li key={index} className="text-sm font-mono bg-muted p-2 rounded">
                          {url}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm font-mono bg-muted p-2 rounded">{urls}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Links to Configuration Pages */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Google Cloud Console</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <a 
                    href="https://console.cloud.google.com/apis/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Configure OAuth Credentials
                  </a>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Supabase Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full">
                  <a 
                    href="https://supabase.com/dashboard/project/qwtybhvdbbkbcelisuek/auth/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Auth Providers
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a 
                    href="https://supabase.com/dashboard/project/qwtybhvdbbkbcelisuek/auth/url-configuration" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    URL Configuration
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {copied && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Configuration copied to clipboard!</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}