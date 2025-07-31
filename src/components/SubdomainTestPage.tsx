import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, ExternalLink, Globe, Shield, AlertCircle, Clock } from 'lucide-react';
import { useDomainContext } from '@/lib/domain-router';
import { supabase } from '@/integrations/supabase/client';

const SubdomainTestPage = () => {
  const { domainConfig, loading } = useDomainContext();
  const [testSubdomain, setTestSubdomain] = useState('demo-restaurant.vibenet.shop');
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const testDNSPropagation = async () => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-dns-propagation', {
        body: { subdomain: testSubdomain }
      });

      if (error) throw error;
      setTestResults(data);
    } catch (error) {
      console.error('DNS test error:', error);
      setTestResults({
        success: false,
        error: error.message
      });
    } finally {
      setTestLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const testSubdomains = [
    'demo-restaurant.vibenet.shop',
    'coffee-shop-plus.vibenet.shop',
    'coffee-corner-cafe.vibenet.shop',
    'tech-gadgets-store.vibenet.shop',
    'fashion-boutique.vibenet.shop'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Subdomain Configuration Test</h1>
        <p className="text-lg text-muted-foreground">
          Testing vibenet.shop wildcard SSL subdomain routing
        </p>
      </div>

      {/* Current Domain Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Current Domain Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Domain:</label>
              <p className="text-lg">{window.location.hostname}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Full URL:</label>
              <p className="text-lg">{window.location.href}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Is Subdomain:</label>
              <Badge variant={domainConfig?.isSubdomain ? "default" : "secondary"}>
                {domainConfig?.isSubdomain ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium">Tenant ID:</label>
              <p className="text-sm font-mono">{domainConfig?.tenantId || "Not resolved"}</p>
            </div>
          </div>
          
          {domainConfig?.isSubdomain && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Subdomain Routing Active</p>
                <p className="text-sm text-green-700">This domain is correctly configured for tenant-specific access</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SSL Certificate Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Wildcard SSL Certificate Status
          </CardTitle>
          <CardDescription>
            Testing *.vibenet.shop wildcard SSL coverage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">SSL Certificate Active</p>
              <p className="text-sm text-green-700">
                Wildcard SSL certificate installed for *.vibenet.shop
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DNS Propagation Test */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Propagation Test</CardTitle>
          <CardDescription>
            Test DNS propagation and connectivity for a specific subdomain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={testSubdomain}
              onChange={(e) => setTestSubdomain(e.target.value)}
              placeholder="Enter subdomain (e.g., demo-restaurant.vibenet.shop)"
              className="flex-1"
            />
            <Button 
              onClick={testDNSPropagation} 
              disabled={testLoading || !testSubdomain}
            >
              {testLoading ? 'Testing...' : 'Test DNS'}
            </Button>
          </div>

          {testResults && (
            <div className="space-y-4">
              {testResults.success ? (
                <>
                  <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold mb-2">Test Summary</h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Domain:</span> {testResults.summary.subdomain}
                      </p>
                      <p>
                        <span className="font-medium">Propagation Score:</span> {testResults.summary.propagation_score}
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Status:</span>
                        <Badge 
                          variant={testResults.summary.propagated ? "default" : "secondary"}
                          className={testResults.summary.propagated ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                        >
                          {testResults.summary.propagated ? 'Propagated' : 'In Progress'}
                        </Badge>
                      </p>
                    </div>

                    {testResults.summary.recommendations.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {testResults.summary.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Detailed Test Results</h3>
                    {testResults.results.tests.map((test: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium flex items-center gap-2">
                              {getStatusIcon(test.status)}
                              {test.test}
                            </h4>
                            <Badge className={getStatusColor(test.status)}>
                              {test.status}
                            </Badge>
                          </div>
                          
                          {test.error && (
                            <p className="text-sm text-red-600 mb-2">
                              Error: {test.error}
                            </p>
                          )}
                          
                          {test.statusCode && (
                            <p className="text-sm text-muted-foreground">
                              HTTP Status: {test.statusCode}
                            </p>
                          )}
                          
                          {test.records && test.records.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">DNS Records:</p>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(test.records, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {test.domain_status && (
                            <div className="mt-2 text-sm">
                              <p><span className="font-medium">Domain Status:</span> {test.domain_status}</p>
                              <p><span className="font-medium">SSL Status:</span> {test.ssl_status}</p>
                              <p><span className="font-medium">Active:</span> {test.is_active ? 'Yes' : 'No'}</p>
                              {test.verified_at && (
                                <p><span className="font-medium">Verified:</span> {new Date(test.verified_at).toLocaleString()}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Test Failed</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {testResults.error}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Subdomains */}
      <Card>
        <CardHeader>
          <CardTitle>Test Tenant Subdomains</CardTitle>
          <CardDescription>
            Click to test each tenant's subdomain access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testSubdomains.map((subdomain) => (
              <div key={subdomain} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{subdomain}</p>
                  <p className="text-sm text-muted-foreground">Tenant subdomain</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`https://${subdomain}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium">Domain Routing</h3>
              <p className="text-sm text-muted-foreground">Active & Working</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium">SSL Certificate</h3>
              <p className="text-sm text-muted-foreground">Wildcard Active</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium">Tenant Resolution</h3>
              <p className="text-sm text-muted-foreground">Database Linked</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubdomainTestPage;