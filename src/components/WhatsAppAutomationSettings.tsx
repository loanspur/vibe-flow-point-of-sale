import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Settings, MessageCircle, Clock, CheckCircle, FileText, CreditCard, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AutomationSetting {
  id: string;
  event_type: string;
  is_enabled: boolean;
  template_id?: string;
  delay_minutes: number;
  conditions: any;
}

interface Template {
  id: string;
  name: string;
  type: string;
}

const WhatsAppAutomationSettings: React.FC = () => {
  const [settings, setSettings] = useState<AutomationSetting[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useAuth();

  const eventTypes = [
    { value: 'receipt_created', label: 'Receipt Created', icon: FileText, description: 'Send WhatsApp when a receipt is generated' },
    { value: 'invoice_created', label: 'Invoice Created', icon: FileText, description: 'Send WhatsApp when an invoice is created' },
    { value: 'quote_created', label: 'Quote Created', icon: FileText, description: 'Send WhatsApp when a quote is generated' },
    { value: 'payment_received', label: 'Payment Received', icon: CreditCard, description: 'Send WhatsApp when payment is received' },
    { value: 'payment_reminder', label: 'Payment Reminder', icon: Clock, description: 'Send payment reminder WhatsApp messages' },
    { value: 'order_shipped', label: 'Order Shipped', icon: Package, description: 'Send WhatsApp when order is shipped' },
    { value: 'low_stock_alert', label: 'Low Stock Alert', icon: AlertTriangle, description: 'Send WhatsApp when stock is low' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch automation settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('whatsapp_automation_settings')
        .select('*')
        .order('event_type');

      if (settingsError) throw settingsError;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('whatsapp_templates')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');

      if (templatesError) throw templatesError;

      setSettings(settingsData || []);
      setTemplates((templatesData as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch automation settings",
        variant: "destructive",
      });
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (eventType: string, field: string, value: any) => {
    try {
      setSaving(true);
      
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      const updateData: any = {
        tenant_id: tenantId,
        event_type: eventType,
        [field]: value,
      };

      const { error } = await supabase
        .from('whatsapp_automation_settings')
        .upsert(updateData, {
          onConflict: 'tenant_id,event_type'
        });

      if (error) throw error;

      // Update local state
      setSettings(prev => {
        const existing = prev.find(s => s.event_type === eventType);
        if (existing) {
          return prev.map(s => 
            s.event_type === eventType ? { ...s, [field]: value } : s
          );
        } else {
          return [...prev, {
            id: '',
            event_type: eventType,
            is_enabled: field === 'is_enabled' ? value : false,
            delay_minutes: field === 'delay_minutes' ? value : 0,
            template_id: field === 'template_id' ? value : undefined,
            conditions: {}
          }];
        }
      });

      toast({
        title: "Success",
        description: "Automation setting updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update automation setting: ${error.message}`,
        variant: "destructive",
      });
      console.error('Error updating setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (eventType: string) => {
    return settings.find(s => s.event_type === eventType) || {
      id: '',
      event_type: eventType,
      is_enabled: false,
      delay_minutes: 0,
      template_id: undefined,
      conditions: {}
    };
  };

  const getEventIcon = (eventType: string) => {
    const event = eventTypes.find(e => e.value === eventType);
    return event?.icon || MessageCircle;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-xl font-semibold">WhatsApp Automation Settings</h2>
        </div>

        <p className="text-muted-foreground">
          Configure automatic WhatsApp messages for various business events.
        </p>

        {/* Automation Settings */}
        <div className="space-y-6">
          {eventTypes.map((eventType) => {
            const setting = getSetting(eventType.value);
            const IconComponent = getEventIcon(eventType.value);
            
            return (
              <Card key={eventType.value} className="p-4">
                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{eventType.label}</h3>
                        <p className="text-sm text-muted-foreground">{eventType.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {setting.is_enabled && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Enabled
                        </Badge>
                      )}
                      <Switch
                        checked={setting.is_enabled}
                        onCheckedChange={(checked) => updateSetting(eventType.value, 'is_enabled', checked)}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Configuration */}
                  {setting.is_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor={`template-${eventType.value}`}>Template</Label>
                        <Select
                          value={setting.template_id || ''}
                          onValueChange={(value) => updateSetting(eventType.value, 'template_id', value)}
                        >
                          <SelectTrigger id={`template-${eventType.value}`}>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No template</SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex items-center gap-2">
                                  <span>{template.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {template.type}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`delay-${eventType.value}`}>Delay (minutes)</Label>
                        <Input
                          id={`delay-${eventType.value}`}
                          type="number"
                          min="0"
                          max="1440"
                          value={setting.delay_minutes}
                          onChange={(e) => updateSetting(eventType.value, 'delay_minutes', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">
                          Delay before sending the message (0 = immediate)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer Info */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium">How Automation Works</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Messages are sent automatically when the specified events occur</li>
                <li>• Templates can include variables that are automatically filled</li>
                <li>• Delays allow you to schedule messages for optimal timing</li>
                <li>• All automated messages are logged in the message history</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
};

export default WhatsAppAutomationSettings;