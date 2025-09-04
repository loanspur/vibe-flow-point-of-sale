import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import BillingManagement from "./BillingManagement";
import { DocumentTemplateEditor } from "./DocumentTemplateEditor";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Receipt, 
  Bell, 
  Shield, 
  Settings, 
  Plus, 
  Edit,
  Eye,
  Trash2, 
  Save,
  Upload,
  Store,
  CreditCard,
  Users,
  User,
  Calendar,
  Package,
  ShoppingCart,
  MessageCircle,
  Smartphone,
  FileText,
  Image as ImageIcon,
  Palette,
  Search,
  MapIcon,
  Tag,
  Package2,
  AlertTriangle,
  Zap,
  MessageSquare,
  Layout,
  Download,
  Printer,
  Database
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { currencies, stockAccountingMethods, smsProviders, templateOptions } from "@/lib/currencies";
import { timezones } from "@/lib/timezones";
// Simple country list to avoid type issues
const COUNTRY_LIST = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 
  'Japan', 'China', 'India', 'Brazil', 'Mexico', 'South Africa', 'Nigeria', 'Kenya'
];
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { RestrictedSetting } from "@/components/FeatureRestriction";
import DomainManagement from '@/components/DomainManagement';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { PaymentManagement } from '@/components/PaymentManagement';
import { MpesaIntegration } from '@/components/MpesaIntegration';


const businessSettingsSchema = z.object({
  // Basic company information
  company_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address_line_1: z.string().nullable().optional(),
  address_line_2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state_province: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  currency_code: z.string().default("USD"),
  timezone: z.string().default("America/New_York"),
  default_tax_rate: z.number().min(0).max(100).default(0),
  tax_name: z.string().default("Tax"),
  company_logo_url: z.string().nullable().optional(),
  
  // Business registration details
  tax_identification_number: z.string().nullable().optional(),
  business_registration_number: z.string().nullable().optional(),
  
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
  
  // POS settings
  pos_auto_print_receipt: z.boolean().default(true),
  pos_ask_customer_info: z.boolean().default(false),
  pos_enable_discounts: z.boolean().default(true),
  pos_max_discount_percent: z.number().default(100.00),
  pos_enable_tips: z.boolean().default(false),
  pos_default_payment_method: z.string().default("cash"),
  
  // Notifications and communications
  sms_enable_notifications: z.boolean().default(false),
  whatsapp_enable_notifications: z.boolean().default(false),
  sms_provider: z.string().nullable().optional(),
  sms_api_key: z.string().nullable().optional(),
  sms_sender_id: z.string().nullable().optional(),
  whatsapp_api_key: z.string().nullable().optional(),
  whatsapp_phone_number: z.string().nullable().optional(),
  whatsapp_api_url: z.string().nullable().optional(),
  
  // Email settings
  email_from_address: z.string().nullable().optional(),
  email_from_name: z.string().nullable().optional(),
  email_smtp_host: z.string().nullable().optional(),
  email_smtp_port: z.number().default(587),
  email_smtp_username: z.string().nullable().optional(),
  email_smtp_password: z.string().nullable().optional(),
  email_enable_ssl: z.boolean().default(true),
  
  // Templates and documents
  invoice_template: z.string().default("standard"),
  receipt_template: z.string().default("standard"),
  quote_template: z.string().default("standard"),
  delivery_note_template: z.string().default("standard"),
  invoice_number_prefix: z.string().default("INV-"),
  quote_number_prefix: z.string().default("QT-"),
  delivery_note_prefix: z.string().default("DN-"),
  invoice_terms_conditions: z.string().nullable().optional(),
  
  // Receipt customization
  receipt_header: z.string().nullable().optional(),
  receipt_footer: z.string().nullable().optional(),
  receipt_logo_url: z.string().optional(),
  print_customer_copy: z.boolean().default(true),
  print_merchant_copy: z.boolean().default(true),
  
  // Auto-numbering
  invoice_auto_number: z.boolean().default(true),
  quote_auto_number: z.boolean().default(true),
  delivery_note_auto_number: z.boolean().default(true),
  quote_validity_days: z.number().default(30),
  
  // Security settings
  max_login_attempts: z.number().default(3),
  account_lockout_duration: z.number().default(15),
  session_timeout_minutes: z.number().default(60),
  require_password_change: z.boolean().default(false),
  password_expiry_days: z.number().default(90),
  
  // Business operations
  business_hours: z.any().optional(),
  enable_loyalty_program: z.boolean().default(false),
  enable_gift_cards: z.boolean().default(false),
  enable_online_orders: z.boolean().default(false),
  enable_multi_location: z.boolean().default(false),
  enable_user_roles: z.boolean().default(true),
  
  // Inventory and stock management
  low_stock_threshold: z.number().default(10),
  low_stock_alerts: z.boolean().default(true),
  daily_reports: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
  
  // Purchase settings
  purchase_default_tax_rate: z.number().default(0.0000),
  purchase_auto_receive: z.boolean().default(false),
  purchase_enable_partial_receive: z.boolean().default(true),
  
  // Tax settings
  tax_inclusive: z.boolean().default(false),
  currency_symbol: z.string().default("$"),
  date_format: z.string().default("MM/DD/YYYY")
});

