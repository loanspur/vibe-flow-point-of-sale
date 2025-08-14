import { useState, useEffect, useRef } from "react";
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
  enable_product_units: z.boolean().default(true),
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
  console.log('🎯 BusinessSettingsEnhanced component is LOADING!');
  console.log('🎯 Current timestamp:', new Date().toISOString());
  console.log('🎯 Window location:', window.location.href);
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [themeColors, setThemeColors] = useState({
    primary: "#3b82f6",
    secondary: "#64748b",
    accent: "#f59e0b"
  });
  const [currencySearch, setCurrencySearch] = useState("");
  const [timezoneSearch, setTimezoneSearch] = useState("");
  
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  
  // Location management state
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [locationFormData, setLocationFormData] = useState<Partial<StoreLocation>>({
    name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state_province: "",
    postal_code: "",
    country: "",
    phone: "",
    email: "",
    manager_name: "",
    is_primary: false,
    is_active: true
  });
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
      enable_product_units: true,
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
  }, []);


  // Listen for auth state changes
  useEffect(() => {
    console.log('🔄 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id || 'No user');
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in, fetching data...');
        await fetchSettings();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out, clearing data...');
        setSettings(null);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth listener...');
      subscription.unsubscribe();
    };
  }, []);

  const fetchSettings = async () => {
    try {
      // Resolve tenant id first to avoid RLS race conditions
      const { data: authUser } = await supabase.auth.getUser();
      const userId = authUser?.user?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile?.tenant_id) {
        setIsLoading(false);
        return;
      }

      // Try to fetch settings, on RLS error attempt a self-repair then retry once
      const fetchOnce = () =>
        supabase
          .from('business_settings')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .maybeSingle();

      let { data, error: fetchError } = await fetchOnce();

      if (fetchError && (fetchError.code === '42501' || fetchError.message?.toLowerCase().includes('row-level security') || fetchError.message?.toLowerCase().includes('permission denied'))) {
        const email = authUser?.user?.email;
        try {
          if (email) {
            await supabase.rpc('reactivate_tenant_membership', {
              tenant_id_param: profile.tenant_id,
              target_email_param: email,
            });
            // Retry once after repair
            const retry = await fetchOnce();
            data = retry.data;
            fetchError = retry.error;
          }
        } catch (e) {
          // ignore
        }
      }

      if (fetchError && fetchError.code !== 'PGRST116') {
        // ignore, may be no row yet or lack of access
      }
      
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


  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      
      // Resolve tenant id to scope upload path
      const { data: authUser } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', authUser?.user?.id as string)
        .single();
      const tenantId = profile?.tenant_id as string | undefined;
      if (!tenantId) throw new Error('No tenant found');

      const filePath = `${tenantId}/logo-${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

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

  // Location management functions
  const fetchLocations = async (tenantId: string) => {
    try {
      console.log('🔍 DEBUG: Fetching locations for tenant:', tenantId);
      console.log('🔍 DEBUG: Current auth user ID:', supabase.auth.getUser());
      console.log('🔍 DEBUG: Tenant context:', tenantId);
      
      const { data, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      console.log('🔍 DEBUG: Query result - data:', data);
      console.log('🔍 DEBUG: Query result - error:', error);

      if (error) throw error;
      setLocations(data || []);
      console.log('🔍 DEBUG: Locations state set to:', data || []);
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      });
    }
  };

  // Load locations when component mounts or tenantId changes
  useEffect(() => {
    const loadLocations = async () => {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', authUser.user.id)
          .single();

        if (profile?.tenant_id) {
          console.log('🔄 useEffect: Loading locations for tenant:', profile.tenant_id);
          fetchLocations(profile.tenant_id);
        }
      }
    };
    
    loadLocations();
  }, []);

  // Load locations when the locations tab is activated
  useEffect(() => {
    if (activeTab === 'locations') {
      const loadLocationsForTab = async () => {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('user_id', authUser.user.id)
            .single();

          if (profile?.tenant_id) {
            console.log('🏢 Locations tab activated: Loading locations for tenant:', profile.tenant_id);
            await fetchLocations(profile.tenant_id);
          }
        }
      };
      
      loadLocationsForTab();
    }
  }, [activeTab]);

  const handleAddLocation = () => {
    console.log('🏪 handleAddLocation called!');
    console.log('🏪 Current locations:', locations);
    console.log('🏪 Current activeTab:', activeTab);
    
    setEditingLocation(null);
    setLocationFormData({
      name: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
      phone: "",
      email: "",
      manager_name: "",
      is_primary: locations.length === 0, // First location is primary by default
      is_active: true
    });
    setIsLocationDialogOpen(true);
    
    console.log('🏪 Location dialog should be opening...');
  };

  const handleEditLocation = (location: StoreLocation) => {
    setEditingLocation(location);
    setLocationFormData(location);
    setIsLocationDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user?.id) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', authUser.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const locationData = {
        name: locationFormData.name || '',
        address_line_1: locationFormData.address_line_1,
        address_line_2: locationFormData.address_line_2,
        city: locationFormData.city,
        state_province: locationFormData.state_province,
        postal_code: locationFormData.postal_code,
        country: locationFormData.country,
        phone: locationFormData.phone,
        email: locationFormData.email,
        manager_name: locationFormData.manager_name,
        is_primary: locationFormData.is_primary || false,
        is_active: locationFormData.is_active !== false
      };

      if (editingLocation) {
        // Update existing location
        const { error } = await supabase
          .from('store_locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Location updated successfully",
        });
      } else {
        // Create new location
        const { error } = await supabase
          .from('store_locations')
          .insert({
            ...locationData,
            tenant_id: profile.tenant_id
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Location created successfully",
        });
      }

      setIsLocationDialogOpen(false);
      await fetchLocations(profile.tenant_id);
    } catch (error) {
      console.error('❌ Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save location",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Location deleted successfully",
      });

      // Refresh locations
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', authUser.user.id)
          .single();

        if (profile?.tenant_id) {
          await fetchLocations(profile.tenant_id);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting location:', error);
      toast({
        title: "Error",
        description: "Failed to delete location",
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
        // Attempt membership repair to grant admin if needed
        try {
          if (user.user.email) {
            await supabase.rpc('reactivate_tenant_membership', {
              tenant_id_param: profile.tenant_id,
              target_email_param: user.user.email,
            });
            // Re-fetch profile role after repair
            const { data: repairedProfile } = await supabase
              .from('profiles')
              .select('tenant_id, role')
              .eq('user_id', user.user.id)
              .single();
            if (repairedProfile?.role === 'admin' || repairedProfile?.role === 'superadmin') {
              // proceed
            } else {
              throw new Error('Insufficient permissions to modify business settings');
            }
          } else {
            throw new Error('Insufficient permissions to modify business settings');
          }
        } catch (e) {
          throw new Error('Insufficient permissions to modify business settings');
        }
      }

      // Prepare the data for update/insert
      const normalizedValues = {
        ...values,
        // If a specific receipt logo isn't set, fall back to the company logo
        receipt_logo_url: values.receipt_logo_url || values.company_logo_url || values.receipt_logo_url,
      };
      const settingsData = {
        ...normalizedValues,
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

  // Debug logging for component render
  console.log('🔄 Rendering BusinessSettingsEnhanced component');
  console.log('🔄 isLoading:', isLoading);
  console.log('🔄 settings:', settings);
  console.log('🔄 activeTab:', activeTab);
  console.log('🔄 locations:', locations);

  const filteredCurrencies = currencySearch
    ? currencies.filter(currency => 
        currency.code && currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
        currency.name && currency.name.toLowerCase().includes(currencySearch.toLowerCase())
      ).filter(currency => currency.code && currency.code.trim() !== '')
    : currencies.filter(currency => currency.code && currency.code.trim() !== '');

  const filteredTimezones = timezoneSearch
    ? timezones.filter(timezone => 
        timezone.label && timezone.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
        timezone.value && timezone.value.toLowerCase().includes(timezoneSearch.toLowerCase())
      ).filter(timezone => timezone.value && timezone.value.trim() !== '')
    : timezones.filter(timezone => timezone.value && timezone.value.trim() !== '');

  const countryOptions = COUNTRY_LIST;

  if (isLoading) {
    console.log('⏳ BusinessSettingsEnhanced is still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading Business Settings...</p>
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
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 h-auto bg-transparent gap-2 p-0">
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
                        name="enable_product_units"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Product Units</FormLabel>
                              <FormDescription>
                                Enable units of measure and conversions
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
                      <FormField
                        control={form.control}
                        name="stock_accounting_method"
                        render={({ field }) => {
                          const isFifo = (field.value || 'FIFO') === 'FIFO';
                          return (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Use FIFO Costing</FormLabel>
                                <FormDescription>
                                  When enabled, Cost of Goods uses FIFO (First-In, First-Out). When off, uses Weighted Average Cost.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={isFifo}
                                  onCheckedChange={(checked) => field.onChange(checked ? 'FIFO' : 'WAC')}
                                />
                              </FormControl>
                            </FormItem>
                          );
                        }}
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

      </div>
    </div>
  );
}