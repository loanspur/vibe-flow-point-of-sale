import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Phone, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface WhatsAppConfig {
  id: string;
  phone_number: string;
  display_name?: string;
  is_active: boolean;
  webhook_url?: string;
  created_at: string;
}

export const WhatsAppConfigManager = () => {
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<WhatsAppConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '',
    api_key: '',
    display_name: '',
    webhook_url: '',
    is_active: true
  });
  const { tenantId } = useAuth();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_whatsapp_configs')
        .select('id, phone_number, display_name, is_active, webhook_url, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching WhatsApp configs:', error);
      toast({
        title: "Error",
        description: "Failed to load WhatsApp configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.phone_number || !formData.api_key) {
        toast({
          title: "Error",
          description: "Phone number and API key are required",
          variant: "destructive",
        });
        return;
      }

      const configData = {
        tenant_id: tenantId,
        phone_number: formData.phone_number,
        api_key: formData.api_key,
        display_name: formData.display_name,
        webhook_url: formData.webhook_url,
        is_active: formData.is_active
      };

      if (selectedConfig) {
        const { error } = await supabase
          .from('tenant_whatsapp_configs')
          .update(configData)
          .eq('id', selectedConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_whatsapp_configs')
          .insert(configData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `WhatsApp configuration ${selectedConfig ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      setSelectedConfig(null);
      setFormData({
        phone_number: '',
        api_key: '',
        display_name: '',
        webhook_url: '',
        is_active: true
      });
      fetchConfigs();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (config: WhatsAppConfig) => {
    if (!confirm('Are you sure you want to delete this WhatsApp configuration?')) return;

    try {
      const { error } = await supabase
        .from('tenant_whatsapp_configs')
        .delete()
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "WhatsApp configuration deleted successfully",
      });
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (config: WhatsAppConfig) => {
    setSelectedConfig(config);
    setFormData({
      phone_number: config.phone_number,
      api_key: '', // Don't pre-populate API key for security
      display_name: config.display_name || '',
      webhook_url: config.webhook_url || '',
      is_active: config.is_active
    });
    setIsDialogOpen(true);
  };

  const toggleActive = async (config: WhatsAppConfig) => {
    try {
      const { error } = await supabase
        .from('tenant_whatsapp_configs')
        .update({ is_active: !config.is_active })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Configuration ${!config.is_active ? 'activated' : 'deactivated'}`,
      });
      fetchConfigs();
    } catch (error) {
      console.error('Error toggling config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading WhatsApp configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5" />
            WhatsApp Business Configurations
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your WhatsApp Business phone numbers and API configurations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedConfig ? 'Edit Configuration' : 'Add WhatsApp Configuration'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Business Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include country code (e.g., +1 for US, +254 for Kenya)
                </p>
              </div>

              <div>
                <Label htmlFor="api_key">360Messenger API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="Your 360Messenger API key"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get your API key from 360Messenger dashboard
                </p>
              </div>

              <div>
                <Label htmlFor="display_name">Display Name (Optional)</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="My Business WhatsApp"
                />
              </div>

              <div>
                <Label htmlFor="webhook">Webhook URL (Optional)</Label>
                <Input
                  id="webhook"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://your-domain.com/webhook"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, is_active: checked }))
                  }
                />
                <Label>Active Configuration</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {selectedConfig ? 'Update' : 'Add'} Configuration
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.phone_number}</TableCell>
                  <TableCell>{config.display_name || 'No name'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.is_active ? "default" : "secondary"}>
                        {config.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(config)}
                      >
                        {config.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(config.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(config)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No WhatsApp configurations yet. Add your first configuration to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {configs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No WhatsApp Configurations</h3>
              <p className="text-muted-foreground mb-4">
                Configure your WhatsApp Business API to start sending messages to customers
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};