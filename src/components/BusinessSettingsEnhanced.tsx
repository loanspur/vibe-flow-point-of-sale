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
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  currency_code: z.string().default("USD"),
  timezone: z.string().default("America/New_York"),
  default_tax_rate: z.number().min(0).max(100).default(0),
  tax_name: z.string().default("Tax"),
});

interface BusinessSettings {
  id?: string;
  tenant_id?: string;
  [key: string]: any;
}

export function BusinessSettingsEnhanced() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof businessSettingsSchema>>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      company_name: "",
      email: "",
      phone: "",
      currency_code: "USD",
      timezone: "America/New_York",
      default_tax_rate: 0,
      tax_name: "Tax",
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Fetch logic here
    setIsLoading(false);
  };

  const onSubmit = async (values: z.infer<typeof businessSettingsSchema>) => {
    setIsSaving(true);
    try {
      // Save logic here
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
              <p className="text-muted-foreground text-lg">
                Configure your business preferences, templates, and system settings
              </p>
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
              <TabsList className="grid w-full grid-cols-6 h-auto bg-transparent gap-1 p-1">
                <TabsTrigger 
                  value="company" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 text-sm font-medium px-4 py-3"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Company
                </TabsTrigger>
                <TabsTrigger 
                  value="sales" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 text-sm font-medium px-4 py-3"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sales & POS
                </TabsTrigger>
                <TabsTrigger 
                  value="templates" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 text-sm font-medium px-4 py-3"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger 
                  value="payments" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 text-sm font-medium px-4 py-3"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payments
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 text-sm font-medium px-4 py-3"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-200 hover:bg-muted/50 text-sm font-medium px-4 py-3"
                >
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
                                  <FormLabel className="text-sm font-medium">Company Name</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter your company name"
                                      className="h-11"
                                    />
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
                                  <FormLabel className="text-sm font-medium">Business Email</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="email"
                                      placeholder="business@company.com"
                                      className="h-11"
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
                                  <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="+1 (555) 123-4567"
                                      className="h-11"
                                    />
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
                              <Globe className="h-5 w-5 text-primary" />
                              Regional Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="currency_code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Currency</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select currency" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {currencies.map(currency => (
                                        <SelectItem key={currency.code} value={currency.code}>
                                          {currency.symbol} {currency.name} ({currency.code})
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
                                  <FormLabel className="text-sm font-medium">Timezone</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select timezone" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {timezones.map(tz => (
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
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Sales & POS Tab */}
                    <TabsContent value="sales" className="space-y-6 mt-6">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            Sales & Point of Sale
                          </CardTitle>
                          <p className="text-muted-foreground">Configure your sales process and POS behavior</p>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="font-medium text-foreground mb-3">Tax Settings</h4>
                              <FormField
                                control={form.control}
                                name="default_tax_rate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">Default Tax Rate (%)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="h-11"
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
                                    <FormLabel className="text-sm font-medium">Tax Display Name</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field}
                                        placeholder="Sales Tax, VAT, GST, etc."
                                        className="h-11"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="space-y-4">
                              <h4 className="font-medium text-foreground mb-3">POS Behavior</h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                  <div>
                                    <div className="font-medium">Auto Print Receipts</div>
                                    <div className="text-sm text-muted-foreground">Automatically print after each sale</div>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                  <div>
                                    <div className="font-medium">Ask for Customer Info</div>
                                    <div className="text-sm text-muted-foreground">Prompt for customer details</div>
                                  </div>
                                  <Switch />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Templates Tab */}
                    <TabsContent value="templates" className="space-y-6 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <FileText className="h-5 w-5 text-primary" />
                              Invoice Templates
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Template Style</Label>
                              <Select defaultValue="modern">
                                <SelectTrigger className="h-11">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="modern">Modern</SelectItem>
                                  <SelectItem value="minimal">Minimal</SelectItem>
                                  <SelectItem value="professional">Professional</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                              <div>
                                <div className="font-medium">Auto Number</div>
                                <div className="text-sm text-muted-foreground">Generate invoice numbers automatically</div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                              <Receipt className="h-5 w-5 text-primary" />
                              Receipt Templates
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Header Text</Label>
                              <Textarea 
                                placeholder="Thank you for your business!"
                                className="resize-none"
                                rows={2}
                              />
                            </div>
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Footer Text</Label>
                              <Textarea 
                                placeholder="Please come again!"
                                className="resize-none"
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Placeholder for other tabs */}
                    <TabsContent value="payments" className="space-y-6 mt-6">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Payment Settings
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Payment configuration options will be available here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-6 mt-6">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Bell className="h-5 w-5 text-primary" />
                            Notification Settings
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Notification preferences will be configured here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6 mt-6">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Shield className="h-5 w-5 text-primary" />
                            Security Settings
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Security and access control settings will be available here.</p>
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