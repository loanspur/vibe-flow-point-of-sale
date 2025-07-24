import { useState, useEffect } from "react";
import BillingManagement from "./BillingManagement";
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
  DollarSign, 
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
  Image,
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
  Printer
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { currencies, stockAccountingMethods, smsProviders, templateOptions } from "@/lib/currencies";
import { timezones } from "@/lib/timezones";
import { countries, popularCountries, getRegions, searchCountries, type Country } from "@/lib/countries";
import { clearCurrencyCache } from "@/lib/currency";
import DomainManagement from '@/components/DomainManagement';

const businessSettingsSchema = z.object({
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
  enable_brands: z.boolean().default(false),
  enable_product_units: z.boolean().default(false),
  enable_warranty: z.boolean().default(false),
  
  enable_fixed_pricing: z.boolean().default(false),
  pos_auto_print_receipt: z.boolean().default(true),
  pos_ask_customer_info: z.boolean().default(false),
  email_enable_notifications: z.boolean().default(true),
  sms_enable_notifications: z.boolean().default(false),
  whatsapp_enable_notifications: z.boolean().default(false),
  sms_provider: z.string().optional(),
  whatsapp_api_key: z.string().optional(),
  whatsapp_phone_number: z.string().optional(),
  invoice_template: z.string().default("standard"),
  receipt_template: z.string().default("standard"),
  quote_template: z.string().default("standard"),
  invoice_number_prefix: z.string().default("INV-"),
  quote_number_prefix: z.string().default("QT-"),
  invoice_terms_conditions: z.string().optional()
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
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"invoice" | "receipt" | "quote">("invoice");
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateEditType, setTemplateEditType] = useState<"invoice" | "receipt" | "quote">("invoice");
  const { toast } = useToast();
  const { formatCurrency } = useApp();

  const form = useForm<z.infer<typeof businessSettingsSchema>>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      company_name: "",
      email: "",
      phone: "",
      website: "",
      currency_code: "USD",
      timezone: "America/New_York",
      default_tax_rate: 0,
      tax_name: "Tax",
      enable_brands: false,
      enable_product_units: false,
      enable_warranty: false,
      
      enable_fixed_pricing: false,
      pos_auto_print_receipt: true,
      pos_ask_customer_info: false,
      email_enable_notifications: true,
      sms_enable_notifications: false,
      whatsapp_enable_notifications: false,
      invoice_template: "standard",
      receipt_template: "standard",
      quote_template: "standard",
      invoice_number_prefix: "INV-",
      quote_number_prefix: "QT-",
      invoice_terms_conditions: ""
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

  const handleLogoUpload = async (file: File) => {
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
      
      // Extract primary color from logo for theme
      // This would typically use a color extraction library
      // For now, we'll use a simple approach
      
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
      console.log('Starting settings save process...');
      console.log('Form values:', values);
      
      // Get the current user's tenant ID
      const { data: user } = await supabase.auth.getUser();
      console.log('Current user:', user?.user?.id);
      
      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('user_id', user.user.id)
        .single();

      console.log('Profile data:', profile);
      console.log('Profile error:', profileError);

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Failed to get user profile: ' + profileError.message);
      }

      if (!profile?.tenant_id) {
        throw new Error('No tenant associated with user');
      }

      // Check if user has permission to modify settings
      if (profile.role !== 'superadmin' && profile.role !== 'admin') {
        throw new Error('Insufficient permissions to modify business settings');
      }

      console.log('Saving settings with tenant_id:', profile.tenant_id);

      const settingsData = {
        ...values,
        tenant_id: profile.tenant_id
      };
      
      // Remove id if it exists to let upsert handle it properly
      if ('id' in settingsData) {
        delete (settingsData as any).id;
      }
      
      console.log('Final settings data to save:', settingsData);

      // First check if settings exist for this tenant
      const { data: existingSettings, error: checkError } = await supabase
        .from('business_settings')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle();

      console.log('Existing settings check:', { existingSettings, checkError });

      const { error, data } = await supabase
        .from('business_settings')
        .upsert(settingsData, {
          onConflict: 'tenant_id'
        })
        .select();

      console.log('Upsert result:', { data, error });

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Database error: ${error.message}${error.details ? ' - ' + error.details : ''}`);
      }

      // Clear currency cache to reflect new settings
      clearCurrencyCache();
      
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
      
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Settings save error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addLocation = async (locationData: Omit<StoreLocation, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    try {
      // Get the current user's tenant ID
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Failed to get user tenant');
      }

      const { data, error } = await supabase
        .from('store_locations')
        .insert({
          name: locationData.name,
          address_line_1: locationData.address_line_1,
          address_line_2: locationData.address_line_2,
          city: locationData.city,
          state_province: locationData.state_province,
          postal_code: locationData.postal_code,
          country: locationData.country,
          phone: locationData.phone,
          email: locationData.email,
          manager_name: locationData.manager_name,
          is_primary: locationData.is_primary,
          is_active: locationData.is_active,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) {
        console.error('Location add error:', error);
        throw error;
      }

      setLocations([...locations, data]);
      setIsLocationDialogOpen(false);
      
      toast({
        title: "Location added",
        description: "Store location has been added successfully.",
      });
    } catch (error) {
      console.error('Add location error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add location. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLocationSubmit = async () => {
    if (!locationForm.name || !locationForm.address_line_1 || !locationForm.city || !locationForm.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name, Address, City, Phone).",
        variant: "destructive",
      });
      return;
    }

    await handleLocationSubmitOrUpdate();
  };

  const editLocation = async (locationId: string, locationData: Partial<StoreLocation>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Failed to get user tenant');
      }

      const { error } = await supabase
        .from('store_locations')
        .update({
          name: locationData.name,
          address_line_1: locationData.address_line_1,
          address_line_2: locationData.address_line_2,
          city: locationData.city,
          state_province: locationData.state_province,
          postal_code: locationData.postal_code,
          country: locationData.country,
          phone: locationData.phone,
          email: locationData.email,
          manager_name: locationData.manager_name,
          is_primary: locationData.is_primary,
          is_active: locationData.is_active,
        })
        .eq('id', locationId)
        .eq('tenant_id', profile.tenant_id);

      if (error) {
        console.error('Location update error:', error);
        throw error;
      }

      // Refresh locations
      await fetchLocations();
      setIsEditingLocation(false);
      setLocationToEdit(null);
      resetLocationForm();
      
      toast({
        title: "Location updated",
        description: "Store location has been updated successfully.",
      });
    } catch (error) {
      console.error('Edit location error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update location. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteLocation = async (locationId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Failed to get user tenant');
      }

      const { error } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', locationId)
        .eq('tenant_id', profile.tenant_id);

      if (error) {
        console.error('Location delete error:', error);
        throw error;
      }

      // Refresh locations
      await fetchLocations();
      
      toast({
        title: "Location deleted",
        description: "Store location has been deleted successfully.",
      });
    } catch (error) {
      console.error('Delete location error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete location. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditLocation = (location: StoreLocation) => {
    setLocationToEdit(location);
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
    setIsEditingLocation(true);
  };

  const handleViewLocation = (location: StoreLocation) => {
    setLocationToView(location);
    setIsViewingLocation(true);
  };

  const handleLocationSubmitOrUpdate = async () => {
    if (!locationForm.name || !locationForm.address_line_1 || !locationForm.city || !locationForm.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name, Address, City, Phone).",
        variant: "destructive",
      });
      return;
    }

    if (isEditingLocation && locationToEdit) {
      await editLocation(locationToEdit.id, locationForm);
    } else {
      await addLocation(locationForm);
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

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    form.setValue('currency_code', country.currency);
    form.setValue('timezone', country.timezone);
  };

  const filteredCountries = currencySearch 
    ? searchCountries(currencySearch)
    : countries;

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Business Settings
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => form.reset()}
                className="hover:bg-muted/80 border-dashed"
              >
                Reset Changes
              </Button>
              <Button 
                onClick={() => onSubmit(form.getValues())} 
                disabled={isSaving}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Enhanced Navigation */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-xl p-1 shadow-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-10 h-auto bg-transparent gap-1 p-1">
                <TabsTrigger value="company" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Building className="h-4 w-4 mr-2" />
                  Company
                </TabsTrigger>
                <TabsTrigger value="locations" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <MapIcon className="h-4 w-4 mr-2" />
                  Locations
                </TabsTrigger>
                <TabsTrigger value="branding" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Palette className="h-4 w-4 mr-2" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="products" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Package className="h-4 w-4 mr-2" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="sales" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="templates" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Layout className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="domains" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Globe className="h-4 w-4 mr-2" />
                  Domains
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Company Tab */}
                    <TabsContent value="company" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Building className="h-5 w-5 text-primary" />
                              Business Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="company_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Company Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter your company name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Business Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" placeholder="business@company.com" />
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
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="+1 (555) 123-4567" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="website"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Website</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="https://yourwebsite.com" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <MapPin className="h-5 w-5 text-primary" />
                              Business Address
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="address_line_1"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address Line 1</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Street address" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="address_line_2"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address Line 2 (Optional)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Apartment, suite, etc." />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="City" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="state_province"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>State/Province</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="State" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="postal_code"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Postal Code</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="12345" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Country" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                       </div>

                       <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                         <CardHeader className="pb-4">
                           <CardTitle className="flex items-center gap-2 text-xl">
                             <Globe className="h-5 w-5 text-primary" />
                             Regional Settings
                           </CardTitle>
                           <CardDescription>
                             Set your business location, currency, and timezone preferences
                           </CardDescription>
                         </CardHeader>
                         <CardContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField
                               control={form.control}
                               name="currency_code"
                               render={({ field }) => (
                                 <FormItem>
                                   <FormLabel className="flex items-center gap-2">
                                     <DollarSign className="h-4 w-4" />
                                     Currency
                                   </FormLabel>
                                   <Select onValueChange={field.onChange} value={field.value}>
                                     <FormControl>
                                       <SelectTrigger className="bg-background border hover:border-primary/50 transition-colors">
                                         <SelectValue placeholder="Select currency" />
                                       </SelectTrigger>
                                     </FormControl>
                                     <SelectContent className="bg-background border shadow-lg max-h-[300px] overflow-y-auto z-50">
                                       <div className="p-3 border-b bg-muted/20">
                                         <Input
                                           placeholder="Search currencies..."
                                           value={currencySearch}
                                           onChange={(e) => setCurrencySearch(e.target.value)}
                                           className="h-8 text-sm"
                                         />
                                        </div>

                                        {/* All currencies in alphabetical order */}
                                        {currencies
                                          .filter(currency => !currencySearch || 
                                            currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                            currency.name.toLowerCase().includes(currencySearch.toLowerCase())
                                          )
                                          .sort((a, b) => a.name.localeCompare(b.name))
                                          .map(currency => (
                                            <SelectItem 
                                              key={currency.code} 
                                              value={currency.code}
                                              className="py-2 hover:bg-accent/50"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm w-6">{currency.symbol}</span>
                                                <span className="font-medium">{currency.code}</span>
                                                <span className="text-muted-foreground">—</span>
                                                <span className="text-sm">{currency.name}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                       </SelectContent>
                                   </Select>
                                   <FormMessage />
                                   {field.value && (
                                     <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                       <p className="text-sm">
                                         Selected: <strong>
                                           {currencies.find(c => c.code === field.value)?.symbol} {currencies.find(c => c.code === field.value)?.name} ({field.value})
                                         </strong>
                                       </p>
                                     </div>
                                   )}
                                 </FormItem>
                               )}
                             />
                             
                             <FormField
                               control={form.control}
                               name="timezone"
                               render={({ field }) => (
                                 <FormItem>
                                   <FormLabel className="flex items-center gap-2">
                                     <Clock className="h-4 w-4" />
                                     Timezone
                                   </FormLabel>
                                   <Select onValueChange={field.onChange} value={field.value}>
                                     <FormControl>
                                       <SelectTrigger className="bg-background border hover:border-primary/50 transition-colors">
                                         <SelectValue placeholder="Select timezone" />
                                       </SelectTrigger>
                                     </FormControl>
                                     <SelectContent className="bg-background border shadow-lg max-h-[300px] overflow-y-auto z-50">
                                       <div className="p-3 border-b bg-muted/20">
                                         <Input
                                           placeholder="Search timezones..."
                                           value={timezoneSearch}
                                           onChange={(e) => setTimezoneSearch(e.target.value)}
                                           className="h-8 text-sm"
                                         />
                                       </div>

                                       {/* Popular timezones */}
                                       <div className="p-2 border-b bg-muted/30">
                                         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Popular</p>
                                       </div>
                                       {timezones
                                         .filter(tz => [
                                           'UTC',
                                           'America/New_York',
                                           'America/Chicago', 
                                           'America/Denver',
                                           'America/Los_Angeles',
                                           'Europe/London',
                                           'Europe/Paris',
                                           'Europe/Berlin',
                                           'Asia/Tokyo',
                                           'Asia/Shanghai',
                                           'Asia/Mumbai',
                                           'Australia/Sydney'
                                         ].includes(tz.value))
                                         .filter(tz => !timezoneSearch || tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()))
                                         .map(tz => (
                                           <SelectItem 
                                             key={tz.value} 
                                             value={tz.value}
                                             className="py-2 hover:bg-accent/50"
                                           >
                                             <div className="text-sm">
                                               <div className="font-medium">{tz.label}</div>
                                             </div>
                                           </SelectItem>
                                         ))}
                                       
                                       {/* All timezones by region */}
                                       {['Universal', 'North America', 'South America', 'Central America', 'Caribbean', 'Europe', 'Middle East', 'Asia', 'Africa', 'Oceania', 'Atlantic', 'Indian Ocean'].map(region => {
                                         const regionTimezones = timezones
                                           .filter(tz => tz.region === region)
                                           .filter(tz => !timezoneSearch || tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()));
                                         if (regionTimezones.length === 0) return null;
                                         
                                         return (
                                           <div key={region}>
                                             <div className="p-2 border-b bg-muted/30">
                                               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{region}</p>
                                             </div>
                                             {regionTimezones.map(tz => (
                                               <SelectItem 
                                                 key={tz.value} 
                                                 value={tz.value}
                                                 className="py-2 hover:bg-accent/50"
                                               >
                                                 <div className="text-sm">
                                                   <div className="font-medium">{tz.label}</div>
                                                 </div>
                                               </SelectItem>
                                             ))}
                                           </div>
                                         );
                                       })}
                                     </SelectContent>
                                   </Select>
                                   <FormMessage />
                                   {field.value && (
                                     <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                       <p className="text-sm">
                                         Selected: <strong>
                                           {timezones.find(tz => tz.value === field.value)?.label}
                                         </strong>
                                       </p>
                                     </div>
                                   )}
                                 </FormItem>
                               )}
                             />
                           </div>

                           <Separator className="my-6" />

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField
                               control={form.control}
                               name="default_tax_rate"
                               render={({ field }) => (
                                 <FormItem>
                                   <FormLabel>Default Tax Rate (%)</FormLabel>
                                   <FormControl>
                                     <Input 
                                       type="number" 
                                       step="0.01"
                                       min="0"
                                       max="100"
                                       {...field} 
                                       onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                       placeholder="0.00" 
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
                                   <FormLabel>Tax Name</FormLabel>
                                   <FormControl>
                                     <Input {...field} placeholder="VAT, GST, Sales Tax, etc." />
                                   </FormControl>
                                   <FormMessage />
                                 </FormItem>
                               )}
                             />
                           </div>
                         </CardContent>
                       </Card>

                     </TabsContent>

                    {/* Locations Tab */}
                    <TabsContent value="locations" className="space-y-6 mt-6">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Store className="h-5 w-5 text-primary" />
                              Store Locations
                            </CardTitle>
                                <Dialog open={isLocationDialogOpen || isEditingLocation} onOpenChange={(open) => {
                                  setIsLocationDialogOpen(open);
                                  setIsEditingLocation(open);
                                  if (!open) {
                                    resetLocationForm();
                                    setLocationToEdit(null);
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Location
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        {isEditingLocation ? 'Edit Store Location' : 'Add Store Location'}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <Input 
                                        placeholder="Location Name *" 
                                        value={locationForm.name}
                                        onChange={(e) => setLocationForm(prev => ({...prev, name: e.target.value}))}
                                      />
                                      <Input 
                                        placeholder="Address Line 1 *" 
                                        value={locationForm.address_line_1}
                                        onChange={(e) => setLocationForm(prev => ({...prev, address_line_1: e.target.value}))}
                                      />
                                      <Input 
                                        placeholder="Address Line 2" 
                                        value={locationForm.address_line_2}
                                        onChange={(e) => setLocationForm(prev => ({...prev, address_line_2: e.target.value}))}
                                      />
                                      <div className="grid grid-cols-2 gap-4">
                                        <Input 
                                          placeholder="City *" 
                                          value={locationForm.city}
                                          onChange={(e) => setLocationForm(prev => ({...prev, city: e.target.value}))}
                                        />
                                        <Input 
                                          placeholder="State/Province" 
                                          value={locationForm.state_province}
                                          onChange={(e) => setLocationForm(prev => ({...prev, state_province: e.target.value}))}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <Input 
                                          placeholder="Postal Code" 
                                          value={locationForm.postal_code}
                                          onChange={(e) => setLocationForm(prev => ({...prev, postal_code: e.target.value}))}
                                        />
                                        <Input 
                                          placeholder="Country" 
                                          value={locationForm.country}
                                          onChange={(e) => setLocationForm(prev => ({...prev, country: e.target.value}))}
                                        />
                                      </div>
                                      <Input 
                                        placeholder="Phone Number *" 
                                        value={locationForm.phone}
                                        onChange={(e) => setLocationForm(prev => ({...prev, phone: e.target.value}))}
                                      />
                                      <Input 
                                        placeholder="Email" 
                                        value={locationForm.email}
                                        onChange={(e) => setLocationForm(prev => ({...prev, email: e.target.value}))}
                                      />
                                      <Input 
                                        placeholder="Manager Name" 
                                        value={locationForm.manager_name}
                                        onChange={(e) => setLocationForm(prev => ({...prev, manager_name: e.target.value}))}
                                      />
                                      <div className="flex items-center space-x-2">
                                        <Switch 
                                          checked={locationForm.is_primary}
                                          onCheckedChange={(checked) => setLocationForm(prev => ({...prev, is_primary: checked}))}
                                        />
                                        <Label>Primary Location</Label>
                                      </div>
                                      <div className="flex gap-2">
                                         <Button variant="outline" onClick={() => {
                                           setIsLocationDialogOpen(false);
                                           setIsEditingLocation(false);
                                           resetLocationForm();
                                           setLocationToEdit(null);
                                         }}>
                                           Cancel
                                         </Button>
                                         <Button onClick={handleLocationSubmit}>
                                           {isEditingLocation ? 'Update Location' : 'Add Location'}
                                         </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                {/* View Location Dialog */}
                                <Dialog open={isViewingLocation} onOpenChange={setIsViewingLocation}>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Location Details</DialogTitle>
                                    </DialogHeader>
                                    {locationToView && (
                                      <div className="space-y-4">
                                        <div>
                                          <Label className="text-sm font-medium">Location Name</Label>
                                          <p className="text-sm text-muted-foreground">{locationToView.name}</p>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">Address</Label>
                                          <p className="text-sm text-muted-foreground">
                                            {locationToView.address_line_1}
                                            {locationToView.address_line_2 && <><br />{locationToView.address_line_2}</>}
                                            <br />
                                            {locationToView.city}, {locationToView.state_province} {locationToView.postal_code}
                                            <br />
                                            {locationToView.country}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label className="text-sm font-medium">Phone</Label>
                                            <p className="text-sm text-muted-foreground">{locationToView.phone}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">Email</Label>
                                            <p className="text-sm text-muted-foreground">{locationToView.email || 'Not provided'}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">Manager</Label>
                                          <p className="text-sm text-muted-foreground">{locationToView.manager_name || 'Not assigned'}</p>
                                        </div>
                                        <div className="flex gap-4">
                                          <div className="flex items-center gap-2">
                                            <Label className="text-sm font-medium">Status:</Label>
                                            <Badge variant={locationToView.is_active ? "default" : "secondary"}>
                                              {locationToView.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                          </div>
                                          {locationToView.is_primary && (
                                            <Badge variant="outline">Primary Location</Badge>
                                          )}
                                        </div>
                                        <div className="flex gap-2 pt-4">
                                          <Button variant="outline" onClick={() => setIsViewingLocation(false)}>
                                            Close
                                          </Button>
                                          <Button onClick={() => {
                                            setIsViewingLocation(false);
                                            handleEditLocation(locationToView);
                                          }}>
                                            Edit Location
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {locations.map((location) => (
                              <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {location.name}
                                    {location.is_primary && (
                                      <Badge variant="secondary">Main</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {`${location.address_line_1}${location.address_line_2 ? ', ' + location.address_line_2 : ''}, ${location.city}, ${location.state_province} ${location.postal_code}, ${location.country}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{location.phone}</div>
                                </div>
                                 <div className="flex items-center gap-2">
                                   <Button variant="outline" size="sm" onClick={() => handleViewLocation(location)}>
                                     <Eye className="h-4 w-4" />
                                   </Button>
                                   <Button variant="outline" size="sm" onClick={() => handleEditLocation(location)}>
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   <Button 
                                     variant="outline" 
                                     size="sm" 
                                     onClick={() => {
                                       if (confirm('Are you sure you want to delete this location?')) {
                                         deleteLocation(location.id);
                                       }
                                     }}
                                   >
                                     <Trash2 className="h-4 w-4" />
                                   </Button>
                                 </div>
                              </div>
                            ))}
                            {locations.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                No locations added yet. Click "Add Location" to get started.
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Branding Tab */}
                    <TabsContent value="branding" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Image className="h-5 w-5 text-primary" />
                              Company Logo
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-col items-center space-y-4">
                              {logoPreview ? (
                                <div className="relative">
                                  <img
                                    src={logoPreview}
                                    alt="Company Logo"
                                    className="w-32 h-32 object-contain border rounded-lg"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="absolute -top-2 -right-2"
                                    onClick={() => {
                                      setLogoPreview("");
                                      form.setValue('company_logo_url', '');
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                                  <Image className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label htmlFor="logo-upload" className="cursor-pointer">
                                  <Button asChild variant="outline">
                                    <span>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Logo
                                    </span>
                                  </Button>
                                </Label>
                                <input
                                  id="logo-upload"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleLogoUpload(file);
                                    }
                                  }}
                                />
                                <p className="text-xs text-muted-foreground text-center">
                                  Recommended: 200x200px, PNG or JPG
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Palette className="h-5 w-5 text-primary" />
                              Theme Colors
                            </CardTitle>
                            <CardDescription>Colors will be extracted from your logo automatically</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Primary Color</Label>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-8 h-8 rounded border"
                                    style={{ backgroundColor: themeColors.primary }}
                                  />
                                  <Input
                                    type="color"
                                    value={themeColors.primary}
                                    onChange={(e) => setThemeColors(prev => ({ ...prev, primary: e.target.value }))}
                                    className="w-16 h-8 p-0 border-0"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Secondary Color</Label>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-8 h-8 rounded border"
                                    style={{ backgroundColor: themeColors.secondary }}
                                  />
                                  <Input
                                    type="color"
                                    value={themeColors.secondary}
                                    onChange={(e) => setThemeColors(prev => ({ ...prev, secondary: e.target.value }))}
                                    className="w-16 h-8 p-0 border-0"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Accent Color</Label>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-8 h-8 rounded border"
                                    style={{ backgroundColor: themeColors.accent }}
                                  />
                                  <Input
                                    type="color"
                                    value={themeColors.accent}
                                    onChange={(e) => setThemeColors(prev => ({ ...prev, accent: e.target.value }))}
                                    className="w-16 h-8 p-0 border-0"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Products Tab */}
                    <TabsContent value="products" className="space-y-6 mt-6">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Package className="h-5 w-5 text-primary" />
                            Product Features
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="enable_brands"
                                render={({ field }) => (
                                  <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                    <div>
                                      <FormLabel className="font-medium">Enable Brands</FormLabel>
                                      <FormDescription>Allow products to have brand associations</FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="enable_product_units"
                                render={({ field }) => (
                                  <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                    <div>
                                      <FormLabel className="font-medium">Product Units</FormLabel>
                                      <FormDescription>Enable unit of measure for products (kg, lbs, pcs, etc.)</FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="enable_warranty"
                                render={({ field }) => (
                                  <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                    <div>
                                      <FormLabel className="font-medium">Warranty Management</FormLabel>
                                      <FormDescription>Track product warranties and support</FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Sales Tab */}
                    <TabsContent value="sales" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <ShoppingCart className="h-5 w-5 text-primary" />
                              Sales Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="enable_fixed_pricing"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                  <div>
                                    <FormLabel className="font-medium">Fixed Pricing</FormLabel>
                                    <FormDescription>Prevent price modifications during sales</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <div className="space-y-4 pt-4">
                              <h4 className="font-medium">Tax Settings</h4>
                              <FormField
                                control={form.control}
                                name="default_tax_rate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Default Tax Rate (%)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                                    <FormLabel>Tax Display Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Sales Tax, VAT, GST, etc." />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Receipt className="h-5 w-5 text-primary" />
                              POS Behavior
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="pos_auto_print_receipt"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                  <div>
                                    <FormLabel className="font-medium">Auto Print Receipts</FormLabel>
                                    <FormDescription>Automatically print after each sale</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="pos_ask_customer_info"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                  <div>
                                    <FormLabel className="font-medium">Ask for Customer Info</FormLabel>
                                    <FormDescription>Prompt for customer details during checkout</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Notifications Tab */}
                    <TabsContent value="notifications" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <MailIcon className="h-5 w-5 text-primary" />
                              Email Notifications
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="email_enable_notifications"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                  <FormLabel>Enable Email</FormLabel>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Smartphone className="h-5 w-5 text-primary" />
                              SMS Notifications
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="sms_enable_notifications"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                  <FormLabel>Enable SMS</FormLabel>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="sms_provider"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SMS Provider</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {smsProviders.map(provider => (
                                        <SelectItem key={provider.value} value={provider.value}>
                                          {provider.label}
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

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <MessageSquare className="h-5 w-5 text-primary" />
                              WhatsApp
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="whatsapp_enable_notifications"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                  <FormLabel>Enable WhatsApp</FormLabel>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="whatsapp_api_key"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>API Key</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter WhatsApp API key" type="password" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="whatsapp_phone_number"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Business Phone</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="+1234567890" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Templates Tab */}
                    <TabsContent value="templates" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <FileText className="h-5 w-5 text-primary" />
                              Invoice Template
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="invoice_template"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Template Style</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {templateOptions.map(template => (
                                        <SelectItem key={template.value} value={template.value}>
                                          {template.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => {
                                  setPreviewType("invoice");
                                  setIsPreviewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                              <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm"
                                onClick={() => {
                                  setTemplateEditType("invoice");
                                  setIsEditingTemplate(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Receipt className="h-5 w-5 text-primary" />
                              Receipt Template
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="receipt_template"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Template Style</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {templateOptions.map(template => (
                                        <SelectItem key={template.value} value={template.value}>
                                          {template.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => {
                                  setPreviewType("receipt");
                                  setIsPreviewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                              <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm"
                                onClick={() => {
                                  setTemplateEditType("receipt");
                                  setIsEditingTemplate(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <FileText className="h-5 w-5 text-primary" />
                              Quote Template
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="quote_template"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Template Style</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {templateOptions.map(template => (
                                        <SelectItem key={template.value} value={template.value}>
                                          {template.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => {
                                  setPreviewType("quote");
                                  setIsPreviewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                              <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm"
                                onClick={() => {
                                  setTemplateEditType("quote");
                                  setIsEditingTemplate(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Domains Tab */}
                    <TabsContent value="domains" className="space-y-6 mt-6">
                      <DomainManagement />
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="space-y-6 mt-6">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Shield className="h-5 w-5 text-primary" />
                            Security Settings
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-muted-foreground">
                            Security settings configuration will be available soon.
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Billing Tab */}
                    <TabsContent value="billing" className="space-y-6 mt-6">
                      <BillingManagement />
                    </TabsContent>

                  </form>
                </Form>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewType === "invoice" ? "Invoice" : previewType === "receipt" ? "Receipt" : "Quote"} Preview
              <Badge variant="secondary" className="ml-2">
                {form.watch(`${previewType}_template`) || "Standard"} Template
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-8 shadow-sm" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {/* Header with Logo */}
              <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div className="flex items-start gap-6">
                  {settings?.company_logo_url && (
                    <div className="flex-shrink-0">
                      <img 
                        src={settings.company_logo_url} 
                        alt="Company Logo" 
                        className="h-16 w-auto object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <h1 className="text-4xl font-bold text-primary mb-2 uppercase tracking-wide">
                      {previewType === "invoice" ? "Invoice" : previewType === "receipt" ? "Receipt" : "Quotation"}
                    </h1>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-gray-800">
                        #{previewType === "invoice" ? settings?.invoice_number_prefix || "INV-" : previewType === "receipt" ? "RCP-" : settings?.quote_number_prefix || "QT-"}
                        {new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}-001
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: <span className="font-medium text-green-600">
                          {previewType === "invoice" ? "Sent" : previewType === "receipt" ? "Paid" : "Draft"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {settings?.company_name || "Your Business Name"}
                  </h2>
                  <div className="text-gray-600 space-y-1 text-sm">
                    <p className="font-medium">{settings?.address_line_1 || "123 Business Street"}</p>
                    {settings?.address_line_2 && <p>{settings.address_line_2}</p>}
                    <p>{settings?.city || "City"}, {settings?.state_province || "State"} {settings?.postal_code || "12345"}</p>
                    <p>{settings?.country || "United States"}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="flex items-center justify-end gap-1">
                        <Phone className="h-3 w-3" />
                        {settings?.phone || "(555) 123-4567"}
                      </p>
                      <p className="flex items-center justify-end gap-1">
                        <Mail className="h-3 w-3" />
                        {settings?.email || "info@business.com"}
                      </p>
                      {settings?.website && (
                        <p className="flex items-center justify-end gap-1">
                          <Globe className="h-3 w-3" />
                          {settings.website}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To Section */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide border-b border-gray-200 pb-2">
                    {previewType === "invoice" ? "Bill To:" : previewType === "receipt" ? "Customer:" : "Quote For:"}
                  </h3>
                  <div className="text-gray-700 space-y-1">
                    <p className="font-semibold text-lg">Sample Customer</p>
                    <p>456 Customer Avenue</p>
                    <p>Customer City, CS 67890</p>
                    <p>United States</p>
                    <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
                      <p className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        customer@email.com
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        (555) 987-6543
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Date:</span>
                        <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                      </div>
                      {previewType === "invoice" && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Due Date:</span>
                          <p className="font-semibold text-orange-600">
                            {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {previewType === "quote" && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Valid Until:</span>
                          <p className="font-semibold text-blue-600">
                            {new Date(Date.now() + (settings?.quote_validity_days || 30) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-600">Currency:</span>
                        <p className="font-semibold">{settings?.currency_code || "USD"}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Payment Terms:</span>
                        <p className="font-semibold">Net 30</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="text-left py-4 px-4 font-semibold">Item Description</th>
                      <th className="text-center py-4 px-4 font-semibold">Qty</th>
                      <th className="text-right py-4 px-4 font-semibold">Unit Price</th>
                      <th className="text-right py-4 px-4 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">Premium Product Suite</p>
                          <p className="text-sm text-gray-600">Advanced solution with comprehensive features</p>
                          <p className="text-xs text-gray-500 mt-1">SKU: PRD-001</p>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-900 font-medium">2</td>
                      <td className="text-right py-4 px-4 text-gray-900 font-medium">
                        {formatCurrency ? formatCurrency(50) : `${settings?.currency_symbol || '$'}50.00`}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-900 font-semibold">
                        {formatCurrency ? formatCurrency(100) : `${settings?.currency_symbol || '$'}100.00`}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">Professional Services</p>
                          <p className="text-sm text-gray-600">Expert consultation and implementation</p>
                          <p className="text-xs text-gray-500 mt-1">SKU: SRV-002</p>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4 text-gray-900 font-medium">1</td>
                      <td className="text-right py-4 px-4 text-gray-900 font-medium">
                        {formatCurrency ? formatCurrency(75) : `${settings?.currency_symbol || '$'}75.00`}
                      </td>
                      <td className="text-right py-4 px-4 text-gray-900 font-semibold">
                        {formatCurrency ? formatCurrency(75) : `${settings?.currency_symbol || '$'}75.00`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-80 bg-gray-50 p-6 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency ? formatCurrency(175) : `${settings?.currency_symbol || '$'}175.00`}
                      </span>
                    </div>
                    {settings?.default_tax_rate && settings.default_tax_rate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{settings.tax_name || "Tax"} ({settings.default_tax_rate}%):</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency ? formatCurrency(175 * (settings.default_tax_rate / 100)) : `${settings?.currency_symbol || '$'}${(175 * (settings.default_tax_rate / 100)).toFixed(2)}`}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-300 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency ? formatCurrency(settings?.default_tax_rate ? 175 * (1 + (settings.default_tax_rate / 100)) : 175) : `${settings?.currency_symbol || '$'}${settings?.default_tax_rate ? (175 * (1 + (settings.default_tax_rate / 100))).toFixed(2) : "175.00"}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-6 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Payment Terms</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>
                        {previewType === "invoice" 
                          ? "Payment is due within 30 days of invoice date. Late payments may incur additional charges."
                          : previewType === "receipt"
                          ? "Thank you for your business! This receipt serves as proof of payment."
                          : `This quote is valid for ${settings?.quote_validity_days || 30} days from the date above. Terms and conditions apply.`
                        }
                      </p>
                      {previewType !== "receipt" && (
                        <p className="font-medium">
                          Accepted Payment Methods: Cash, Credit Card, Bank Transfer
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Additional Notes</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>
                        Thank you for choosing {settings?.company_name || "our business"}. 
                        We appreciate your continued support and look forward to serving you again.
                      </p>
                      {settings?.invoice_terms_conditions && previewType === "invoice" && (
                        <p className="italic">{settings.invoice_terms_conditions}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Branded Footer */}
              <div className="mt-8 pt-4 border-t border-primary/20 text-center">
                <p className="text-xs text-gray-500">
                  Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
                {settings?.website && (
                  <p className="text-xs text-primary mt-1">
                    Visit us at {settings.website}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                Template: {form.watch(`${previewType}_template`) || "Standard"}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => {
                  const printContent = document.querySelector('.bg-white.border.rounded-lg.p-8.shadow-sm');
                  if (printContent) {
                    const printWindow = window.open('', '_blank');
                    printWindow?.document.write(`
                      <html>
                        <head>
                          <title>${previewType === "invoice" ? "Invoice" : previewType === "receipt" ? "Receipt" : "Quote"} Preview</title>
                          <style>
                            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; }
                            @media print { body { margin: 0; padding: 10px; } }
                          </style>
                        </head>
                        <body>${printContent.outerHTML}</body>
                      </html>
                    `);
                    printWindow?.document.close();
                    printWindow?.print();
                  }
                }}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button onClick={() => {
                  const element = document.querySelector('.bg-white.border.rounded-lg.p-8.shadow-sm');
                  if (element) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    // This would require html2canvas library for full implementation
                    toast({
                      title: "Download Feature",
                      description: "Download as PDF feature would be implemented with additional libraries.",
                    });
                  }
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Edit Dialog */}
      <Dialog open={isEditingTemplate} onOpenChange={setIsEditingTemplate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit {templateEditType === "invoice" ? "Invoice" : templateEditType === "receipt" ? "Receipt" : "Quote"} Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Style</Label>
                <Select 
                  value={form.watch(`${templateEditType}_template`) || "standard"}
                  onValueChange={(value) => form.setValue(`${templateEditType}_template`, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map(template => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number Prefix</Label>
                <Input 
                  value={templateEditType === "invoice" ? (form.watch("invoice_number_prefix") as string) || "INV-" : (form.watch("quote_number_prefix") as string) || "QT-"}
                  onChange={(e) => form.setValue(templateEditType === "invoice" ? "invoice_number_prefix" : "quote_number_prefix", e.target.value)}
                  placeholder={templateEditType === "invoice" ? "INV-" : "QT-"}
                />
              </div>
            </div>
            
            {templateEditType === "invoice" && (
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea 
                  value={(form.watch("invoice_terms_conditions") as string) || ""}
                  onChange={(e) => form.setValue("invoice_terms_conditions", e.target.value)}
                  placeholder="Enter terms and conditions for invoices..."
                  rows={4}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditingTemplate(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Template Updated",
                  description: `${templateEditType} template settings have been updated.`,
                });
                setIsEditingTemplate(false);
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}