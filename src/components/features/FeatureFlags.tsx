import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Settings, Store, BarChart3, MapPin, Zap, Eye, EyeOff } from 'lucide-react';

const featureFlagSchema = z.object({
  feature_name: z.string().min(1, 'Feature name is required'),
  is_enabled: z.boolean(),
  config: z.record(z.any()).optional(),
});

type FeatureFlagFormData = z.infer<typeof featureFlagSchema>;

interface FeatureFlag {
  id: string;
  tenant_id: string;
  feature_name: string;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface FeatureDefinition {
  name: string;
  displayName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultConfig: Record<string, any>;
  category: 'core' | 'premium' | 'experimental';
}

const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    name: 'ecommerce',
    displayName: 'E-commerce Storefront',
    description: 'Enable online store with product catalog and checkout',
    icon: Store,
    defaultConfig: { enabled: false, storefront_url: null, allow_guest_checkout: true },
    category: 'premium',
  },
  {
    name: 'advanced_analytics',
    displayName: 'Advanced Analytics',
    description: 'AI-powered insights and customer segmentation',
    icon: BarChart3,
    defaultConfig: { enabled: false, ai_insights: false, customer_segmentation: true },
    category: 'premium',
  },
  {
    name: 'multi_location',
    displayName: 'Multi-Location Management',
    description: 'Manage inventory and sales across multiple locations',
    icon: MapPin,
    defaultConfig: { enabled: true, max_locations: 5, location_sync: true },
    category: 'core',
  },
  {
    name: 'real_time_sync',
    displayName: 'Real-time Sync',
    description: 'Live synchronization across devices and locations',
    icon: Zap,
    defaultConfig: { enabled: true, sync_interval: 30, offline_support: true },
    category: 'core',
  },
  {
    name: 'inventory_forecasting',
    displayName: 'Inventory Forecasting',
    description: 'Predict stock needs using AI and historical data',
    icon: BarChart3,
    defaultConfig: { enabled: false, forecast_horizon: 30, confidence_threshold: 0.8 },
    category: 'premium',
  },
  {
    name: 'customer_loyalty',
    displayName: 'Customer Loyalty Program',
    description: 'Points, rewards, and customer retention features',
    icon: Store,
    defaultConfig: { enabled: false, points_per_shilling: 1, reward_tiers: [] },
    category: 'premium',
  },
  {
    name: 'barcode_scanner',
    displayName: 'Barcode Scanner',
    description: 'Mobile barcode scanning for inventory management',
    icon: Eye,
    defaultConfig: { enabled: true, camera_quality: 'high', auto_focus: true },
    category: 'core',
  },
  {
    name: 'voice_commands',
    displayName: 'Voice Commands',
    description: 'Voice-activated POS operations',
    icon: Zap,
    defaultConfig: { enabled: false, language: 'en', wake_word: 'vibe' },
    category: 'experimental',
  },
];

export default function FeatureFlags() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureDefinition | null>(null);
  const { toast } = useToast();

  const form = useForm<FeatureFlagFormData>({
    resolver: zodResolver(featureFlagSchema),
    defaultValues: {
      feature_name: '',
      is_enabled: false,
      config: {},
    },
  });

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_name');

      if (error) throw error;

      setFeatureFlags(data || []);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feature flags',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeature = async (featureFlag: FeatureFlag) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !featureFlag.is_enabled })
        .eq('id', featureFlag.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${featureFlag.feature_name} ${!featureFlag.is_enabled ? 'enabled' : 'disabled'} successfully`,
      });

      await fetchFeatureFlags();
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature flag',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFeature = async (data: FeatureFlagFormData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .insert({
          feature_name: data.feature_name,
          is_enabled: data.is_enabled,
          config: data.config || {},
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feature flag added successfully',
      });

      setIsDialogOpen(false);
      form.reset();
      await fetchFeatureFlags();
    } catch (error) {
      console.error('Error adding feature flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to add feature flag',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = (feature: FeatureDefinition) => {
    setSelectedFeature(feature);
    form.reset({
      feature_name: feature.name,
      is_enabled: feature.defaultConfig.enabled || false,
      config: feature.defaultConfig,
    });
    setIsDialogOpen(true);
  };

  const getFeatureDefinition = (featureName: string): FeatureDefinition | undefined => {
    return FEATURE_DEFINITIONS.find(f => f.name === featureName);
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      core: 'default',
      premium: 'secondary',
      experimental: 'destructive',
    } as const;

    return (
      <Badge variant={variants[category as keyof typeof variants] || 'default'}>
        {category}
      </Badge>
    );
  };

  const groupedFeatures = FEATURE_DEFINITIONS.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureDefinition[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feature Flags</h2>
          <p className="text-muted-foreground">
            Enable or disable features for your tenant
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Feature
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Feature Flag</DialogTitle>
              <DialogDescription>
                {selectedFeature ? `Configure ${selectedFeature.displayName}` : 'Add a new feature flag'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleAddFeature)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feature_name">Feature Name</Label>
                <Input
                  id="feature_name"
                  {...form.register('feature_name')}
                  placeholder="Enter feature name"
                />
                {form.formState.errors.feature_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.feature_name.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_enabled">Enable Feature</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn this feature on or off
                  </p>
                </div>
                <Switch
                  id="is_enabled"
                  checked={form.watch('is_enabled')}
                  onCheckedChange={(checked) => form.setValue('is_enabled', checked)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    form.reset();
                    setSelectedFeature(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Feature
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Features */}
      <div className="space-y-6">
        {Object.entries(groupedFeatures).map(([category, features]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="capitalize">{category} Features</CardTitle>
              <CardDescription>
                {category === 'core' && 'Essential features included with your plan'}
                {category === 'premium' && 'Advanced features for enhanced functionality'}
                {category === 'experimental' && 'Beta features under development'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {features.map((feature) => {
                  const existingFlag = featureFlags.find(f => f.feature_name === feature.name);
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{feature.displayName}</h3>
                            {getCategoryBadge(feature.category)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {existingFlag ? (
                          <Switch
                            checked={existingFlag.is_enabled}
                            onCheckedChange={() => handleToggleFeature(existingFlag)}
                            disabled={isSaving}
                          />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAdd(feature)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Feature Flags */}
      {featureFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Feature Flags</CardTitle>
            <CardDescription>
              Currently configured features for your tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {featureFlags.map((flag) => {
                const featureDef = getFeatureDefinition(flag.feature_name);
                const Icon = featureDef?.icon || Settings;

                return (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {featureDef?.displayName || flag.feature_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {featureDef?.description || 'Custom feature flag'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                        {flag.is_enabled ? (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Disabled
                          </>
                        )}
                      </Badge>
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={() => handleToggleFeature(flag)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
