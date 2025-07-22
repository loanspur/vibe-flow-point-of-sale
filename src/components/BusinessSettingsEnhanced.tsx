import { useState, useEffect } from "react";
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
  Layout
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { currencies, stockAccountingMethods, smsProviders, templateOptions } from "@/lib/currencies";
import { timezones } from "@/lib/timezones";
import { countries, popularCountries, getRegions, searchCountries, type Country } from "@/lib/countries";

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
  allow_overselling: z.boolean().default(false),
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
  quote_template: z.string().default("standard")
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
  const [activeTab, setActiveTab] = useState("company");
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StoreLocation | null>(null);
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
  const { toast } = useToast();

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
      allow_overselling: false,
      enable_fixed_pricing: false,
      pos_auto_print_receipt: true,
      pos_ask_customer_info: false,
      email_enable_notifications: true,
      sms_enable_notifications: false,
      whatsapp_enable_notifications: false,
      invoice_template: "standard",
      receipt_template: "standard",
      quote_template: "standard"
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
        .order('is_main', { ascending: false });
      
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
      const { error } = await supabase
        .from('business_settings')
        .upsert({
          ...values,
          tenant_id: 'current-tenant-id' // Replace with actual tenant ID
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addLocation = async (locationData: Omit<StoreLocation, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('store_locations')
        .insert({
          ...locationData,
          tenant_id: 'current-tenant-id'
        })
        .select()
        .single();

      if (error) throw error;

      setLocations([...locations, data]);
      setIsLocationDialogOpen(false);
      
      toast({
        title: "Location added",
        description: "Store location has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add location. Please try again.",
        variant: "destructive",
      });
    }
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
              <TabsList className="grid w-full grid-cols-8 h-auto bg-transparent gap-1 p-1">
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
                <TabsTrigger value="security" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
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

                                       {/* Popular currencies */}
                                       <div className="p-2 border-b bg-muted/30">
                                         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Popular</p>
                                       </div>
                                       {currencies
                                         .filter(currency => ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'].includes(currency.code))
                                         .filter(currency => !currencySearch || 
                                           currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                           currency.name.toLowerCase().includes(currencySearch.toLowerCase())
                                         )
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
                                       
                                       {/* All currencies by region */}
                                       {['North America', 'Europe', 'Asia', 'Middle East', 'Africa', 'South America', 'Central America', 'Caribbean', 'Oceania', 'Pacific', 'Commodities', 'Cryptocurrency'].map(region => {
                                         const regionCurrencies = currencies
                                           .filter(currency => currency.region === region)
                                           .filter(currency => !currencySearch || 
                                             currency.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                             currency.name.toLowerCase().includes(currencySearch.toLowerCase())
                                           );
                                         if (regionCurrencies.length === 0) return null;
                                         
                                         return (
                                           <div key={region}>
                                             <div className="p-2 border-b bg-muted/30">
                                               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{region}</p>
                                             </div>
                                             {regionCurrencies.map(currency => (
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
                            <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
                              <DialogTrigger asChild>
                                <Button>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Location
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add Store Location</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Input placeholder="Location Name" />
                                  <Textarea placeholder="Full Address" />
                                  <Input placeholder="Phone Number" />
                                  <div className="flex items-center space-x-2">
                                    <Switch />
                                    <Label>Main Location</Label>
                                  </div>
                                  <Button onClick={() => setIsLocationDialogOpen(false)}>
                                    Add Location
                                  </Button>
                                </div>
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
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
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
                              name="allow_overselling"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                  <div>
                                    <FormLabel className="font-medium">Allow Overselling</FormLabel>
                                    <FormDescription>Allow sales beyond available stock</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
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
                          <CardContent>
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
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Receipt className="h-5 w-5 text-primary" />
                              Receipt Template
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
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
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <FileText className="h-5 w-5 text-primary" />
                              Quote Template
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
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
                          </CardContent>
                        </Card>
                      </div>
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

                  </form>
                </Form>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}