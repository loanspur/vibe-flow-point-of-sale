import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Package, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const productSettingsSchema = z.object({
  // Product and inventory features
  enable_brands: z.boolean().default(false),
  enable_overselling: z.boolean().default(false),
  enable_product_units: z.boolean().default(true),
  enable_product_expiry: z.boolean().default(true),
  enable_warranty: z.boolean().default(false),
  enable_fixed_pricing: z.boolean().default(false),
  auto_generate_sku: z.boolean().default(true),
  enable_barcode_scanning: z.boolean().default(true),
  enable_negative_stock: z.boolean().default(false),
  stock_accounting_method: z.string().default("FIFO"),
  default_markup_percentage: z.number().default(0.00),
  enable_retail_pricing: z.boolean().default(true),
  enable_wholesale_pricing: z.boolean().default(false),
  enable_combo_products: z.boolean().default(false),
  
  // Inventory and stock management
  low_stock_threshold: z.number().default(10),
  low_stock_alerts: z.boolean().default(true),
});

type ProductSettingsFormData = z.infer<typeof productSettingsSchema>;

export function ProductSettings() {
  const { tenantId } = useAuth();
  const { businessSettings, refreshBusinessSettings } = useApp();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<ProductSettingsFormData>({
    resolver: zodResolver(productSettingsSchema),
    defaultValues: {
      enable_brands: false,
      enable_overselling: false,
      enable_product_units: true,
      enable_product_expiry: true,
      enable_warranty: false,
      enable_fixed_pricing: false,
      auto_generate_sku: true,
      enable_barcode_scanning: true,
      enable_negative_stock: false,
      stock_accounting_method: "FIFO",
      default_markup_percentage: 0.00,
      enable_retail_pricing: true,
      enable_wholesale_pricing: false,
      enable_combo_products: false,
      low_stock_threshold: 10,
      low_stock_alerts: true,
    },
  });

  const fetchSettings = () => {
    if (!businessSettings) return;

    // Use the global business settings instead of fetching from database
    form.reset({
      enable_brands: businessSettings.enable_brands ?? false,
      enable_overselling: businessSettings.enable_overselling ?? false,
      enable_product_units: businessSettings.enable_product_units ?? true,
      enable_product_expiry: businessSettings.enable_product_expiry ?? true,
      enable_warranty: businessSettings.enable_warranty ?? false,
      enable_fixed_pricing: businessSettings.enable_fixed_pricing ?? false,
      auto_generate_sku: businessSettings.auto_generate_sku ?? true,
      enable_barcode_scanning: businessSettings.enable_barcode_scanning ?? true,
      enable_negative_stock: businessSettings.enable_negative_stock ?? false,
      stock_accounting_method: businessSettings.stock_accounting_method ?? "FIFO",
      default_markup_percentage: businessSettings.default_markup_percentage ?? 0.00,
      enable_retail_pricing: businessSettings.enable_retail_pricing ?? true,
      enable_wholesale_pricing: businessSettings.enable_wholesale_pricing ?? false,
      enable_combo_products: businessSettings.enable_combo_products ?? false,
      low_stock_threshold: businessSettings.low_stock_threshold ?? 10,
      low_stock_alerts: businessSettings.low_stock_alerts ?? true,
    });
  };

  const saveSettings = async (data: ProductSettingsFormData) => {
    if (!tenantId) {
      console.error('No tenantId available');
      toast({
        title: "Error",
        description: "No tenant ID available. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      console.log('Saving product settings:', { tenantId, data });
      
      // First, let's check what columns actually exist in the database
      const { data: existingSettings, error: readError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      console.log('Existing settings:', existingSettings);
      if (readError) {
        console.error('Error reading existing settings:', readError);
      }
      
      // Prepare data with all product settings
      const safeData = {
        tenant_id: tenantId,
        company_name: existingSettings?.company_name || 'Your Business',
        currency_code: existingSettings?.currency_code || 'USD',
        currency_symbol: existingSettings?.currency_symbol || '$',
        timezone: existingSettings?.timezone || 'UTC',
        default_tax_rate: existingSettings?.default_tax_rate || 0,
        tax_inclusive: existingSettings?.tax_inclusive || false,
        // Product settings
        enable_brands: data.enable_brands,
        enable_overselling: data.enable_overselling,
        enable_product_units: data.enable_product_units,
        enable_product_expiry: data.enable_product_expiry,
        enable_warranty: data.enable_warranty,
        enable_fixed_pricing: data.enable_fixed_pricing,
        auto_generate_sku: data.auto_generate_sku,
        enable_barcode_scanning: data.enable_barcode_scanning,
        enable_negative_stock: data.enable_negative_stock,
        stock_accounting_method: data.stock_accounting_method,
        default_markup_percentage: data.default_markup_percentage,
        enable_retail_pricing: data.enable_retail_pricing,
        enable_wholesale_pricing: data.enable_wholesale_pricing,
        enable_combo_products: data.enable_combo_products,
        low_stock_threshold: data.low_stock_threshold,
        low_stock_alerts: data.low_stock_alerts,
      };
      
      console.log('Safe data to save:', safeData);
      
      const { error } = await supabase
        .from('business_settings')
        .upsert(safeData, {
          onConflict: 'tenant_id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Settings saved successfully');

      // Refresh the global business settings to ensure all components get updated
      await refreshBusinessSettings();

      toast({
        title: "Settings saved",
        description: "Product settings have been updated successfully.",
      });
      
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to save settings. Please try again.";
      
      if (error.code === '42501') {
        errorMessage = "Permission denied. Please check your user permissions.";
      } else if (error.code === '23505') {
        errorMessage = "Duplicate entry. Please try again.";
      } else if (error.code === '23514') {
        errorMessage = "Invalid data. Please check your input.";
      } else if (error.code === 'PGRST204') {
        errorMessage = "Database schema mismatch. Some columns are missing. Please contact support.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error saving settings",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen && businessSettings) {
      fetchSettings();
    }
  }, [isOpen, businessSettings]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Settings className="h-4 w-4 mr-2" />
          Product Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Settings
          </DialogTitle>
          <DialogDescription>
            Configure product features, inventory settings, and pricing options
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveSettings)} className="space-y-6">
            {/* Product Features */}
            <Card>
              <CardHeader>
                <CardTitle>Product Features</CardTitle>
                <CardDescription>Enable or disable product-related features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="enable_brands"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Product Brands</FormLabel>
                        <FormDescription>
                          Enable brand management for products
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_product_units"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Product Units</FormLabel>
                        <FormDescription>
                          Enable unit management (pieces, kg, liters, etc.)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_product_expiry"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Product Expiry Dates</FormLabel>
                        <FormDescription>
                          Track product expiration dates
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_warranty"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Product Warranty</FormLabel>
                        <FormDescription>
                          Enable warranty tracking for products
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_combo_products"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Combo Products</FormLabel>
                        <FormDescription>
                          Enable bundle/combo product creation
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Inventory Management */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>Configure stock and inventory settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="enable_barcode_scanning"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Barcode Scanning</FormLabel>
                        <FormDescription>
                          Enable barcode scanning for products
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_generate_sku"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto-generate SKU</FormLabel>
                        <FormDescription>
                          Automatically generate SKU codes for new products
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_overselling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow Overselling</FormLabel>
                        <FormDescription>
                          Allow sales when stock is insufficient
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_negative_stock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Negative Stock</FormLabel>
                        <FormDescription>
                          Allow negative stock levels
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="low_stock_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Stock Threshold</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum stock level before alert
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock_accounting_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Accounting Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                            <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
                            <SelectItem value="AVERAGE">Average Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Method for calculating stock value
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Settings</CardTitle>
                <CardDescription>Configure pricing options and markup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="enable_retail_pricing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Retail Pricing</FormLabel>
                        <FormDescription>
                          Enable retail price management
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_wholesale_pricing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Wholesale Pricing</FormLabel>
                        <FormDescription>
                          Enable wholesale price management
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_fixed_pricing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Fixed Pricing</FormLabel>
                        <FormDescription>
                          Prevent price modifications after setup
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="default_markup_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Markup Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Default markup percentage for new products
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="low_stock_alerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Low Stock Alerts</FormLabel>
                        <FormDescription>
                          Show alerts when products are running low
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving || loading}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
