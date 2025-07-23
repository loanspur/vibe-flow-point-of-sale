import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Globe, Shield, CheckCircle, XCircle, Clock, AlertTriangle, Copy, ExternalLink } from 'lucide-react';

interface TenantDomain {
  id: string;
  domain_name: string;
  domain_type: 'subdomain' | 'custom_domain';
  status: 'pending' | 'verifying' | 'verified' | 'failed' | 'expired';
  ssl_status: 'none' | 'pending' | 'issued' | 'expired' | 'failed';
  verification_token: string | null;
  verification_method: string | null;
  verification_value: string | null;
  verified_at: string | null;
  ssl_issued_at: string | null;
  ssl_expires_at: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface VerificationLog {
  id: string;
  verification_type: string;
  status: string;
  response_data: any;
  error_message: string | null;
  checked_at: string;
}

export default function DomainManagement() {
  const { tenantId, userRole } = useAuth();
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainType, setDomainType] = useState<'subdomain' | 'custom_domain'>('subdomain');
  const [verificationMethod, setVerificationMethod] = useState<'dns_txt' | 'dns_cname' | 'file_upload'>('dns_txt');
  const [selectedDomain, setSelectedDomain] = useState<TenantDomain | null>(null);

  const canManageDomains = userRole && ['superadmin', 'admin', 'manager'].includes(userRole);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    verifying: 'bg-blue-100 text-blue-800',
    verified: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800'
  };

  const sslStatusColors = {
    none: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    issued: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    if (tenantId) {
      fetchDomains();
    }
  }, [tenantId]);

  const fetchDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_domains')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error: any) {
      console.error('Error fetching domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationLogs = async (domainId: string) => {
    try {
      const { data, error } = await supabase
        .from('domain_verification_logs')
        .select('*')
        .eq('domain_id', domainId)
        .order('checked_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setVerificationLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching verification logs:', error);
      toast.error('Failed to load verification logs');
    }
  };

  const validateDomain = (domain: string, type: 'subdomain' | 'custom_domain'): boolean => {
    if (type === 'subdomain') {
      // Validate subdomain format (alphanumeric and hyphens only)
      const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
      return subdomainRegex.test(domain) && domain.length >= 3 && domain.length <= 63;
    } else {
      // Validate custom domain format
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])*(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])*)*\.[a-zA-Z]{2,}$/;
      return domainRegex.test(domain);
    }
  };

  const addDomain = async () => {
    if (!canManageDomains) {
      toast.error('You do not have permission to manage domains');
      return;
    }

    if (!newDomain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    const domainName = domainType === 'subdomain' 
      ? `${newDomain.toLowerCase()}.yourapp.com` 
      : newDomain.toLowerCase();

    if (!validateDomain(domainType === 'subdomain' ? newDomain : domainName, domainType)) {
      toast.error(`Invalid ${domainType === 'subdomain' ? 'subdomain' : 'domain'} format`);
      return;
    }

    try {
      // Check if domain is available
      const { data: isAvailable, error: checkError } = await supabase
        .rpc('is_domain_available', { domain_name_param: domainName });

      if (checkError) throw checkError;

      if (!isAvailable) {
        toast.error('This domain is already registered');
        return;
      }

      // Generate verification token
      const { data: verificationToken, error: tokenError } = await supabase
        .rpc('generate_domain_verification_token');

      if (tokenError) throw tokenError;

      // Create domain record
      const { error: insertError } = await supabase
        .from('tenant_domains')
        .insert({
          tenant_id: tenantId,
          domain_name: domainName,
          domain_type: domainType,
          verification_token: verificationToken,
          verification_method: verificationMethod,
          verification_value: domainType === 'subdomain' 
            ? `${verificationToken}.yourapp.com` 
            : verificationToken,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          status: domainType === 'subdomain' ? 'verified' : 'pending' // Subdomains are auto-verified
        });

      if (insertError) throw insertError;

      toast.success(`${domainType === 'subdomain' ? 'Subdomain' : 'Domain'} added successfully`);
      setShowAddDialog(false);
      setNewDomain('');
      fetchDomains();
    } catch (error: any) {
      console.error('Error adding domain:', error);
      toast.error('Failed to add domain');
    }
  };

  const verifyDomain = async (domain: TenantDomain) => {
    if (!canManageDomains) {
      toast.error('You do not have permission to verify domains');
      return;
    }

    try {
      // Call verification edge function
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { domainId: domain.id }
      });

      if (error) throw error;

      toast.success('Domain verification initiated');
      fetchDomains();
    } catch (error: any) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain');
    }
  };

  const setPrimaryDomain = async (domainId: string) => {
    if (!canManageDomains) {
      toast.error('You do not have permission to set primary domain');
      return;
    }

    try {
      // Unset current primary domain
      await supabase
        .from('tenant_domains')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('is_primary', true);

      // Set new primary domain
      const { error } = await supabase
        .from('tenant_domains')
        .update({ is_primary: true })
        .eq('id', domainId);

      if (error) throw error;

      toast.success('Primary domain updated');
      fetchDomains();
    } catch (error: any) {
      console.error('Error setting primary domain:', error);
      toast.error('Failed to set primary domain');
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!canManageDomains) {
      toast.error('You do not have permission to delete domains');
      return;
    }

    try {
      const { error } = await supabase
        .from('tenant_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      toast.success('Domain deleted successfully');
      fetchDomains();
    } catch (error: any) {
      console.error('Error deleting domain:', error);
      toast.error('Failed to delete domain');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getVerificationInstructions = (domain: TenantDomain) => {
    if (domain.domain_type === 'subdomain') return null;

    switch (domain.verification_method) {
      case 'dns_txt':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold">DNS TXT Record Verification</h4>
            <p className="text-sm text-muted-foreground">
              Add the following TXT record to your domain's DNS settings:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              <div className="flex items-center justify-between">
                <span>Name: _vibepos-verification</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard('_vibepos-verification')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Value: {domain.verification_token}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(domain.verification_token || '')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      case 'dns_cname':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold">DNS CNAME Record Verification</h4>
            <p className="text-sm text-muted-foreground">
              Add the following CNAME record to your domain's DNS settings:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              <div className="flex items-center justify-between">
                <span>Name: {domain.domain_name}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(domain.domain_name)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Value: vibepos.app</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard('vibepos.app')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      case 'file_upload':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold">File Upload Verification</h4>
            <p className="text-sm text-muted-foreground">
              Upload a file to your website's root directory:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              <div className="flex items-center justify-between">
                <span>File: /.well-known/vibepos-verification.txt</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard('/.well-known/vibepos-verification.txt')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Content: {domain.verification_token}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(domain.verification_token || '')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Domain Management</h2>
          <p className="text-muted-foreground">
            Manage your custom domains and subdomains
          </p>
        </div>
        {canManageDomains && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Globe className="mr-2 h-4 w-4" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Domain</DialogTitle>
                <DialogDescription>
                  Add a subdomain or custom domain for your tenant
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="domain-type">Domain Type</Label>
                  <Select value={domainType} onValueChange={(value: 'subdomain' | 'custom_domain') => setDomainType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subdomain">Subdomain (tenant.yourapp.com)</SelectItem>
                      <SelectItem value="custom_domain">Custom Domain (yourdomain.com)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="domain-name">
                    {domainType === 'subdomain' ? 'Subdomain' : 'Domain Name'}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="domain-name"
                      placeholder={domainType === 'subdomain' ? 'mystore' : 'example.com'}
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                    />
                    {domainType === 'subdomain' && (
                      <span className="text-muted-foreground">.yourapp.com</span>
                    )}
                  </div>
                </div>

                {domainType === 'custom_domain' && (
                  <div>
                    <Label htmlFor="verification-method">Verification Method</Label>
                    <Select value={verificationMethod} onValueChange={(value: 'dns_txt' | 'dns_cname' | 'file_upload') => setVerificationMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dns_txt">DNS TXT Record</SelectItem>
                        <SelectItem value="dns_cname">DNS CNAME Record</SelectItem>
                        <SelectItem value="file_upload">File Upload</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addDomain}>Add Domain</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          {domains.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No domains configured</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add your first domain to get started with custom branding
                </p>
                {canManageDomains && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    Add Domain
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {domains.map((domain) => (
                <Card key={domain.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-lg">{domain.domain_name}</CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {domain.domain_type === 'subdomain' ? 'Subdomain' : 'Custom Domain'}
                            </Badge>
                            {domain.is_primary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={statusColors[domain.status]}>
                          {domain.status === 'verified' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {domain.status === 'failed' && <XCircle className="mr-1 h-3 w-3" />}
                          {domain.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                          {domain.status === 'verifying' && <AlertTriangle className="mr-1 h-3 w-3" />}
                          {domain.status}
                        </Badge>
                        <Badge className={sslStatusColors[domain.ssl_status]}>
                          <Shield className="mr-1 h-3 w-3" />
                          SSL: {domain.ssl_status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {domain.status !== 'verified' && getVerificationInstructions(domain)}
                    
                    {domain.status === 'verified' && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Domain is verified and active. 
                          {domain.ssl_status === 'issued' && ' SSL certificate is active.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    {canManageDomains && (
                      <div className="flex items-center space-x-2 pt-4 border-t">
                        {domain.status !== 'verified' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => verifyDomain(domain)}
                          >
                            Verify Domain
                          </Button>
                        )}
                        {domain.status === 'verified' && !domain.is_primary && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setPrimaryDomain(domain.id)}
                          >
                            Set as Primary
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDomain(domain);
                            fetchVerificationLogs(domain.id);
                          }}
                        >
                          View Logs
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(`https://${domain.domain_name}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteDomain(domain.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          {selectedDomain ? (
            <Card>
              <CardHeader>
                <CardTitle>Verification Logs for {selectedDomain.domain_name}</CardTitle>
                <CardDescription>
                  Recent verification attempts and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verificationLogs.length === 0 ? (
                  <p className="text-muted-foreground">No verification logs found</p>
                ) : (
                  <div className="space-y-4">
                    {verificationLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.checked_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">
                          <strong>Type:</strong> {log.verification_type}
                        </p>
                        {log.error_message && (
                          <p className="text-sm text-red-600">
                            <strong>Error:</strong> {log.error_message}
                          </p>
                        )}
                        {log.response_data && (
                          <details className="mt-2">
                            <summary className="text-sm cursor-pointer">Response Data</summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                              {JSON.stringify(log.response_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a domain</h3>
                <p className="text-muted-foreground">
                  Choose a domain from the list to view its verification logs
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}