interface BusinessSettings {
  id?: string;
  tenant_id?: string;
  [key: string]: any;
}

interface StoreLocation {
  id: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
  email?: string;
  manager_name?: string;
  is_primary: boolean;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export function BusinessSettingsEnhanced() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const form = useForm<BusinessSettings>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      currency_code: 'USD',
      timezone: 'America/New_York',
    } as any,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filteredCurrencies = useMemo(() => currencies, []);
  const filteredTimezones = useMemo(() => timezones, []);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [locationFormData, setLocationFormData] = useState<Partial<StoreLocation>>({ is_active: true });

  // Load existing data on component mount
  useEffect(() => {
    if (tenantId) {
      loadBusinessData();
    }
  }, [tenantId]);

  const loadBusinessData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading business data for tenant:', tenantId);
      
      // Load business settings
      const { data: businessSettings, error: settingsError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (settingsError) {
        console.error('Error loading business settings:', settingsError);
        if (settingsError.code !== 'PGRST116') { // Not found is okay
          toast({
            title: "Error",
            description: "Failed to load business settings",
            variant: "destructive",
          });
        }
      }

      // Load store locations
      const { data: storeLocations, error: locationsError } = await supabase
        .from('store_locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (locationsError) {
        console.error('Error loading store locations:', locationsError);
        // Don't show error toast for locations as the table might not exist yet
      }

      // Update state
      if (businessSettings) {
        console.log('Loaded business settings:', businessSettings);
        setSettings(businessSettings);
        form.reset(businessSettings);
        if (businessSettings.company_logo_url) {
          setLogoPreview(businessSettings.company_logo_url);
        }
      }

      if (storeLocations) {
        console.log('Loaded store locations:', storeLocations);
        setLocations(storeLocations);
      }

    } catch (error) {
      console.error('Error loading business data:', error);
      toast({
        title: "Error",
        description: "Failed to load business data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(String(reader.result || ''));
      form.setValue('company_logo_url', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setLocationFormData({ is_active: true });
    setIsLocationDialogOpen(true);
  };
  const handleEditLocation = (loc: StoreLocation) => {
    setEditingLocation(loc);
    setLocationFormData(loc);
    setIsLocationDialogOpen(true);
  };
  const handleDeleteLocation = async (id: string) => {
    try {
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      console.log('Deleting location:', id);

      const { error } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error deleting location:', error);
        throw error;
      }

      setLocations(prev => prev.filter(l => l.id !== id));

      toast({
        title: "Location Deleted",
        description: "Store location has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: `Failed to delete location: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  const handleSaveLocation = async () => {
    try {
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      console.log('Saving location:', locationFormData);

      const locationData = {
        name: locationFormData.name || 'New Location',
        address_line_1: locationFormData.address_line_1 || '',
        address_line_2: locationFormData.address_line_2 || '',
        city: locationFormData.city || '',
        state_province: locationFormData.state_province || '',
        postal_code: locationFormData.postal_code || '',
        country: locationFormData.country || '',
        phone: locationFormData.phone || '',
        email: locationFormData.email || '',
        manager_name: locationFormData.manager_name || '',
        is_primary: Boolean(locationFormData.is_primary),
        is_active: locationFormData.is_active !== false,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };

      if (editingLocation) {
        // Update existing location
        console.log('Updating location:', editingLocation.id);
        const { data, error } = await supabase
          .from('store_locations')
          .update(locationData)
          .eq('id', editingLocation.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          console.error('Error updating location:', error);
          throw error;
        }

        setLocations(prev => prev.map(l => 
          l.id === editingLocation.id ? { ...l, ...locationData } : l
        ));

        toast({
          title: "Location Updated",
          description: "Store location has been updated successfully.",
        });
      } else {
        // Create new location
        console.log('Creating new location');
        const { data, error } = await supabase
          .from('store_locations')
          .insert({
            ...locationData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating location:', error);
          throw error;
        }

        console.log('Created location:', data);
        setLocations(prev => [...prev, data]);

        toast({
          title: "Location Created",
          description: "New store location has been created successfully.",
        });
      }

      setIsLocationDialogOpen(false);
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: `Failed to save location: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      console.log('Saving business settings:', values);

      // Check if settings exist first, then update or insert
      const { data: existingSettings } = await supabase
        .from('business_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();

      let data, error;
      
      if (existingSettings) {
        // Update existing settings
        const result = await supabase
          .from('business_settings')
          .update({
            ...values,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new settings
        const result = await supabase
          .from('business_settings')
          .insert({
          tenant_id: tenantId,
          ...values,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error saving business settings:', error);
        
        // Handle specific error types
        if (error.code === '23505') {
          throw new Error('Settings already exist for this tenant. Please try refreshing the page.');
        } else if (error.code === '23503') {
          throw new Error('Invalid reference data. Please check your tenant configuration.');
        } else if (error.code === 'PGRST116') {
          throw new Error('Database constraint violation. Please check your input data.');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      console.log('Saved business settings:', data);

      // Update local state
      setSettings(data);
      
      toast({
        title: "Settings Saved",
        description: "Your business settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to save settings. Please try again.';
      
      if (error.message.includes('tenant')) {
        errorMessage = 'Tenant configuration error. Please contact support.';
      } else if (error.message.includes('constraint')) {
        errorMessage = 'Invalid data provided. Please check your input and try again.';
      } else if (error.message.includes('Database error')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Saving Settings",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading business settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
        {/* Enhanced Header with Glass Effect */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-background/80 to-secondary/5 backdrop-blur-sm border border-border/50 p-8 mb-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-50" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <Settings className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground/80 bg-clip-text text-transparent">
                    Business Settings
                  </h1>
                  <p className="text-muted-foreground text-lg max-w-2xl">
                    Configure your business operations, customize workflows, and manage system preferences
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Removed global buttons - now on individual tabs */}
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-48 translate-x-48 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-secondary/5 to-transparent rounded-full translate-y-36 -translate-x-36 blur-3xl" />
        </div>

        {/* Tabs wrapper around navigation and content */}
        <Tabs defaultValue="company">
          {/* Enhanced Navigation with Modern Glass Effect */}
          <div className="sticky top-4 z-30 bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl p-3 shadow-xl mb-8">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8 h-auto bg-transparent gap-2 p-0">
              <TabsTrigger 
                value="company" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Building className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium hidden sm:inline">Company</span>
              </TabsTrigger>

              <TabsTrigger 
                value="notifications" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Bell className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium hidden sm:inline">Notifications</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="templates" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <FileText className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium hidden sm:inline">Templates</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="payments" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <CreditCard className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium">Payments</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="domains" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Globe className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium">Domains</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="billing" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Receipt className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium">Billing</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="locations" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <MapPin className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium">Locations</span>
              </TabsTrigger>
              

            </TabsList>
          </div>

          {/* Enhanced Form Container */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Company Tab */}
              <TabsContent value="company" className="space-y-8 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                  
                  {/* Company Information Card */}
                  <Card className="group border-0 shadow-xl bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <Building className="h-6 w-6 text-primary" />
                        </div>
                        Company Information
                      </CardTitle>
                      <CardDescription className="text-base">
                        Basic details about your business and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              <Building className="h-4 w-4 text-primary" />
                              Company Name
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your company name" 
                                className="border-2 focus:border-primary/50 transition-colors" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary" />
                                Email
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="business@company.com" 
                                  className="border-2 focus:border-primary/50 transition-colors" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" />
                                Phone
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+1 (555) 123-4567" 
                                  className="border-2 focus:border-primary/50 transition-colors" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              <Globe className="h-4 w-4 text-primary" />
                              Website
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://www.company.com" 
                                className="border-2 focus:border-primary/50 transition-colors" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Company Logo Card */}
                  <Card className="group border-0 shadow-xl bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <ImageIcon className="h-6 w-6 text-primary" />
                        </div>
                        Company Logo
                      </CardTitle>
                      <CardDescription className="text-base">
                        Upload your company logo for branding and receipts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col items-center gap-6 p-8 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-gradient-to-br from-muted/20 to-transparent hover:border-primary/50 transition-colors">
                        {logoPreview ? (
                          <div className="relative group">
                            <img
                              src={logoPreview}
                              alt="Company Logo"
                              className="w-32 h-32 object-contain rounded-lg border-2 border-border shadow-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setLogoPreview("");
                                  form.setValue('company_logo_url', "");
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/10">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="space-y-4 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer hover:bg-primary/10 transition-colors"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {logoPreview ? "Change Logo" : "Upload Logo"}
                          </Button>
                          <Input
                            id="logo-upload"
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                          <p className="text-sm text-muted-foreground">
                            Recommended: 200x200px, PNG or JPG format
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Currency & Localization */}
                  <Card className="group border-0 shadow-xl bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <Globe className="h-6 w-6 text-primary" />
                        </div>
                        Currency & Localization
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="currency_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Currency</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Auto-update currency symbol when currency changes
                                const selectedCurrency = currencies.find(c => c.code === value);
                                if (selectedCurrency) {
                                  form.setValue('currency_symbol', selectedCurrency.symbol);
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border-2 focus:border-primary/50">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background/95 backdrop-blur-sm border border-border/50">
                                {filteredCurrencies.map((currency) => (
                                  <SelectItem key={currency.code} value={currency.code}>
                                    <div className="flex items-center gap-3">
                                      <CurrencyIcon currency={currency.code} className="h-4 w-4" />
                                      <span>{currency.code} - {currency.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-2 focus:border-primary/50">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background/95 backdrop-blur-sm border border-border/50">
                                {filteredTimezones.map((timezone) => (
                                  <SelectItem key={timezone.value} value={timezone.value}>
                                    {timezone.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>


                </div>
                
                {/* Company Tab Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => form.reset()}
                    className="hover:bg-muted/80 border-dashed transition-all duration-300 hover:scale-105"
                  >
                    Reset Changes
                  </Button>
                  <Button 
                    onClick={() => onSubmit(form.getValues())} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-8 mt-0">
                <div className="grid grid-cols-1 gap-8">
                  
                  {/* Notification Settings Card */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <Bell className="h-6 w-6 text-primary" />
                        </div>
                        Notification Settings
                      </CardTitle>
                      <CardDescription className="text-base">
                        Configure email, SMS, and system notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="email_notifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Send email notifications for important events
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
                        name="sms_enable_notifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">SMS Notifications</FormLabel>
                              <FormDescription>
                                Send SMS notifications to customers
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
                        name="low_stock_alerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Low Stock Alerts</FormLabel>
                              <FormDescription>
                                Receive alerts when inventory is low
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
                        name="daily_reports"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Daily Reports</FormLabel>
                              <FormDescription>
                                Receive daily business reports via email
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
                </div>
                
                {/* Notifications Tab Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => form.reset()}
                    className="hover:bg-muted/80 border-dashed transition-all duration-300 hover:scale-105"
                  >
                    Reset Changes
                  </Button>
                  <Button 
                    onClick={() => onSubmit(form.getValues())} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-8 mt-0">
                <div className="grid grid-cols-1 gap-8">
                  {/* Document Templates Card - Full Width */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        Document Templates
                      </CardTitle>
                      <CardDescription className="text-base">
                        Customize invoice, receipt, and quote templates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DocumentTemplateEditor tenantId={settings?.tenant_id || ''} />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Templates Tab Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => form.reset()}
                    className="hover:bg-muted/80 border-dashed transition-all duration-300 hover:scale-105"
                  >
                    Reset Changes
                  </Button>
                  <Button 
                    onClick={() => onSubmit(form.getValues())} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-8 mt-0">
                <div className="space-y-8">
                  {/* Payment Management Card */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        Payment Methods
                      </CardTitle>
                      <CardDescription className="text-base">
                        Configure payment methods and gateway integrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PaymentManagement />
                    </CardContent>
                  </Card>

                  <Separator />

                  {/* Mpesa Integration Card */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                          <Smartphone className="h-6 w-6 text-green-600" />
                        </div>
                        M-Pesa Integration
                      </CardTitle>
                      <CardDescription className="text-base">
                        Configure M-Pesa C2B payment integration for Kenyan customers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MpesaIntegration />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Payments Tab Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => form.reset()}
                    className="hover:bg-muted/80 border-dashed transition-all duration-300 hover:scale-105"
                  >
                    Reset Changes
                  </Button>
                  <Button 
                    onClick={() => onSubmit(form.getValues())} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Domains Tab */}
              <TabsContent value="domains" className="space-y-8 mt-0">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <Globe className="h-6 w-6 text-primary" />
                      </div>
                      Domain Management
                    </CardTitle>
                    <CardDescription className="text-base">
                      Manage custom domains and SSL certificates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DomainManagement />
                  </CardContent>
                </Card>
                
                {/* Domains Tab Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => form.reset()}
                    className="hover:bg-muted/80 border-dashed transition-all duration-300 hover:scale-105"
                  >
                    Reset Changes
                  </Button>
                  <Button 
                    onClick={() => onSubmit(form.getValues())} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-8 mt-0">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <Receipt className="h-6 w-6 text-primary" />
                      </div>
                      Billing Management
                    </CardTitle>
                    <CardDescription className="text-base">
                      Manage subscription plans, billing cycles, and payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BillingManagement />
                  </CardContent>
                </Card>
                
                {/* Billing Tab Actions */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => form.reset()}
                    className="hover:bg-muted/80 border-dashed transition-all duration-300 hover:scale-105"
                  >
                    Reset Changes
                  </Button>
                  <Button 
                    onClick={() => onSubmit(form.getValues())} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Locations Tab */}
              <TabsContent value="locations" className="space-y-8 mt-0">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      Store Locations
                    </CardTitle>
                    <CardDescription className="text-base">
                      Manage your business locations and branch offices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {locations.length === 0 ? (
                      <div className="text-center py-12">
                        <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Store Locations</h3>
                        <p className="text-muted-foreground mb-6">
                          Set up and manage multiple business locations to organize your operations.
                        </p>
                        <Button 
                          onClick={handleAddLocation}
                          className="bg-gradient-to-r from-primary to-primary/80"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Location
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-medium">Your Locations</h3>
                            <p className="text-muted-foreground">
                              Manage your business locations and branch offices
                            </p>
                          </div>
                          <Button 
                            onClick={handleAddLocation}
                            className="bg-gradient-to-r from-primary to-primary/80"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Location
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          {locations.map((location) => (
                            <Card key={location.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{location.name}</h4>
                                    {location.is_primary && (
                                      <Badge variant="default" className="text-xs">
                                        Primary
                                      </Badge>
                                    )}
                                    {!location.is_active && (
                                      <Badge variant="secondary" className="text-xs">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    {location.address_line_1 && (
                                      <div>{location.address_line_1}</div>
                                    )}
                                    {location.address_line_2 && (
                                      <div>{location.address_line_2}</div>
                                    )}
                                    {(location.city || location.state_province || location.postal_code) && (
                                      <div>
                                        {[location.city, location.state_province, location.postal_code]
                                          .filter(Boolean)
                                          .join(', ')}
                                      </div>
                                    )}
                                    {location.country && (
                                      <div>{location.country}</div>
                                    )}
                                    {location.phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {location.phone}
                                      </div>
                                    )}
                                    {location.email && (
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {location.email}
                                      </div>
                                    )}
                                    {location.manager_name && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        Manager: {location.manager_name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditLocation(location)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteLocation(location.id)}
                                    disabled={location.is_primary && locations.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Location Dialog */}
                <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingLocation ? 'Edit Location' : 'Add New Location'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingLocation 
                          ? 'Update the location details below.' 
                          : 'Enter the details for your new business location.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-name">Location Name *</Label>
                          <Input
                            id="location-name"
                            value={locationFormData.name || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              name: e.target.value
                            }))}
                            placeholder="Main Store, Branch Office, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-phone">Phone</Label>
                          <Input
                            id="location-phone"
                            value={locationFormData.phone || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              phone: e.target.value
                            }))}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location-address1">Address Line 1</Label>
                        <Input
                          id="location-address1"
                          value={locationFormData.address_line_1 || ''}
                          onChange={(e) => setLocationFormData(prev => ({
                            ...prev,
                            address_line_1: e.target.value
                          }))}
                          placeholder="Street address"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location-address2">Address Line 2</Label>
                        <Input
                          id="location-address2"
                          value={locationFormData.address_line_2 || ''}
                          onChange={(e) => setLocationFormData(prev => ({
                            ...prev,
                            address_line_2: e.target.value
                          }))}
                          placeholder="Apartment, suite, etc. (optional)"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-city">City</Label>
                          <Input
                            id="location-city"
                            value={locationFormData.city || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              city: e.target.value
                            }))}
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-state">State/Province</Label>
                          <Input
                            id="location-state"
                            value={locationFormData.state_province || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              state_province: e.target.value
                            }))}
                            placeholder="State or Province"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-postal">Postal Code</Label>
                          <Input
                            id="location-postal"
                            value={locationFormData.postal_code || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              postal_code: e.target.value
                            }))}
                            placeholder="12345"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-country">Country</Label>
                          <Input
                            id="location-country"
                            value={locationFormData.country || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              country: e.target.value
                            }))}
                            placeholder="Country"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-email">Email</Label>
                          <Input
                            id="location-email"
                            type="email"
                            value={locationFormData.email || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              email: e.target.value
                            }))}
                            placeholder="store@company.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-manager">Manager Name</Label>
                          <Input
                            id="location-manager"
                            value={locationFormData.manager_name || ''}
                            onChange={(e) => setLocationFormData(prev => ({
                              ...prev,
                              manager_name: e.target.value
                            }))}
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="location-primary"
                            checked={locationFormData.is_primary || false}
                            onCheckedChange={(checked) => setLocationFormData(prev => ({
                              ...prev,
                              is_primary: checked
                            }))}
                          />
                          <Label htmlFor="location-primary">Primary Location</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="location-active"
                            checked={locationFormData.is_active !== false}
                            onCheckedChange={(checked) => setLocationFormData(prev => ({
                              ...prev,
                              is_active: checked
                            }))}
                          />
                          <Label htmlFor="location-active">Active</Label>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveLocation}
                        disabled={!locationFormData.name}
                      >
                        {editingLocation ? 'Update Location' : 'Create Location'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>


          </form>
        </Form>
        </Tabs>

      </div>
    </div>

  );
}