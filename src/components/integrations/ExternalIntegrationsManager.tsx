import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ExternalIntegrationsManager as IntegrationsManager } from '@/lib/integrations/ExternalIntegrationsManager';
import { 
  Settings, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  FileText,
  Plus,
  TestTube,
  Trash2
} from 'lucide-react';

export default function ExternalIntegrationsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    integration_type: 'quickbooks' as const,
    config_data: {} as Record<string, any>,
    sync_frequency: 'daily' as const
  });

  const integrationsManager = IntegrationsManager.getInstance();

  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      const data = await integrationsManager.getIntegrations(user?.user_metadata?.tenant_id || '');
      setIntegrations(data);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load integrations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createIntegration = async () => {
    try {
      const integration = await integrationsManager.createIntegration(
        user?.user_metadata?.tenant_id || '',
        newIntegration
      );
      setIntegrations([integration, ...integrations]);
      setShowNewForm(false);
      setNewIntegration({
        integration_type: 'quickbooks',
        config_data: {},
        sync_frequency: 'daily'
      });
      toast({
        title: 'Success',
        description: 'Integration created successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create integration',
        variant: 'destructive',
      });
    }
  };

  const testConnection = async (integrationId: string) => {
    try {
      const result = await integrationsManager.testConnection(integrationId);
      toast({
        title: result.success ? 'Success' : 'Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    }
  };

  const syncData = async (integrationId: string, dataType: string) => {
    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      if (integration.integration_type === 'quickbooks') {
        await integrationsManager.syncQuickBooks(integrationId, dataType as any);
      } else if (integration.integration_type === 'kra_etims') {
        await integrationsManager.syncKRATIMS(integrationId, dataType as any);
      }

      toast({
        title: 'Sync Started',
        description: `Syncing ${dataType} data...`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync data',
        variant: 'destructive',
      });
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    
    try {
      await integrationsManager.deleteIntegration(integrationId);
      setIntegrations(integrations.filter(i => i.id !== integrationId));
      toast({
        title: 'Success',
        description: 'Integration deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete integration',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [user?.user_metadata?.tenant_id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">External Integrations</h1>
          <p className="text-muted-foreground">
            Manage connections to external systems
          </p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Integration
        </Button>
      </div>

      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Integration Type</Label>
                <Select 
                  value={newIntegration.integration_type} 
                  onValueChange={(value) => setNewIntegration({
                    ...newIntegration,
                    integration_type: value as any
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quickbooks">QuickBooks</SelectItem>
                    <SelectItem value="kra_etims">KRA e-TIMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Sync Frequency</Label>
                <Select 
                  value={newIntegration.sync_frequency} 
                  onValueChange={(value) => setNewIntegration({
                    ...newIntegration,
                    sync_frequency: value as any
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newIntegration.integration_type === 'quickbooks' && (
              <div className="space-y-4">
                <h4 className="font-medium">QuickBooks Configuration</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Client ID</Label>
                    <Input 
                      placeholder="Enter QuickBooks Client ID"
                      value={newIntegration.config_data.client_id || ''}
                      onChange={(e) => setNewIntegration({
                        ...newIntegration,
                        config_data: {
                          ...newIntegration.config_data,
                          client_id: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Realm ID</Label>
                    <Input 
                      placeholder="Enter QuickBooks Realm ID"
                      value={newIntegration.config_data.realm_id || ''}
                      onChange={(e) => setNewIntegration({
                        ...newIntegration,
                        config_data: {
                          ...newIntegration.config_data,
                          realm_id: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {newIntegration.integration_type === 'kra_etims' && (
              <div className="space-y-4">
                <h4 className="font-medium">KRA e-TIMS Configuration</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>API Key</Label>
                    <Input 
                      placeholder="Enter KRA API Key"
                      value={newIntegration.config_data.api_key || ''}
                      onChange={(e) => setNewIntegration({
                        ...newIntegration,
                        config_data: {
                          ...newIntegration.config_data,
                          api_key: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Business PIN</Label>
                    <Input 
                      placeholder="Enter Business PIN"
                      value={newIntegration.config_data.business_pin || ''}
                      onChange={(e) => setNewIntegration({
                        ...newIntegration,
                        config_data: {
                          ...newIntegration.config_data,
                          business_pin: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
              <Button onClick={createIntegration}>
                Create Integration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {integration.integration_type === 'quickbooks' ? (
                    <DollarSign className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                  <CardTitle className="text-lg capitalize">
                    {integration.integration_type.replace('_', ' ')}
                  </CardTitle>
                </div>
                <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                  {integration.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>
                {integration.sync_frequency} sync • Last sync: {
                  integration.last_sync_at 
                    ? new Date(integration.last_sync_at).toLocaleDateString()
                    : 'Never'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => testConnection(integration.id)}
                >
                  <TestTube className="h-4 w-4 mr-1" />
                  Test
                </Button>
                
                                 {integration.integration_type === 'quickbooks' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => syncData(integration.id, 'customers')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Sync
                    </Button>
                  </>
                )}

                {integration.integration_type === 'kra_etims' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => syncData(integration.id, 'sales')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Sync
                    </Button>
                  </>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  Created {new Date(integration.created_at).toLocaleDateString()}
                </span>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => deleteIntegration(integration.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {integrations.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No integrations configured</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
