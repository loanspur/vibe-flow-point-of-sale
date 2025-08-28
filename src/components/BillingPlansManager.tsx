import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useApp } from "@/contexts/AppContext";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Users, 
  Building2, 
  Calendar,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Star,
  Crown,
  Zap,
  Shield,
  Target,
  BarChart3,
  Settings,
  Copy,
  Eye,
  FileText,
  Package,
  Loader2,
  UserCog
} from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Plan performance metrics (mock data for charts)
const planPerformanceData = [
  { month: "Jul", basic: 85, professional: 142, enterprise: 45 },
  { month: "Aug", basic: 89, professional: 148, enterprise: 48 },
  { month: "Sep", basic: 92, professional: 155, enterprise: 52 },
  { month: "Oct", basic: 95, professional: 162, enterprise: 55 },
  { month: "Nov", basic: 98, professional: 168, enterprise: 58 },
  { month: "Dec", basic: 102, professional: 175, enterprise: 61 }
];

// Default tab configuration - editable by superadmin
const defaultTabConfig = [
  { 
    id: "overview", 
    label: "Overview", 
    enabled: true, 
    icon: "BarChart3",
    description: "Plan overview and comparison",
    order: 1
  },
  { 
    id: "plans", 
    label: "Plan Management", 
    enabled: true, 
    icon: "Package",
    description: "Create and manage billing plans",
    order: 2
  },
  { 
    id: "performance", 
    label: "Performance", 
    enabled: true, 
    icon: "TrendingUp",
    description: "Analytics and conversion metrics",
    order: 3
  },
  { 
    id: "pricing", 
    label: "Pricing Rules", 
    enabled: true, 
    icon: "DollarSign",
    description: "Configure pricing and discounts",
    order: 4
  },
  { 
    id: "analytics", 
    label: "Analytics", 
    enabled: true, 
    icon: "Target",
    description: "Advanced analytics and reporting",
    order: 5
  },
];

