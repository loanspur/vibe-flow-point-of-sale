import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { currencies, stockAccountingMethods, smsProviders, templateOptions } from "@/lib/currencies";
import { timezones } from "@/lib/timezones";

const businessSettingsSchema = z.object({
  company_name: z.string().optional(),
  company_logo_url: z.string().optional(),
  business_registration_number: z.string().optional(),
  tax_identification_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  currency_code: z.string().default("USD"),
  currency_symbol: z.string().default("$"),
  timezone: z.string().default("America/New_York"),
  date_format: z.string().default("MM/DD/YYYY"),
  default_tax_rate: z.number().min(0).max(100).default(0),
  tax_name: z.string().default("Tax"),
  tax_inclusive: z.boolean().default(false),
  receipt_header: z.string().optional(),
  receipt_footer: z.string().optional(),
  receipt_logo_url: z.string().optional(),
  print_customer_copy: z.boolean().default(true),
  print_merchant_copy: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
  low_stock_alerts: z.boolean().default(true),
  daily_reports: z.boolean().default(true),
  session_timeout_minutes: z.number().min(5).max(480).default(60),
  require_password_change: z.boolean().default(false),
  password_expiry_days: z.number().min(30).max(365).default(90),
  enable_online_orders: z.boolean().default(false),
  enable_loyalty_program: z.boolean().default(false),
  enable_gift_cards: z.boolean().default(false),
  // Enhanced fields
  stock_accounting_method: z.string().default("FIFO"),
  enable_combo_products: z.boolean().default(false),
  enable_retail_pricing: z.boolean().default(true),
  enable_wholesale_pricing: z.boolean().default(false),
  default_markup_percentage: z.number().min(0).max(1000).default(0),
  auto_generate_sku: z.boolean().default(true),
  enable_barcode_scanning: z.boolean().default(true),
  enable_negative_stock: z.boolean().default(false),
  low_stock_threshold: z.number().min(0).default(10),
  enable_multi_location: z.boolean().default(false),
  pos_auto_print_receipt: z.boolean().default(true),
  pos_ask_customer_info: z.boolean().default(false),
  pos_enable_discounts: z.boolean().default(true),
  pos_max_discount_percent: z.number().min(0).max(100).default(100),
  pos_enable_tips: z.boolean().default(false),
  pos_default_payment_method: z.string().default("cash"),
  purchase_auto_receive: z.boolean().default(false),
  purchase_enable_partial_receive: z.boolean().default(true),
  purchase_default_tax_rate: z.number().min(0).max(100).default(0),
  email_smtp_host: z.string().optional(),
  email_smtp_port: z.number().default(587),
  email_smtp_username: z.string().optional(),
  email_smtp_password: z.string().optional(),
  email_from_address: z.string().email().optional().or(z.literal("")),
  email_from_name: z.string().optional(),
  email_enable_ssl: z.boolean().default(true),
  whatsapp_api_url: z.string().optional(),
  whatsapp_api_key: z.string().optional(),
  whatsapp_phone_number: z.string().optional(),
  whatsapp_enable_notifications: z.boolean().default(false),
  sms_provider: z.string().optional(),
  sms_api_key: z.string().optional(),
  sms_sender_id: z.string().optional(),
  sms_enable_notifications: z.boolean().default(false),
  invoice_template: z.string().default("standard"),
  invoice_auto_number: z.boolean().default(true),
  invoice_number_prefix: z.string().default("INV-"),
  invoice_terms_conditions: z.string().optional(),
  quote_template: z.string().default("standard"),
  quote_auto_number: z.boolean().default(true),
  quote_number_prefix: z.string().default("QT-"),
  quote_validity_days: z.number().min(1).default(30),
  delivery_note_template: z.string().default("standard"),
  delivery_note_auto_number: z.boolean().default(true),
  delivery_note_prefix: z.string().default("DN-"),
  enable_user_roles: z.boolean().default(true),
  max_login_attempts: z.number().min(1).default(3),
  account_lockout_duration: z.number().min(1).default(15),
});

const paymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "card", "digital", "bank_transfer", "other"]),
  requires_reference: z.boolean().default(false),
});

const storeLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default("United States"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  manager_name: z.string().optional(),
  is_primary: z.boolean().default(false),
});

interface BusinessSettings {
  id?: string;
  tenant_id?: string;
  [key: string]: any;
}

interface PaymentMethod {
  id?: string;
  name: string;
  type: "cash" | "card" | "digital" | "bank_transfer" | "other";
  is_active: boolean;
  requires_reference: boolean;
  display_order: number;
}

interface StoreLocation {
  id?: string;
  name: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  is_active: boolean;
  is_primary: boolean;
}

interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export function BusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "10:00", close: "16:00", closed: false },
    sunday: { open: "12:00", close: "16:00", closed: true },
  });
  const [activeTab, setActiveTab] = useState("company");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof businessSettingsSchema>>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      currency_code: "USD",
      currency_symbol: "$",
      timezone: "America/New_York",
      date_format: "MM/DD/YYYY",
      default_tax_rate: 0,
      tax_name: "Tax",
      tax_inclusive: false,
      print_customer_copy: true,
      print_merchant_copy: true,
      email_notifications: true,
      low_stock_alerts: true,
      daily_reports: true,
      session_timeout_minutes: 60,
      require_password_change: false,
      password_expiry_days: 90,
      enable_online_orders: false,
      enable_loyalty_program: false,
      enable_gift_cards: false,
      stock_accounting_method: "FIFO",
      enable_combo_products: false,
      enable_retail_pricing: true,
      enable_wholesale_pricing: false,
      default_markup_percentage: 0,
      auto_generate_sku: true,
      enable_barcode_scanning: true,
      enable_negative_stock: false,
      low_stock_threshold: 10,
      enable_multi_location: false,
      pos_auto_print_receipt: true,
      pos_ask_customer_info: false,
      pos_enable_discounts: true,
      pos_max_discount_percent: 100,
      pos_enable_tips: false,
      pos_default_payment_method: "cash",
      purchase_auto_receive: false,
      purchase_enable_partial_receive: true,
      purchase_default_tax_rate: 0,
      email_smtp_port: 587,
      email_enable_ssl: true,
      whatsapp_enable_notifications: false,
      sms_enable_notifications: false,
      invoice_template: "standard",
      invoice_auto_number: true,
      invoice_number_prefix: "INV-",
      quote_template: "standard",
      quote_auto_number: true,
      quote_number_prefix: "QT-",
      quote_validity_days: 30,
      delivery_note_template: "standard",
      delivery_note_auto_number: true,
      delivery_note_prefix: "DN-",
      enable_user_roles: true,
      max_login_attempts: 3,
      account_lockout_duration: 15,
    },
  });

  const paymentForm = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
  });

  const locationForm = useForm<z.infer<typeof storeLocationSchema>>({
    resolver: zodResolver(storeLocationSchema),
    defaultValues: {
      country: "United States",
      is_primary: false,
    },
  });

  const dateFormats = [
    "MM/DD/YYYY",
    "DD/MM/YYYY",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
  ];

  useEffect(() => {
    fetchBusinessSettings();
    fetchPaymentMethods();
    fetchStoreLocations();
  }, []);

  const fetchBusinessSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings(data);
        if (data.business_hours && typeof data.business_hours === 'object') {
          setBusinessHours(data.business_hours as BusinessHours);
        }
        form.reset(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch business settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setPaymentMethods((data || []) as PaymentMethod[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch payment methods",
        variant: "destructive",
      });
    }
  };

  const fetchStoreLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("store_locations")
        .select("*")
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setStoreLocations(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch store locations",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      form.setValue('company_logo_url', urlData.publicUrl);
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof businessSettingsSchema>) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      const updateData = {
        ...data,
        business_hours: businessHours,
        tenant_id: tenantData,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("business_settings")
          .update(updateData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_settings")
          .insert(updateData);

        if (error) throw error;
      }

      await fetchBusinessSettings();
      toast({
        title: "Success",
        description: "Business settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const savePaymentMethod = async (data: z.infer<typeof paymentMethodSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      if (editingPayment?.id) {
        const { error } = await supabase
          .from("payment_methods")
          .update(data)
          .eq("id", editingPayment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_methods")
          .insert({
            name: data.name,
            type: data.type,
            requires_reference: data.requires_reference,
            tenant_id: tenantData,
            display_order: paymentMethods.length + 1,
          });

        if (error) throw error;
      }

      await fetchPaymentMethods();
      setShowPaymentDialog(false);
      setEditingPayment(null);
      paymentForm.reset();
      
      toast({
        title: "Success",
        description: editingPayment ? "Payment method updated" : "Payment method added",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveStoreLocation = async (data: z.infer<typeof storeLocationSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      if (data.is_primary) {
        await supabase
          .from("store_locations")
          .update({ is_primary: false })
          .neq("id", editingLocation?.id || "");
      }

      if (editingLocation?.id) {
        const { error } = await supabase
          .from("store_locations")
          .update(data)
          .eq("id", editingLocation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_locations")
          .insert({
            ...data,
            tenant_id: tenantData,
          });

        if (error) throw error;
      }

      await fetchStoreLocations();
      setShowLocationDialog(false);
      setEditingLocation(null);
      locationForm.reset();
      
      toast({
        title: "Success",
        description: editingLocation ? "Store location updated" : "Store location added",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchPaymentMethods();
      toast({
        title: "Success",
        description: "Payment method deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteStoreLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("store_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchStoreLocations();
      toast({
        title: "Success",
        description: "Store location deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateBusinessHours = (day: string, field: string, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return <div className="p-6">Loading business settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Business Settings</h2>
        <Button onClick={() => onSubmit(form.getValues())} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-12 h-auto">
          <TabsTrigger value="company" className="text-xs">Company</TabsTrigger>
          <TabsTrigger value="locations" className="text-xs">Locations</TabsTrigger>
          <TabsTrigger value="hours" className="text-xs">Hours</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs">Receipts</TabsTrigger>
          <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
          <TabsTrigger value="pos" className="text-xs">POS</TabsTrigger>
          <TabsTrigger value="purchase" className="text-xs">Purchase</TabsTrigger>
          <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
          <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Company Information Tab */}
            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Company Logo</Label>
                      <div className="flex items-center gap-4 mt-2">
                        {form.watch('company_logo_url') && (
                          <img 
                            src={form.watch('company_logo_url')} 
                            alt="Company logo" 
                            className="h-16 w-16 object-contain border rounded"
                          />
                        )}
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={logoUploading}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={logoUploading}
                            onClick={() => document.getElementById('logo-upload')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {logoUploading ? "Uploading..." : "Upload Logo"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="business_registration_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Registration Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter registration number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tax_identification_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Identification Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter tax ID" {...field} />
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
                              <Input placeholder="https://yourwebsite.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="business@example.com" {...field} />
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
                            <FormLabel>Business Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <FormField
                      control={form.control}
                      name="address_line_1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
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
                          <FormLabel>Address Line 2</FormLabel>
                          <FormControl>
                            <Input placeholder="Apartment, suite, etc. (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
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
                              <Input placeholder="State/Province" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Postal Code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Store Locations Tab */}
            <TabsContent value="locations" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Store Locations
                    </CardTitle>
                    <Button onClick={() => {
                      setEditingLocation(null);
                      locationForm.reset();
                      setShowLocationDialog(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {storeLocations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{location.name}</h4>
                            {location.is_primary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                            {!location.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {[location.address_line_1, location.city, location.state_province].filter(Boolean).join(", ")}
                          </p>
                          {location.manager_name && (
                            <p className="text-sm text-muted-foreground">
                              Manager: {location.manager_name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingLocation(location);
                              locationForm.reset(location);
                              setShowLocationDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this location? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => location.id && deleteStoreLocation(location.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}

                    {storeLocations.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No store locations added yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Hours Tab */}
            <TabsContent value="hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(businessHours).map(([day, hours]) => (
                      <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-20">
                          <Label className="capitalize font-medium">{day}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!hours.closed}
                            onCheckedChange={(checked) => updateBusinessHours(day, 'closed', !checked)}
                          />
                          <span className="text-sm text-muted-foreground">Open</span>
                        </div>
                        {!hours.closed && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={hours.open}
                              onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                              className="w-32"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={hours.close}
                              onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        )}
                        {hours.closed && (
                          <span className="text-sm text-muted-foreground">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Settings Tab */}
            <TabsContent value="financial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currency_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            const currency = currencies.find(c => c.code === value);
                            if (currency) {
                              form.setValue("currency_symbol", currency.symbol);
                            }
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  {currency.code} - {currency.name} ({currency.symbol})
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timezones.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date_format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dateFormats.map((format) => (
                                <SelectItem key={format} value={format}>
                                  {format}
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
                      name="stock_accounting_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Accounting Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stockAccountingMethods.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
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
                          <FormLabel>Tax Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Tax" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tax_inclusive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Tax Inclusive</FormLabel>
                            <FormDescription>
                              Prices include tax
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Methods Tab */}
            <TabsContent value="payments" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Methods
                    </CardTitle>
                    <Button onClick={() => {
                      setEditingPayment(null);
                      paymentForm.reset();
                      setShowPaymentDialog(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentMethods.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{payment.name}</h4>
                            <Badge variant="outline">{payment.type}</Badge>
                            {!payment.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {payment.requires_reference && (
                              <Badge variant="secondary">Requires Reference</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPayment(payment);
                              paymentForm.reset(payment);
                              setShowPaymentDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this payment method? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => payment.id && deletePaymentMethod(payment.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}

                    {paymentMethods.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No payment methods added yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receipt Settings Tab */}
            <TabsContent value="receipts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Receipt Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="receipt_header"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Header</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter receipt header text" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receipt_footer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Footer</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter receipt footer text" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="print_customer_copy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Print Customer Copy</FormLabel>
                            <FormDescription>
                              Automatically print customer copy
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
                      name="print_merchant_copy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Print Merchant Copy</FormLabel>
                            <FormDescription>
                              Automatically print merchant copy
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
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="invoice_template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Template</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templateOptions.map((template) => (
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

                    <FormField
                      control={form.control}
                      name="quote_template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quote Template</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templateOptions.map((template) => (
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

                    <FormField
                      control={form.control}
                      name="delivery_note_template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Note Template</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templateOptions.map((template) => (
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
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="invoice_number_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number Prefix</FormLabel>
                          <FormControl>
                            <Input placeholder="INV-" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quote_number_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quote Number Prefix</FormLabel>
                          <FormControl>
                            <Input placeholder="QT-" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="delivery_note_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Note Prefix</FormLabel>
                          <FormControl>
                            <Input placeholder="DN-" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="invoice_terms_conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter terms and conditions for invoices" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Product Settings Tab */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enable_combo_products"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Combo Products</FormLabel>
                            <FormDescription>
                              Allow bundling of multiple products
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
                      name="enable_retail_pricing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Retail Pricing</FormLabel>
                            <FormDescription>
                              Enable retail price tiers
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enable_wholesale_pricing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Wholesale Pricing</FormLabel>
                            <FormDescription>
                              Enable wholesale price tiers
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
                              Automatically generate SKU codes
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enable_barcode_scanning"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Barcode Scanning</FormLabel>
                            <FormDescription>
                              Allow barcode scanning for products
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
                              Allow selling when stock is zero
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="default_markup_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Markup Percentage (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
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
                      name="low_stock_threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Stock Threshold</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* POS Settings Tab */}
            <TabsContent value="pos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    POS Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pos_auto_print_receipt"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto Print Receipt</FormLabel>
                            <FormDescription>
                              Automatically print receipt after sale
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
                      name="pos_ask_customer_info"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Ask Customer Info</FormLabel>
                            <FormDescription>
                              Prompt for customer information
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pos_enable_discounts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Discounts</FormLabel>
                            <FormDescription>
                              Allow discounts on POS
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
                      name="pos_enable_tips"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Tips</FormLabel>
                            <FormDescription>
                              Allow tip collection
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pos_max_discount_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Discount Percentage (%)</FormLabel>
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
                      name="pos_default_payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="digital">Digital</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Purchase Settings Tab */}
            <TabsContent value="purchase" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Purchase Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchase_auto_receive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto Receive Orders</FormLabel>
                            <FormDescription>
                              Automatically receive purchase orders
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
                      name="purchase_enable_partial_receive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Partial Receiving</FormLabel>
                            <FormDescription>
                              Allow partial order receiving
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
                  </div>

                  <FormField
                    control={form.control}
                    name="purchase_default_tax_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Purchase Tax Rate (%)</FormLabel>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Settings Tab */}
            <TabsContent value="email" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email_smtp_host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Host</FormLabel>
                          <FormControl>
                            <Input placeholder="smtp.gmail.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_smtp_port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Port</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="587"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email_smtp_username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Username</FormLabel>
                          <FormControl>
                            <Input placeholder="your-email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_smtp_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Your app password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email_from_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="noreply@yourcompany.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_from_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email_enable_ssl"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable SSL</FormLabel>
                          <FormDescription>
                            Use SSL/TLS encryption for email
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
            </TabsContent>

            {/* WhatsApp Settings Tab */}
            <TabsContent value="whatsapp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="whatsapp_enable_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable WhatsApp Notifications</FormLabel>
                          <FormDescription>
                            Send notifications via WhatsApp
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
                    name="whatsapp_api_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp API URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.whatsapp.com/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp_api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp API Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Your WhatsApp API key" {...field} />
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
                        <FormLabel>WhatsApp Business Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* SMS Settings Tab */}
            <TabsContent value="sms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Bulk SMS Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sms_enable_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable SMS Notifications</FormLabel>
                          <FormDescription>
                            Send notifications via SMS
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
                    name="sms_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMS Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select SMS provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {smsProviders.map((provider) => (
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

                  <FormField
                    control={form.control}
                    name="sms_api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMS API Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Your SMS API key" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sms_sender_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMS Sender ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Your sender ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

          </form>
        </Form>
      </Tabs>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(savePaymentMethod)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Credit Card" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={paymentForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={paymentForm.control}
                name="requires_reference"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Requires Reference Number</FormLabel>
                      <FormDescription>
                        Does this payment method require a reference number?
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

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayment ? "Update" : "Add"} Payment Method
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Store Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Store Location" : "Add Store Location"}
            </DialogTitle>
          </DialogHeader>
          <Form {...locationForm}>
            <form onSubmit={locationForm.handleSubmit(saveStoreLocation)} className="space-y-4">
              <FormField
                control={locationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Store" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={locationForm.control}
                  name="address_line_1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={locationForm.control}
                  name="address_line_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Apartment, suite, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={locationForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={locationForm.control}
                  name="state_province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="State/Province" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={locationForm.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal Code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={locationForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={locationForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="store@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={locationForm.control}
                name="manager_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={locationForm.control}
                name="is_primary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Primary Location</FormLabel>
                      <FormDescription>
                        Set this as the primary store location
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

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowLocationDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingLocation ? "Update" : "Add"} Location
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}