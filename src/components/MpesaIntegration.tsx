import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Key, 
  Link, 
  TestTube,
  Save,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const mpesaConfigSchema = z.object({
  is_enabled: z.boolean().default(false),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
  consumer_key: z.string().min(1, "Consumer key is required"),
  consumer_secret: z.string().min(1, "Consumer secret is required"),
  passkey: z.string().min(1, "Passkey is required"),
  shortcode: z.string().min(5, "Shortcode must be at least 5 digits"),
  api_user: z.string().min(1, "API user is required"),
  callback_url: z.string().url("Must be a valid URL"),
  confirmation_url: z.string().url("Must be a valid URL"),
  validation_url: z.string().url("Must be a valid URL").optional(),
});

interface MpesaConfig {
  id?: string;
  tenant_id: string;
  is_enabled: boolean;
  environment: "sandbox" | "production";
  consumer_key: string;
  consumer_secret: string;
  passkey: string;
  shortcode: string;
  api_user: string;
  callback_url: string;
  confirmation_url: string;
  validation_url?: string;
  last_tested_at?: string;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export function MpesaIntegration() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [mpesaConfig, setMpesaConfig] = useState<MpesaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const form = useForm<z.infer<typeof mpesaConfigSchema>>({
    resolver: zodResolver(mpesaConfigSchema),
    defaultValues: {
      is_enabled: false,
      environment: "sandbox",
      consumer_key: "",
      consumer_secret: "",
      passkey: "",
      shortcode: "",
      api_user: "",
      callback_url: "",
      confirmation_url: "",
      validation_url: "",
    },
  });

  const isEnabled = form.watch("is_enabled");
  const environment = form.watch("environment");

  useEffect(() => {
    if (tenantId) {
      fetchMpesaConfig();
    }
  }, [tenantId]);

  const fetchMpesaConfig = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      // Use direct query without typed client to avoid type issues
      const { data, error } = await supabase
        .from('mpesa_configurations' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMpesaConfig(data as unknown as MpesaConfig);
        form.reset({
          is_enabled: (data as any).is_enabled,
          environment: (data as any).environment,
          consumer_key: (data as any).consumer_key,
          consumer_secret: (data as any).consumer_secret,
          passkey: (data as any).passkey,
          shortcode: (data as any).shortcode,
          api_user: (data as any).api_user,
          callback_url: (data as any).callback_url,
          confirmation_url: (data as any).confirmation_url,
          validation_url: (data as any).validation_url || "",
        });
      } else {
        // Set default URLs for new configuration
        const baseUrl = window.location.origin;
        form.reset({
          is_enabled: false,
          environment: "sandbox",
          callback_url: `${baseUrl}/api/mpesa/callback`,
          confirmation_url: `${baseUrl}/api/mpesa/confirmation`,
          validation_url: `${baseUrl}/api/mpesa/validation`,
        });
      }
    } catch (error: any) {
      console.error('Error fetching Mpesa config:', error);
      toast({
        title: "Error",
        description: "Failed to load Mpesa configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateUrls = () => {
    const baseUrl = window.location.origin;
    const shortcode = form.getValues("shortcode");
    
    form.setValue("callback_url", `${baseUrl}/api/mpesa/callback/${shortcode}`);
    form.setValue("confirmation_url", `${baseUrl}/api/mpesa/confirmation/${shortcode}`);
    form.setValue("validation_url", `${baseUrl}/api/mpesa/validation/${shortcode}`);
    
    toast({
      title: "URLs Generated",
      description: "Callback URLs have been generated based on your shortcode",
    });
  };

  const testConnection = async () => {
    if (!tenantId) return;
    
    const values = form.getValues();
    
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-mpesa-connection', {
        body: {
          tenant_id: tenantId,
          config: values
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Mpesa API connection test passed",
        });
        
        // Update last tested timestamp
        if (mpesaConfig?.id) {
          await supabase
            .from('mpesa_configurations' as any)
            .update({ 
              last_tested_at: new Date().toISOString(),
              is_verified: true 
            } as any)
            .eq('id', mpesaConfig.id);
        }
      } else {
        throw new Error(data.message || "Connection test failed");
      }
    } catch (error: any) {
      console.error('Mpesa connection test failed:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Mpesa API",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof mpesaConfigSchema>) => {
    if (!tenantId) return;

    setIsSaving(true);
    try {
      const configData = {
        tenant_id: tenantId,
        ...values,
        updated_at: new Date().toISOString(),
      };

      if (mpesaConfig?.id) {
        const { error } = await supabase
          .from('mpesa_configurations' as any)
          .update(configData as any)
          .eq('id', mpesaConfig.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('mpesa_configurations' as any)
          .insert({
            ...configData,
            created_at: new Date().toISOString(),
          } as any)
          .select()
          .single();
        
        if (error) throw error;
        setMpesaConfig(data as unknown as MpesaConfig);
      }

      toast({
        title: "Configuration Saved",
        description: "Mpesa configuration has been saved successfully",
      });

      // Test connection if enabled
      if (values.is_enabled) {
        await testConnection();
      }

    } catch (error: any) {
      console.error('Error saving Mpesa config:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save Mpesa configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableToggle = () => {
    if (!isEnabled) {
      // Enabling - just toggle
      form.setValue("is_enabled", true);
    } else {
      // Disabling - show confirmation
      setShowConfirmDialog(true);
    }
  };

  const confirmDisable = () => {
    form.setValue("is_enabled", false);
    setShowConfirmDialog(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mpesa Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mpesa Integration
          {mpesaConfig?.is_verified && (
            <Badge variant="default" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure Mpesa C2B payment integration for your business
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Remove the Form wrapper and form element - use div instead */}
        <div className="space-y-6">
          {/* Enable/Disable Integration */}
          <FormField
            control={form.control}
            name="is_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Mpesa Integration</FormLabel>
                  <FormDescription>
                    Allow customers to pay using Mpesa
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={handleEnableToggle}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isEnabled && (
            <>
              {/* Environment Selection */}
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                        <SelectItem value="production">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Use sandbox for testing, production for live transactions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* API Credentials */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">API Credentials</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCredentials(!showCredentials)}
                  >
                    {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showCredentials ? "Hide" : "Show"} Credentials
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="consumer_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumer Key</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type={showCredentials ? "text" : "password"}
                            placeholder="Enter consumer key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consumer_secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumer Secret</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type={showCredentials ? "text" : "password"}
                            placeholder="Enter consumer secret"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="passkey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passkey</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type={showCredentials ? "text" : "password"}
                            placeholder="Enter passkey"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shortcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shortcode</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter shortcode"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="api_user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API User</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter API user"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* URL Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Callback URLs</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateUrls}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Generate URLs
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="callback_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Callback URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://your-domain.com/api/mpesa/callback"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmation_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmation URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://your-domain.com/api/mpesa/confirmation"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="validation_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validation URL (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://your-domain.com/api/mpesa/validation"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={isSaving}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}