export default function BillingPlansManager() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTabConfigDialogOpen, setIsTabConfigDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabConfig, setTabConfig] = useState(defaultTabConfig);
  const { toast } = useToast();
  const { formatCurrency, currencySymbol, currencyCode } = useApp();

  // Helper functions for formatting
  const formatAmount = (amount: number) => {
    return formatCurrency(amount);
  };

  const formatPrice = (amount: number) => {
    return formatCurrency(amount);
  };

  // Use business settings currency formatting
  const formatPlanCurrency = (amount: number): string => {
    return formatCurrency(amount);
  };

  // Get enabled tabs sorted by order
  const enabledTabs = tabConfig.filter(tab => tab.enabled).sort((a, b) => a.order - b.order);

  // Fetch plans from Supabase
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        toast({
          title: "Error",
          description: "Failed to fetch billing plans.",
          variant: "destructive"
        });
        return;
      }

      setPlans(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load plans on component mount
  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (planData: any) => {
    try {
      const newPlan = {
        name: planData.name,
        price: Number(planData.price),
        original_price: Number(planData.originalPrice || planData.price),
        period: "month",
        description: planData.description,
        badge: planData.badge || "",
        badge_color: "bg-blue-100 text-blue-800",
        popularity: 0,
        status: "active",
        customers: 0,
        mrr: 0,
        arpu: Number(planData.price),
        churn_rate: 0,
        conversion_rate: 0,
        trial_conversion: 0,
        features: Array.isArray(planData.features) ? planData.features : [],
        pricing: {
          monthly: Number(planData.price),
          quarterly: Number(planData.price) * 3,
          annually: Number(planData.price) * 12,
          biannually: Number(planData.price) * 6
        },
        discounts: planData.discounts || [],
        add_ons: planData.addOns || [],
        display_order: plans.length + 1
      };

      const { data, error } = await supabase
        .from('billing_plans')
        .insert([newPlan])
        .select()
        .single();

      if (error) {
        console.error('Error creating plan:', error);
        toast({
          title: "Error",
          description: "Failed to create billing plan.",
          variant: "destructive"
        });
        return;
      }

      setPlans(prev => [...prev, data]);
      toast({
        title: "Plan Created",
        description: `${data.name} plan has been created successfully.`,
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePlan = async (updatedPlan: any) => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .update({
          name: updatedPlan.name,
          price: updatedPlan.price,
          original_price: updatedPlan.original_price,
          description: updatedPlan.description,
          badge: updatedPlan.badge,
          customers: updatedPlan.customers,
          mrr: updatedPlan.mrr,
          arpu: updatedPlan.arpu,
          churn_rate: updatedPlan.churn_rate,
          conversion_rate: updatedPlan.conversion_rate,
          features: updatedPlan.features,
          pricing: updatedPlan.pricing,
          discounts: updatedPlan.discounts,
          add_ons: updatedPlan.add_ons
        })
        .eq('id', updatedPlan.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating plan:', error);
        toast({
          title: "Error",
          description: "Failed to update billing plan.",
          variant: "destructive"
        });
        return;
      }

      setPlans(prev => prev.map(plan => 
        plan.id === updatedPlan.id ? data : plan
      ));
      toast({
        title: "Plan Updated",
        description: `${data.name} plan has been updated successfully.`,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleDuplicatePlan = async (plan: any) => {
    try {
      const duplicatedPlan = {
        ...plan,
        id: undefined, // Let database generate new ID
        name: `${plan.name} (Copy)`,
        customers: 0,
        mrr: 0,
        display_order: plans.length + 1
      };
      
      const { data, error } = await supabase
        .from('billing_plans')
        .insert([duplicatedPlan])
        .select()
        .single();

      if (error) {
        console.error('Error duplicating plan:', error);
        toast({
          title: "Error",
          description: "Failed to duplicate billing plan.",
          variant: "destructive"
        });
        return;
      }

      setPlans(prev => [...prev, data]);
      toast({
        title: "Plan Duplicated",
        description: `${plan.name} plan has been duplicated successfully.`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('billing_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Error deleting plan:', error);
        toast({
          title: "Error",
          description: "Failed to delete billing plan.",
          variant: "destructive"
        });
        return;
      }

      setPlans(prev => prev.filter(plan => plan.id !== planId));
      toast({
        title: "Plan Deleted",
        description: "Plan has been deleted successfully.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (plan: any) => {
    setSelectedPlan(plan);
    setIsViewDetailsOpen(true);
  };

  const toggleExpandPlan = (planId: string) => {
    setExpandedPlan(prev => prev === planId ? null : planId);
  };

  const handleTabToggle = (tabId: string, enabled: boolean) => {
    setTabConfig(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, enabled } : tab
    ));
  };

  const handleTabOrderChange = (tabId: string, newOrder: number) => {
    setTabConfig(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, order: newOrder } : tab
    ));
  };

  const handleTabLabelChange = (tabId: string, newLabel: string) => {
    setTabConfig(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, label: newLabel } : tab
    ));
  };

  const resetTabConfig = () => {
    setTabConfig(defaultTabConfig);
    toast({
      title: "Tab Configuration Reset",
      description: "Tab settings have been reset to default.",
    });
  };

  const saveTabConfig = () => {
    toast({
      title: "Configuration Saved",
      description: "Tab configuration has been saved successfully.",
    });
    setIsTabConfigDialogOpen(false);
  };

  const PlanCard = ({ plan, showActions = false }: { plan: any, showActions?: boolean }) => {
    const isExpanded = expandedPlan === plan.id;
    
    return (
      <Card className={`relative ${plan.badge === "Most Popular" ? "border-primary shadow-lg scale-105" : ""}`}>
        {plan.badge && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className={plan.badgeColor}>
              {plan.badge === "Most Popular" && <Star className="h-3 w-3 mr-1" />}
              {plan.badge === "Enterprise" && <Crown className="h-3 w-3 mr-1" />}
              {plan.badge}
            </Badge>
          </div>
        )}
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription className="mt-1">{plan.description}</CardDescription>
            </div>
            {showActions && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(plan)}>
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditPlan(plan)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDuplicatePlan(plan)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatPlanCurrency(plan.price)}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Annual</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {formatPlanCurrency(
                    plan.annual_discount_percentage 
                      ? (plan.price * 12) * (1 - (plan.annual_discount_percentage || 0) / 100)
                      : plan.price * (12 - (plan.annual_discount_months || 2))
                  )}
                </span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Save {plan.annual_discount_months || 2} months
              </p>
            </div>
          </div>
          {plan.original_price && plan.original_price > plan.price && (
            <div className="mt-2">
              <span className="text-sm line-through text-muted-foreground">{formatPlanCurrency(plan.original_price)}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customers:</span>
              <span className="font-medium">{plan.customers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MRR:</span>
              <span className="font-medium">{formatPlanCurrency(plan.mrr || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Churn Rate:</span>
              <span className="font-medium">{plan.churn_rate || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversion:</span>
              <span className="font-medium">{plan.conversion_rate || 0}%</span>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">Features:</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleExpandPlan(plan.id)}
                className="text-xs"
              >
                {isExpanded ? "Show Less" : "View All"}
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {(isExpanded ? (plan.features || []) : (plan.features || []).slice(0, 4)).map((feature: any, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  {feature.included ? (
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground flex-shrink-0" />
                  )}
                  <span className={feature.included ? "" : "text-muted-foreground line-through"}>
                    {typeof feature === 'string' ? feature : feature.name || 'Unnamed Feature'}
                    {feature.limit && <span className="text-muted-foreground"> ({feature.limit})</span>}
                  </span>
                </li>
              ))}
              {!isExpanded && (plan.features || []).length > 4 && (
                <li className="text-muted-foreground text-xs">
                  +{(plan.features || []).length - 4} more features
                </li>
              )}
            </ul>
          </div>

          {/* Expandable Details */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t">
              {/* Pricing Tiers */}
              {plan.pricing && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Pricing Options:</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                     <div className="flex justify-between">
                        <span>Monthly:</span>
                        <span className="font-medium">{formatPrice(plan.pricing.monthly || 0)}</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Quarterly:</span>
                        <span className="font-medium">{formatPrice(plan.pricing.quarterly || 0)}</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Annually:</span>
                        <span className="font-medium">{formatPrice(plan.pricing.annually || 0)}</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Bi-annually:</span>
                        <span className="font-medium">{formatPrice(plan.pricing.biannually || 0)}</span>
                     </div>
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {plan.addOns && plan.addOns.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Available Add-ons:</h5>
                  <ul className="space-y-1 text-xs">
                    {plan.addOns.map((addon: any, index: number) => (
                       <li key={index} className="flex justify-between">
                          <span>{addon.name}</span>
                          <span className="font-medium">{formatPrice(addon.price || 0)} {addon.unit}</span>
                       </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Discounts */}
              {plan.discounts && plan.discounts.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Available Discounts:</h5>
                  <ul className="space-y-1 text-xs">
                    {plan.discounts.map((discount: any, index: number) => (
                      <li key={index} className="flex justify-between">
                        <span>{discount.description}</span>
                        <span className="font-medium">{discount.percentage}% off</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const CreatePlanDialog = () => (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Billing Plan</DialogTitle>
          <DialogDescription>
            Define a new subscription plan with pricing, features, and settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="planName">Plan Name</Label>
                <Input id="planName" placeholder="e.g., Professional" />
              </div>
              <div>
                <Label htmlFor="planId">Plan ID</Label>
                <Input id="planId" placeholder="e.g., professional" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe the plan..." />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-medium">Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyPrice">Monthly Price ({currencySymbol})</Label>
                <Input id="monthlyPrice" type="number" placeholder="79" />
              </div>
              <div>
                <Label htmlFor="annualDiscount">Annual Discount (%)</Label>
                <Input id="annualDiscount" type="number" placeholder="17" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="freeTrial" />
              <Label htmlFor="freeTrial">Include 14-day free trial</Label>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-medium">Features</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded">
                <span>API Access</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span>Priority Support</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span>Custom Integrations</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span>Stock Management</span>
                <Switch />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input id="maxUsers" type="number" placeholder="Unlimited" />
              </div>
              <div>
                <Label htmlFor="maxLocations">Max Locations</Label>
                <Input id="maxLocations" type="number" placeholder="5" />
              </div>
              <div>
                <Label htmlFor="maxProducts">Max Products</Label>
                <Input id="maxProducts" type="number" placeholder="1000" />
              </div>
            </div>

            {/* Annual Pricing Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Annual Pricing Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="annualDiscountMonths">Free Months (Annual)</Label>
                  <Input id="annualDiscountMonths" type="number" defaultValue="2" placeholder="2" />
                  <p className="text-xs text-muted-foreground mt-1">Number of months to discount from annual price</p>
                </div>
                <div>
                  <Label htmlFor="annualDiscountPercentage">Or Percentage Discount (%)</Label>
                  <Input id="annualDiscountPercentage" type="number" placeholder="16.67" />
                  <p className="text-xs text-muted-foreground mt-1">Alternative to free months (leave empty if using months)</p>
                </div>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select id="currency" className="w-full p-2 border rounded">
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            // Collect form data
            const planName = (document.getElementById('planName') as HTMLInputElement)?.value;
            const description = (document.getElementById('description') as HTMLTextAreaElement)?.value;
            const monthlyPrice = (document.getElementById('monthlyPrice') as HTMLInputElement)?.value;
            const maxUsers = (document.getElementById('maxUsers') as HTMLInputElement)?.value;
            const maxLocations = (document.getElementById('maxLocations') as HTMLInputElement)?.value;
            const maxProducts = (document.getElementById('maxProducts') as HTMLInputElement)?.value;
            const annualDiscountMonths = (document.getElementById('annualDiscountMonths') as HTMLInputElement)?.value;
            const annualDiscountPercentage = (document.getElementById('annualDiscountPercentage') as HTMLInputElement)?.value;
            const currency = (document.getElementById('currency') as HTMLSelectElement)?.value;
            
            const planData = {
              name: planName,
              description: description,
              price: monthlyPrice,
              annual_discount_months: annualDiscountMonths ? parseInt(annualDiscountMonths) : 2,
              annual_discount_percentage: annualDiscountPercentage ? parseFloat(annualDiscountPercentage) : null,
              currency: currency || 'KES',
              features: [
                { name: `Up to ${maxLocations || 'Unlimited'} Locations`, included: true, limit: maxLocations },
                { name: `Up to ${maxUsers || 'Unlimited'} Staff Users`, included: true, limit: maxUsers },
                { name: `Up to ${maxProducts || 'Unlimited'} Products`, included: true, limit: maxProducts },
                { name: 'Stock Management', included: planName?.toLowerCase().includes('enterprise') || false, limit: '' },
              ]
            };
            
            handleCreatePlan(planData);
          }}>
            Create Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Billing Plans Management</h2>
          <p className="text-muted-foreground">Create, manage, and optimize your subscription plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Plans
          </Button>
          <Button variant="outline" onClick={() => setIsTabConfigDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Tabs
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
            <p className="text-xs text-muted-foreground">Active plans</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(plans.reduce((sum, plan) => sum + plan.mrr, 0))}</div>
            <p className="text-xs text-green-600">+12.5% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.length > 0 ? (plans.reduce((sum, plan) => sum + (plan.conversion_rate || 0), 0) / plans.length).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-green-600">+2.3% improvement</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.reduce((sum, plan) => sum + plan.customers, 0).toLocaleString()}</div>
            <p className="text-xs text-green-600">+156 this month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-${enabledTabs.length}`}>
          {enabledTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plan Performance Comparison</CardTitle>
              <CardDescription>Monthly subscription growth by plan</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                basic: { label: "Basic", color: "#8884d8" },
                professional: { label: "Professional", color: "#82ca9d" },
                enterprise: { label: "Enterprise", color: "#ffc658" }
              }}>
                {/* Fix: Remove ResponsiveContainer for fixed dimensions */}
                <div style={{ width: '100%', height: '300px' }}>
                  <AreaChart data={planPerformanceData} width={1180} height={300}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="basic" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="professional" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="enterprise" stackId="1" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                  </AreaChart>
                </div>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Management Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} showActions={true} />
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates by Plan</CardTitle>
                <CardDescription>Trial to paid conversion performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{plan.name}</span>
                        <span className="font-medium">{plan.conversion_rate || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(plan.conversion_rate / 35) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Churn Analysis</CardTitle>
                <CardDescription>Monthly churn rates by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">{plan.customers} customers</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{plan.churn_rate || 0}%</div>
                        <div className="text-xs text-muted-foreground">churn rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pricing Rules Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Strategy</CardTitle>
              <CardDescription>Configure pricing rules and discounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Volume Discounts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="volumeThreshold">Minimum Seats</Label>
                    <Input id="volumeThreshold" type="number" defaultValue="10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volumeDiscount">Discount Percentage</Label>
                    <Input id="volumeDiscount" type="number" defaultValue="15" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Annual Billing Incentives</h4>
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex justify-between items-center p-3 border rounded">
                      <span className="font-medium">{plan.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Annual discount:</span>
                        <Input className="w-20" defaultValue="17" />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Special Offers</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="studentDiscount" />
                    <Label htmlFor="studentDiscount">Student Discount (20%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="nonprofitDiscount" />
                    <Label htmlFor="nonprofitDiscount">Non-profit Discount (25%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="startupDiscount" />
                    <Label htmlFor="startupDiscount">Startup Discount (30%)</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Monthly revenue by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  basic: { label: "Basic", color: "#8884d8" },
                  professional: { label: "Professional", color: "#82ca9d" },
                  enterprise: { label: "Enterprise", color: "#ffc658" }
                }}>
                  {/* Fix: Remove ResponsiveContainer for fixed dimensions */}
                  <div style={{ width: '100%', height: '300px' }}>
                    <LineChart data={planPerformanceData} width={1180} height={300}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="basic" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="professional" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="enterprise" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  </div>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Current subscription distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  basic: { label: "Basic", color: "#8884d8" },
                  professional: { label: "Professional", color: "#82ca9d" },
                  enterprise: { label: "Enterprise", color: "#ffc658" }
                }}>
                  {/* Fix: Remove ResponsiveContainer for fixed dimensions */}
                  <div style={{ width: '100%', height: '300px' }}>
                    <PieChart width={1180} height={300}>
                      <Pie
                        data={planPerformanceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="basic"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {planPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={["#8884d8", "#82ca9d", "#ffc658"][index]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </div>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Plan Metrics</CardTitle>
              <CardDescription>Comprehensive performance data for all plans</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>ARPU</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Churn Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{plan.name}</div>
                          {plan.badge && (
                            <Badge variant="secondary" className="text-xs">{plan.badge}</Badge>
                          )}
                        </div>
                      </TableCell>
                       <TableCell>{formatPrice(plan.price)}/{plan.period}</TableCell>
                       <TableCell>{plan.customers.toLocaleString()}</TableCell>
                       <TableCell>{formatPrice(plan.mrr)}</TableCell>
                       <TableCell>{formatPrice(plan.arpu || 0)}</TableCell>
                       <TableCell>{plan.conversion_rate || 0}%</TableCell>
                       <TableCell>{plan.churn_rate || 0}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <CreatePlanDialog />
      
      {/* Edit Plan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan: {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Modify the plan details, pricing, and features.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editPlanName">Plan Name</Label>
                    <Input 
                      id="editPlanName" 
                      defaultValue={selectedPlan.name}
                      onChange={(e) => setSelectedPlan({...selectedPlan, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPlanBadge">Badge</Label>
                    <Input 
                      id="editPlanBadge" 
                      defaultValue={selectedPlan.badge}
                      onChange={(e) => setSelectedPlan({...selectedPlan, badge: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="editDescription">Description</Label>
                  <Textarea 
                    id="editDescription" 
                    defaultValue={selectedPlan.description}
                    onChange={(e) => setSelectedPlan({...selectedPlan, description: e.target.value})}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="font-medium">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="editPrice">Monthly Price ({currencySymbol})</Label>
                    <Input 
                      id="editPrice" 
                      type="number" 
                      defaultValue={selectedPlan.price}
                      onChange={(e) => setSelectedPlan({...selectedPlan, price: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editOriginalPrice">Original Price ({currencySymbol})</Label>
                    <Input 
                      id="editOriginalPrice" 
                      type="number" 
                      defaultValue={selectedPlan.originalPrice}
                      onChange={(e) => setSelectedPlan({...selectedPlan, originalPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editARPU">ARPU ({currencySymbol})</Label>
                    <Input 
                      id="editARPU" 
                      type="number" 
                      defaultValue={selectedPlan.arpu}
                      onChange={(e) => setSelectedPlan({...selectedPlan, arpu: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-4">
                <h3 className="font-medium">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editCustomers">Customers</Label>
                    <Input 
                      id="editCustomers" 
                      type="number" 
                      defaultValue={selectedPlan.customers}
                      onChange={(e) => setSelectedPlan({...selectedPlan, customers: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editMRR">MRR ({currencySymbol})</Label>
                    <Input 
                      id="editMRR" 
                      type="number" 
                      defaultValue={selectedPlan.mrr}
                      onChange={(e) => setSelectedPlan({...selectedPlan, mrr: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editChurnRate">Churn Rate (%)</Label>
                    <Input 
                      id="editChurnRate" 
                      type="number" 
                      step="0.1"
                      defaultValue={selectedPlan.churnRate}
                      onChange={(e) => setSelectedPlan({...selectedPlan, churnRate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editConversionRate">Conversion Rate (%)</Label>
                    <Input 
                      id="editConversionRate" 
                      type="number" 
                      step="0.1"
                      defaultValue={selectedPlan.conversionRate}
                      onChange={(e) => setSelectedPlan({...selectedPlan, conversionRate: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Features Management */}
              <div className="space-y-4">
                <h3 className="font-medium">Features</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(selectedPlan.features || []).map((feature: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3 flex-1">
                        <Switch 
                          checked={feature.included}
                          onCheckedChange={(included) => {
                            const updatedFeatures = [...(selectedPlan.features || [])];
                            updatedFeatures[index] = {...feature, included};
                            setSelectedPlan({...selectedPlan, features: updatedFeatures});
                          }}
                        />
                        <Input
                          value={typeof feature === 'string' ? feature : feature.name || ''}
                          onChange={(e) => {
                            const updatedFeatures = [...(selectedPlan.features || [])];
                            updatedFeatures[index] = typeof feature === 'string' 
                              ? { name: e.target.value, included: true, limit: '' }
                              : {...feature, name: e.target.value};
                            setSelectedPlan({...selectedPlan, features: updatedFeatures});
                          }}
                          className="flex-1"
                        />
                        <Input
                          value={typeof feature === 'string' ? '' : (feature.limit || "")}
                          onChange={(e) => {
                            const updatedFeatures = [...(selectedPlan.features || [])];
                            updatedFeatures[index] = typeof feature === 'string'
                              ? { name: feature, included: true, limit: e.target.value }
                              : {...feature, limit: e.target.value};
                            setSelectedPlan({...selectedPlan, features: updatedFeatures});
                          }}
                          placeholder="Limit"
                          className="w-24"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedFeatures = (selectedPlan.features || []).filter((_: any, i: number) => i !== index);
                          setSelectedPlan({...selectedPlan, features: updatedFeatures});
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newFeature = { name: "New Feature", included: true, limit: "" };
                    setSelectedPlan({...selectedPlan, features: [...(selectedPlan.features || []), newFeature]});
                  }}
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Add Feature
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdatePlan(selectedPlan)}>
              Update Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Details: {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Complete overview of plan configuration and performance.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                 <div className="text-center p-4 border rounded">
                   <div className="text-2xl font-bold">{formatPrice(selectedPlan.price || 0)}</div>
                   <div className="text-sm text-muted-foreground">Monthly Price</div>
                 </div>
                 <div className="text-center p-4 border rounded">
                   <div className="text-2xl font-bold">{selectedPlan.customers}</div>
                   <div className="text-sm text-muted-foreground">Customers</div>
                 </div>
                 <div className="text-center p-4 border rounded">
                   <div className="text-2xl font-bold">{formatPrice(selectedPlan.mrr || 0)}</div>
                   <div className="text-sm text-muted-foreground">MRR</div>
                 </div>
                 <div className="text-center p-4 border rounded">
                   <div className="text-2xl font-bold">{selectedPlan.conversion_rate || 0}%</div>
                   <div className="text-sm text-muted-foreground">Conversion</div>
                 </div>
              </div>

              {/* All Features */}
              <div>
                <h3 className="font-medium mb-3">All Features</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedPlan.features || []).map((feature: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      {feature.included ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground" />
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground line-through"}>
                        {feature.name}
                        {feature.limit && <span className="text-muted-foreground"> ({feature.limit})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown */}
              {selectedPlan.pricing && (
                <div>
                  <h3 className="font-medium mb-3">Pricing Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 border rounded">
                         <span>Monthly:</span>
                          <span className="font-medium">{formatPrice(selectedPlan.pricing?.monthly || 0)}</span>
                       </div>
                       <div className="flex justify-between p-2 border rounded">
                          <span>Quarterly:</span>
                          <span className="font-medium">{formatPrice(selectedPlan.pricing?.quarterly || 0)}</span>
                       </div>
                     </div>
                     <div className="space-y-2">
                       <div className="flex justify-between p-2 border rounded">
                          <span>Annually:</span>
                          <span className="font-medium">{formatPrice(selectedPlan.pricing?.annually || 0)}</span>
                       </div>
                       <div className="flex justify-between p-2 border rounded">
                          <span>Bi-annually:</span>
                          <span className="font-medium">{formatPrice(selectedPlan.pricing?.biannually || 0)}</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add-ons and Discounts */}
              <div className="grid grid-cols-2 gap-6">
                {selectedPlan.addOns && selectedPlan.addOns.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Add-ons</h3>
                    <div className="space-y-2">
                      {selectedPlan.addOns.map((addon: any, index: number) => (
                        <div key={index} className="flex justify-between p-2 border rounded">
                           <span>{addon.name}</span>
                           <span className="font-medium">{formatPrice(addon.price || 0)} {addon.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPlan.discounts && selectedPlan.discounts.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Available Discounts</h3>
                    <div className="space-y-2">
                      {selectedPlan.discounts.map((discount: any, index: number) => (
                        <div key={index} className="flex justify-between p-2 border rounded">
                          <span>{discount.description}</span>
                          <span className="font-medium">{discount.percentage}% off</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDetailsOpen(false);
              handleEditPlan(selectedPlan);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Tab Configuration Dialog */}
      <Dialog open={isTabConfigDialogOpen} onOpenChange={setIsTabConfigDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Tab Management</DialogTitle>
            <DialogDescription>
              Customize which tabs are visible and their display order in the billing plans interface.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Tab Configuration</h3>
              <div className="space-y-3">
                {tabConfig.sort((a, b) => a.order - b.order).map((tab) => (
                  <div key={tab.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-8 text-center">{tab.order}</span>
                        <Switch 
                          checked={tab.enabled}
                          onCheckedChange={(enabled) => handleTabToggle(tab.id, enabled)}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={tab.label}
                            onChange={(e) => handleTabLabelChange(tab.id, e.target.value)}
                            className="w-48"
                          />
                          <Badge variant="outline" className="text-xs">
                            {tab.id}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{tab.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTabOrderChange(tab.id, Math.max(1, tab.order - 1))}
                        disabled={tab.order === 1}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTabOrderChange(tab.id, Math.min(tabConfig.length, tab.order + 1))}
                        disabled={tab.order === tabConfig.length}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Preview</h3>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex gap-2 flex-wrap">
                  {enabledTabs.map((tab) => (
                    <Badge key={tab.id} variant="secondary">
                      {tab.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {enabledTabs.length} of {tabConfig.length} tabs enabled
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={resetTabConfig}>
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsTabConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveTabConfig}>
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}