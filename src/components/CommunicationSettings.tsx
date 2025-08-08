import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Phone, Mail, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CommunicationSettings {
  // Email settings
  email_enable_notifications: boolean;
  email_smtp_host: string;
  email_smtp_port: number;
  email_smtp_username: string;
  email_smtp_password: string;
  email_from_address: string;
  email_from_name: string;
  email_enable_ssl: boolean;
  
  // SMS settings
  sms_enable_notifications: boolean;
  sms_provider: string;
  sms_api_key: string;
  sms_sender_id: string;
  
  // WhatsApp settings
  whatsapp_enable_notifications: boolean;
  whatsapp_api_url: string;
  whatsapp_api_key: string;
  whatsapp_phone_number: string;
}

const smsProviders = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'nexmo', label: 'Vonage (Nexmo)' },
  { value: 'textmagic', label: 'TextMagic' },
  { value: 'clickatell', label: 'Clickatell' },
  { value: 'custom', label: 'Custom API' }
];

export const CommunicationSettings = () => {
  const [settings, setSettings] = useState<Partial<CommunicationSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const { tenantId } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          email_enable_notifications: data.email_notifications || false,
          email_smtp_host: data.email_smtp_host || '',
          email_smtp_port: data.email_smtp_port || 587,
          email_smtp_username: data.email_smtp_username || '',
          email_smtp_password: data.email_smtp_password || '',
          email_from_address: data.email_from_address || '',
          email_from_name: data.email_from_name || '',
          email_enable_ssl: data.email_enable_ssl || true,
          sms_enable_notifications: data.sms_enable_notifications || false,
          sms_provider: data.sms_provider || '',
          sms_api_key: data.sms_api_key || '',
          sms_sender_id: data.sms_sender_id || '',
          whatsapp_enable_notifications: data.whatsapp_enable_notifications || false,
          whatsapp_api_url: data.whatsapp_api_url || '',
          whatsapp_api_key: data.whatsapp_api_key || '',
          whatsapp_phone_number: data.whatsapp_phone_number || ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load communication settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .upsert({
          tenant_id: tenantId,
          ...settings
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Communication settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save communication settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async (type: 'sms' | 'whatsapp') => {
    if (!testRecipient || !testMessage) {
      toast({
        title: "Error",
        description: "Please enter both recipient and message",
        variant: "destructive",
      });
      return;
    }

    try {
      // This would integrate with your SMS/WhatsApp service
      toast({
        title: "Test Message",
        description: `Test ${type} would be sent to ${testRecipient}`,
      });
      
      setTestMessage('');
      setTestRecipient('');
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to send test ${type}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading communication settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Settings</h2>
          <p className="text-muted-foreground">
            Configure email, SMS, and WhatsApp settings
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <Phone className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.email_enable_notifications || false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, email_enable_notifications: checked }))
                  }
                />
                <Label>Enable email notifications</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={settings.email_smtp_host || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, email_smtp_host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={settings.email_smtp_port || 587}
                    onChange={(e) => setSettings(prev => ({ ...prev, email_smtp_port: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_address">From Address</Label>
                  <Input
                    id="from_address"
                    type="email"
                    value={settings.email_from_address || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, email_from_address: e.target.value }))}
                    placeholder="noreply@yourcompany.com"
                  />
                </div>
                <div>
                  <Label htmlFor="from_name">From Name</Label>
                  <Input
                    id="from_name"
                    value={settings.email_from_name || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, email_from_name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>SMS Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.sms_enable_notifications || false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, sms_enable_notifications: checked }))
                  }
                />
                <Label>Enable SMS notifications</Label>
              </div>

              <div>
                <Label htmlFor="sms_provider">SMS Provider</Label>
                <Select
                  value={settings.sms_provider || ''}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, sms_provider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SMS provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {smsProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sms_api_key">API Key</Label>
                  <Input
                    id="sms_api_key"
                    type="password"
                    value={settings.sms_api_key || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, sms_api_key: e.target.value }))}
                    placeholder="Your SMS API key"
                  />
                </div>
                <div>
                  <Label htmlFor="sms_sender_id">Sender ID</Label>
                  <Input
                    id="sms_sender_id"
                    value={settings.sms_sender_id || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, sms_sender_id: e.target.value }))}
                    placeholder="COMPANY"
                  />
                </div>
              </div>

              {settings.sms_enable_notifications && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Test SMS</h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Recipient phone number (+1234567890)"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                      />
                      <Textarea
                        placeholder="Test message"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        rows={3}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => sendTestMessage('sms')}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Test SMS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.whatsapp_enable_notifications || false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, whatsapp_enable_notifications: checked }))
                  }
                />
                <Label>Enable WhatsApp notifications</Label>
              </div>

              <div>
                <Label htmlFor="whatsapp_api_url">WhatsApp API URL</Label>
                <Input
                  id="whatsapp_api_url"
                  value={settings.whatsapp_api_url || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_api_url: e.target.value }))}
                  placeholder="https://api.whatsapp.com/v1/"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="whatsapp_api_key">API Key</Label>
                  <Input
                    id="whatsapp_api_key"
                    type="password"
                    value={settings.whatsapp_api_key || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_api_key: e.target.value }))}
                    placeholder="Your WhatsApp API key"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp_phone">Business Phone Number</Label>
                  <Input
                    id="whatsapp_phone"
                    value={settings.whatsapp_phone_number || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_phone_number: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              {settings.whatsapp_enable_notifications && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Test WhatsApp Message</h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Recipient WhatsApp number (+1234567890)"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                      />
                      <Textarea
                        placeholder="Test message"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        rows={3}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => sendTestMessage('whatsapp')}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Test WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};