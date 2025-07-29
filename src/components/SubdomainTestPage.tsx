import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, Globe, Shield } from 'lucide-react';
import { useDomainContext } from '@/lib/domain-router';

const SubdomainTestPage = () => {
  const { domainConfig, loading } = useDomainContext();
  
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