import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Upload, Palette, Receipt, Settings } from 'lucide-react';

const customizationSchema = z.object({
  logo_url: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  receipt_template: z.string().min(1, 'Receipt template is required'),
  invoice_template: z.string().min(1, 'Invoice template is required'),
  footer_text: z.string().min(1, 'Footer text is required'),
  show_stock_alerts: z.boolean(),
  show_low_stock_warnings: z.boolean(),
  default_currency: z.string().min(3).max(3),
  date_format: z.string(),
  time_format: z.enum(['12h', '24h']),
  receipt_header: z.string().optional(),
  receipt_footer: z.string().optional(),
  include_tax_breakdown: z.boolean(),
  include_payment_method: z.boolean(),
});

type CustomizationFormData = z.infer<typeof customizationSchema>;

interface TenantCustomization {
  id: string;
  tenant_id: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  receipt_template: string;
  invoice_template: string;
  footer_text: string;
  show_stock_alerts: boolean;
  show_low_stock_warnings: boolean;
  default_currency: string;
  date_format: string;
  time_format: '12h' | '24h';
  receipt_header?: string;
  receipt_footer?: string;
  include_tax_breakdown: boolean;
  include_payment_method: boolean;
  created_at: string;
  updated_at: string;
}

export default function TenantCustomization() {
  const [customization, setCustomization] = useState<TenantCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const { toast } = useToast();

  const form = useForm<CustomizationFormData>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      primary_color: '#2563eb',
      secondary_color: '#64748b',
      accent_color: '#f59e0b',
      receipt_template: 'Thank you for your purchase!',
      invoice_template: 'Please pay within 30 days.',
      footer_text: 'Powered by Vibe POS',
      show_stock_alerts: true,
      show_low_stock_warnings: true,
      default_currency: 'KES',
      date_format: 'DD/MM/YYYY',
      time_format: '24h',
      include_tax_breakdown: true,
      include_payment_method: true,
    },
  });

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
    try {
      const { data, error } = await supabase.rpc('get_tenant_customization');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const custom = data[0] as TenantCustomization;
        setCustomization(custom);
        form.reset(custom);
      }
    } catch (error) {
      console.error('Error fetching customization:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customization settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CustomizationFormData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_customization')
        .upsert({
          ...data,
          tenant_id: customization?.tenant_id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Customization settings saved successfully',
      });

      await fetchCustomization();
    } catch (error) {
      console.error('Error saving customization:', error);
      toast({
        title: 'Error',
        description: 'Failed to save customization settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(filePath);

      form.setValue('logo_url', publicUrl);
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const currencyOptions = [
    { value: 'KES', label: 'Kenyan Shilling (KES)' },
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
  ];

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customization</h2>
        <p className="text-muted-foreground">
          Customize your POS system branding, UI preferences, and receipt templates.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="ui" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              UI Settings
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>
                  Customize your logo and brand colors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo</Label>
                  <div className="flex items-center gap-4">
                    {form.watch('logo_url') && (
                      <img
                        src={form.watch('logo_url')}
                        alt="Logo"
                        className="h-16 w-16 object-contain border rounded"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                      />
                      {isUploadingLogo && (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        {...form.register('primary_color')}
                        className="flex-1"
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: form.watch('primary_color') }}
                      />
                    </div>
                    {form.formState.errors.primary_color && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.primary_color.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        {...form.register('secondary_color')}
                        className="flex-1"
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: form.watch('secondary_color') }}
                      />
                    </div>
                    {form.formState.errors.secondary_color && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.secondary_color.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent_color">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent_color"
                        {...form.register('accent_color')}
                        className="flex-1"
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: form.watch('accent_color') }}
                      />
                    </div>
                    {form.formState.errors.accent_color && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.accent_color.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receipt & Invoice Templates</CardTitle>
                <CardDescription>
                  Customize your receipt and invoice templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="receipt_header">Receipt Header</Label>
                  <Textarea
                    id="receipt_header"
                    {...form.register('receipt_header')}
                    placeholder="Enter your receipt header text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_template">Receipt Message</Label>
                  <Textarea
                    id="receipt_template"
                    {...form.register('receipt_template')}
                    placeholder="Thank you for your purchase!"
                  />
                  {form.formState.errors.receipt_template && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.receipt_template.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_template">Invoice Message</Label>
                  <Textarea
                    id="invoice_template"
                    {...form.register('invoice_template')}
                    placeholder="Please pay within 30 days."
                  />
                  {form.formState.errors.invoice_template && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.invoice_template.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_footer">Receipt Footer</Label>
                  <Textarea
                    id="receipt_footer"
                    {...form.register('receipt_footer')}
                    placeholder="Enter your receipt footer text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer_text">General Footer</Label>
                  <Input
                    id="footer_text"
                    {...form.register('footer_text')}
                    placeholder="Powered by Vibe POS"
                  />
                  {form.formState.errors.footer_text && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.footer_text.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include_tax_breakdown">Include Tax Breakdown</Label>
                    <p className="text-sm text-muted-foreground">
                      Show tax details on receipts and invoices
                    </p>
                  </div>
                  <Switch
                    id="include_tax_breakdown"
                    checked={form.watch('include_tax_breakdown')}
                    onCheckedChange={(checked) => form.setValue('include_tax_breakdown', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include_payment_method">Include Payment Method</Label>
                    <p className="text-sm text-muted-foreground">
                      Show payment method on receipts
                    </p>
                  </div>
                  <Switch
                    id="include_payment_method"
                    checked={form.watch('include_payment_method')}
                    onCheckedChange={(checked) => form.setValue('include_payment_method', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ui" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>UI Preferences</CardTitle>
                <CardDescription>
                  Configure display and notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_currency">Default Currency</Label>
                    <Select
                      value={form.watch('default_currency')}
                      onValueChange={(value) => form.setValue('default_currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_format">Date Format</Label>
                    <Select
                      value={form.watch('date_format')}
                      onValueChange={(value) => form.setValue('date_format', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFormatOptions.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_format">Time Format</Label>
                  <Select
                    value={form.watch('time_format')}
                    onValueChange={(value: '12h' | '24h') => form.setValue('time_format', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_stock_alerts">Show Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Display stock alerts in the dashboard
                    </p>
                  </div>
                  <Switch
                    id="show_stock_alerts"
                    checked={form.watch('show_stock_alerts')}
                    onCheckedChange={(checked) => form.setValue('show_stock_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_low_stock_warnings">Show Low Stock Warnings</Label>
                    <p className="text-sm text-muted-foreground">
                      Display warnings for low stock items
                    </p>
                  </div>
                  <Switch
                    id="show_low_stock_warnings"
                    checked={form.watch('show_low_stock_warnings')}
                    onCheckedChange={(checked) => form.setValue('show_low_stock_warnings', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  Preview your customization settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Receipt Preview</h3>
                    <div className="text-sm space-y-1">
                      {form.watch('receipt_header') && (
                        <p className="text-center font-medium">{form.watch('receipt_header')}</p>
                      )}
                      <p className="text-center">{form.watch('receipt_template')}</p>
                      {form.watch('receipt_footer') && (
                        <p className="text-center text-xs">{form.watch('receipt_footer')}</p>
                      )}
                      <p className="text-center text-xs text-muted-foreground">
                        {form.watch('footer_text')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: form.watch('primary_color') }}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: form.watch('secondary_color') }}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: form.watch('accent_color') }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
