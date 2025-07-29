import { useState, useEffect } from "react";
import BillingManagement from "./BillingManagement";
import { DocumentTemplateEditor } from "./DocumentTemplateEditor";
import { DataMigration } from "./DataMigration";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Mail as MailIcon,
  MessageSquare,
  Layout,
  Download,
  Printer,
  Database
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { currencies, stockAccountingMethods, smsProviders, templateOptions } from "@/lib/currencies";
import { timezones } from "@/lib/timezones";
// Simple country list to avoid type issues
const COUNTRY_LIST = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 
  'Japan', 'China', 'India', 'Brazil', 'Mexico', 'South Africa', 'Nigeria', 'Kenya'
];
import { clearCurrencyCache } from "@/lib/currency";
import { useCurrencyUpdate } from "@/hooks/useCurrencyUpdate";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { RestrictedSetting } from "@/components/FeatureRestriction";
import DomainManagement from '@/components/DomainManagement';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { PaymentManagement } from '@/components/PaymentManagement';
import { MpesaIntegration } from '@/components/MpesaIntegration';

const businessSettingsSchema = z.object({
  // Basic company information
  company_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  currency_code: z.string().default("USD"),
  timezone: z.string().default("America/New_York"),
  default_tax_rate: z.number().min(0).max(100).default(0),
  tax_name: z.string().default("Tax"),
  company_logo_url: z.string().optional(),
  
  // Business registration details
  tax_identification_number: z.string().optional(),
  business_registration_number: z.string().optional(),
  
  // Product and inventory features
  enable_brands: z.boolean().default(false),
  enable_overselling: z.boolean().default(false),
  enable_product_units: z.boolean().default(false),
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
  sms_provider: z.string().optional(),
  sms_api_key: z.string().optional(),
  sms_sender_id: z.string().optional(),
  whatsapp_api_key: z.string().optional(),
  whatsapp_phone_number: z.string().optional(),
  whatsapp_api_url: z.string().optional(),
  
  // Email settings
  email_from_address: z.string().optional(),
  email_from_name: z.string().optional(),
  email_smtp_host: z.string().optional(),
  email_smtp_port: z.number().default(587),
  email_smtp_username: z.string().optional(),
  email_smtp_password: z.string().optional(),
  email_enable_ssl: z.boolean().default(true),
  
  // Templates and documents
  invoice_template: z.string().default("standard"),
  receipt_template: z.string().default("standard"),
  quote_template: z.string().default("standard"),
  delivery_note_template: z.string().default("standard"),
  invoice_number_prefix: z.string().default("INV-"),
  quote_number_prefix: z.string().default("QT-"),
  delivery_note_prefix: z.string().default("DN-"),
  invoice_terms_conditions: z.string().optional(),
  
  // Receipt customization
  receipt_header: z.string().optional(),
  receipt_footer: z.string().optional(),
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
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get initial tab from URL or default to "company"
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    return tabParam || "company";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StoreLocation | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
    phone: '',
    email: '',
    manager_name: '',
    is_primary: false,
    is_active: true
  });
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<StoreLocation | null>(null);
  const [isViewingLocation, setIsViewingLocation] = useState(false);
  const [locationToView, setLocationToView] = useState<StoreLocation | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [themeColors, setThemeColors] = useState({
    primary: "#3b82f6",
    secondary: "#64748b",
    accent: "#f59e0b"
  });
  const [currencySearch, setCurrencySearch] = useState("");
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"invoice" | "receipt" | "quote">("invoice");
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateEditType, setTemplateEditType] = useState<"invoice" | "receipt" | "quote">("invoice");
  const { toast } = useToast();
  const { formatCurrency, refreshBusinessSettings } = useApp();
  const { formatPrice } = useCurrencyUpdate();
  const { hasFeature, isSettingRestricted, getFeatureUpgradeMessage } = useFeatureAccess();

  const form = useForm<z.infer<typeof businessSettingsSchema>>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      // Basic company information
      company_name: "",
      email: "",
      phone: "",
      website: "",
      currency_code: "USD",
      timezone: "America/New_York",
      default_tax_rate: 0,
      tax_name: "Tax",
      
      // Business registration details
      tax_identification_number: "",
      business_registration_number: "",
      
      // Product and inventory features
      enable_brands: false,
      enable_overselling: false,
      enable_product_units: false,
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
      
      // POS settings
      pos_auto_print_receipt: true,
      pos_ask_customer_info: false,
      pos_enable_discounts: true,
      pos_max_discount_percent: 100.00,
      pos_enable_tips: false,
      pos_default_payment_method: "cash",
      
      // Notifications and communications
      sms_enable_notifications: false,
      whatsapp_enable_notifications: false,
      sms_provider: "",
      sms_api_key: "",
      sms_sender_id: "",
      whatsapp_api_key: "",
      whatsapp_phone_number: "",
      whatsapp_api_url: "",
      
      // Email settings
      email_from_address: "",
      email_from_name: "",
      email_smtp_host: "",
      email_smtp_port: 587,
      email_smtp_username: "",
      email_smtp_password: "",
      email_enable_ssl: true,
      
      // Templates and documents
      invoice_template: "standard",
      receipt_template: "standard",
      quote_template: "standard",
      delivery_note_template: "standard",
      invoice_number_prefix: "INV-",
      quote_number_prefix: "QT-",
      delivery_note_prefix: "DN-",
      invoice_terms_conditions: "",
      
      // Receipt customization
      receipt_header: "",
      receipt_footer: "",
      receipt_logo_url: "",
      print_customer_copy: true,
      print_merchant_copy: true,
      
      // Auto-numbering
      invoice_auto_number: true,
      quote_auto_number: true,
      delivery_note_auto_number: true,
      quote_validity_days: 30,
      
      // Security settings
      max_login_attempts: 3,
      account_lockout_duration: 15,
      session_timeout_minutes: 60,
      require_password_change: false,
      password_expiry_days: 90,
      
      // Business operations
      enable_loyalty_program: false,
      enable_gift_cards: false,
      enable_online_orders: false,
      enable_multi_location: false,
      enable_user_roles: true,
      
      // Inventory and stock management
      low_stock_threshold: 10,
      low_stock_alerts: true,
      daily_reports: true,
      email_notifications: true,
      
      // Purchase settings
      purchase_default_tax_rate: 0.0000,
      purchase_auto_receive: false,
      purchase_enable_partial_receive: true,
      
      // Tax settings
      tax_inclusive: false,
      currency_symbol: "$",
      date_format: "MM/DD/YYYY"
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchLocations();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .single();
      
      if (data) {
        setSettings(data);
        form.reset(data);
        if (data.company_logo_url) {
          setLogoPreview(data.company_logo_url);
        }
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data } = await supabase
        .from('store_locations')
        .select('*')
        .order('is_primary', { ascending: false });
      
      if (data) {
        setLocations(data);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setLogoPreview(publicUrl);
      form.setValue('company_logo_url', publicUrl);
      
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof businessSettingsSchema>) => {
    setIsSaving(true);
    try {
      // Get the current user's tenant ID
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('user_id', user.user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to get user profile: ' + profileError.message);
      }

      if (!profile?.tenant_id) {
        throw new Error('No tenant associated with user');
      }

      // Check if user has permission to modify settings
      if (profile.role !== 'superadmin' && profile.role !== 'admin') {
        throw new Error('Insufficient permissions to modify business settings');
      }

      // Prepare the data for update/insert
      const settingsData = {
        ...values,
        tenant_id: profile.tenant_id
      };

      // Check if settings already exist
      const { data: existingSettings } = await supabase
        .from('business_settings')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('business_settings')
          .update(settingsData)
          .eq('tenant_id', profile.tenant_id)
          .select();
      } else {
        // Insert new settings
        result = await supabase
          .from('business_settings')
          .insert([settingsData])
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      setSettings(result.data[0]);

      // Clear currency cache to refresh with new settings
      clearCurrencyCache();
      
      // Trigger app-wide currency update
      if (refreshBusinessSettings) {
        await refreshBusinessSettings();
      }

      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetLocationForm = () => {
    setLocationForm({
      name: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: 'United States',
      phone: '',
      email: '',
      manager_name: '',
      is_primary: false,
      is_active: true
    });
  };

  const handleLocationSubmit = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant associated with user');

      const locationData = {
        ...locationForm,
        tenant_id: profile.tenant_id
      };

      let result;
      if (isEditingLocation && locationToEdit) {
        result = await supabase
          .from('store_locations')
          .update(locationData)
          .eq('id', locationToEdit.id)
          .select();
      } else {
        result = await supabase
          .from('store_locations')
          .insert([locationData])
          .select();
      }

      if (result.error) throw result.error;

      await fetchLocations();
      setIsLocationDialogOpen(false);
      setIsEditingLocation(false);
      setLocationToEdit(null);
      resetLocationForm();

      toast({
        title: isEditingLocation ? "Location updated" : "Location added",
        description: `Store location has been ${isEditingLocation ? 'updated' : 'added'} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save location",
        variant: "destructive",
      });
    }
  };

  const handleEditLocation = (location: StoreLocation) => {
    setLocationForm({
      name: location.name,
      address_line_1: location.address_line_1,
      address_line_2: location.address_line_2 || '',
      city: location.city,
      state_province: location.state_province,
      postal_code: location.postal_code,
      country: location.country,
      phone: location.phone,
      email: location.email || '',
      manager_name: location.manager_name || '',
      is_primary: location.is_primary,
      is_active: location.is_active
    });
    setLocationToEdit(location);
    setIsEditingLocation(true);
    setIsLocationDialogOpen(true);
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      await fetchLocations();
      toast({
        title: "Location deleted",
        description: "Store location has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleViewLocation = (location: StoreLocation) => {
    setLocationToView(location);
    setIsViewingLocation(true);
  };

  const filteredCurrencies = currencySearch
    ? currencies.filter(currency => 
        currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
        currency.name.toLowerCase().includes(currencySearch.toLowerCase())
      )
    : currencies;

  const filteredTimezones = timezoneSearch
    ? timezones.filter(timezone => 
        timezone.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
        timezone.value.toLowerCase().includes(timezoneSearch.toLowerCase())
      )
    : timezones;

  const countryOptions = COUNTRY_LIST;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
          <div className="h-32 bg-muted rounded-2xl mb-8" />
          <div className="h-16 bg-muted rounded-xl mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-xl" />
            ))}
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

        {/* Enhanced Navigation with Modern Glass Effect */}
        <div className="sticky top-4 z-30 bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl p-3 shadow-xl mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8 h-auto bg-transparent gap-2 p-0">
              <TabsTrigger 
                value="company" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Building className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium hidden sm:inline">Company</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sales-products" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Package className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium hidden sm:inline">Sales</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Bell className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium hidden sm:inline">Notifications</span>
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
              <TabsTrigger 
                value="migration" 
                className="group relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50"
              >
                <Database className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-medium">Migration</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Enhanced Form Container */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              
              {/* Company & Operations Combined Tab */}
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
                          <Label htmlFor="logo-upload">
                            <Button type="button" variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors">
                              <Upload className="h-4 w-4 mr-2" />
                              {logoPreview ? "Change Logo" : "Upload Logo"}
                            </Button>
                          </Label>
                          <Input
                            id="logo-upload"
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

                  {/* Tax Configuration */}
                  <Card className="group border-0 shadow-xl bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <Receipt className="h-6 w-6 text-primary" />
                        </div>
                        Tax Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="default_tax_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-primary" />
                              Default Tax Rate (%)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="100" 
                                step="0.01" 
                                placeholder="0.00" 
                                className="border-2 focus:border-primary/50 transition-colors" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="tax_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              <Tag className="h-4 w-4 text-primary" />
                              Tax Label
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="VAT, GST, Sales Tax, etc." 
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
                        name="tax_inclusive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 border-muted p-4 bg-gradient-to-r from-muted/20 to-transparent">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Tax Inclusive Pricing
                              </FormLabel>
                              <FormDescription>
                                Prices include tax by default
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
                
                {/* Company Information Tab Actions */}
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
              <TabsContent value="sales-products" className="space-y-8 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Sales Settings Card */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <ShoppingCart className="h-6 w-6 text-primary" />
                        </div>
                        Sales Configuration
                      </CardTitle>
                      <CardDescription className="text-base">
                        Configure sales processes and customer interactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="pos_ask_customer_info"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Ask Customer Info</FormLabel>
                              <FormDescription>
                                Prompt for customer information during sales
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
                        name="pos_enable_discounts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable Discounts</FormLabel>
                              <FormDescription>
                                Allow discount application during sales
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
                        name="pos_max_discount_percent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              <Tag className="h-4 w-4 text-primary" />
                              Maximum Discount Percentage
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="100" 
                                placeholder="0" 
                                className="border-2 focus:border-primary/50 transition-colors" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Product Settings Card */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        Product Management
                      </CardTitle>
                      <CardDescription className="text-base">
                        Configure product features and inventory settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                              <FormLabel className="text-base">Auto Generate SKU</FormLabel>
                              <FormDescription>
                                Automatically generate SKUs for new products
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
                              <FormLabel className="text-base">Allow Negative Stock</FormLabel>
                              <FormDescription>
                                Allow products to have negative inventory
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
                
                {/* Sales & Products Tab Actions */}
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

              {/* Notifications & Templates Tab */}
              <TabsContent value="notifications" className="space-y-8 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
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

                  {/* Document Templates Card */}
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

              {/* Data Migration Tab */}
              <TabsContent value="migration" className="space-y-8 mt-0">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <Database className="h-6 w-6 text-primary" />
                      </div>
                      Data Migration
                    </CardTitle>
                    <CardDescription className="text-base">
                      Import and export your business data including contacts, products, and categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataMigration />
                  </CardContent>
                </Card>
                
                {/* Migration Tab Actions */}
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
            </Tabs>
          </form>
        </Form>

        {/* Location View Dialog */}
        <Dialog open={isViewingLocation} onOpenChange={setIsViewingLocation}>
          <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-sm border border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl">Location Details</DialogTitle>
            </DialogHeader>
            {locationToView && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Location Name</h3>
                    <p className="text-base">{locationToView.name}</p>
                  </div>
                  {locationToView.manager_name && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Manager</h3>
                      <p className="text-base">{locationToView.manager_name}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Address</h3>
                  <div className="space-y-1">
                    <p className="text-base">{locationToView.address_line_1}</p>
                    {locationToView.address_line_2 && <p className="text-base">{locationToView.address_line_2}</p>}
                    <p className="text-base">{locationToView.city}, {locationToView.state_province} {locationToView.postal_code}</p>
                    <p className="text-base">{locationToView.country}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {locationToView.phone && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Phone</h3>
                      <p className="text-base">{locationToView.phone}</p>
                    </div>
                  )}
                  {locationToView.email && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-2">Email</h3>
                      <p className="text-base">{locationToView.email}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Primary:</span>
                    <Badge variant={locationToView.is_primary ? "default" : "secondary"}>
                      {locationToView.is_primary ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={locationToView.is_active ? "default" : "secondary"}>
                      {locationToView.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}