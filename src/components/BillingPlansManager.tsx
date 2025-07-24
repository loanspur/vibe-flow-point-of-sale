import { useState } from "react";
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
  Package
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";
import { useToast } from "@/hooks/use-toast";

// Enhanced billing plans data
const billingPlans = [
  {
    id: "basic",
    name: "Starter",
    price: 29,
    originalPrice: 39,
    period: "month",
    description: "Perfect for small businesses just getting started",
    badge: "Popular",
    badgeColor: "bg-blue-100 text-blue-800",
    popularity: 85,
    status: "active",
    customers: 420,
    mrr: 12180,
    arpu: 29,
    churnRate: 2.3,
    conversionRate: 18.5,
    trialConversion: 72,
    features: [
      { name: "1 Location", included: true, limit: "1" },
      { name: "Up to 3 Staff Users", included: true, limit: "3" },
      { name: "Basic Inventory Management", included: true },
      { name: "Standard Reports", included: true },
      { name: "Email Support", included: true },
      { name: "Mobile App Access", included: true },
      { name: "API Access", included: false },
      { name: "Custom Integrations", included: false }
    ],
    pricing: {
      monthly: 29,
      quarterly: 87, // 3 months
      annually: 290, // 12 months (save ~17%)
      biannually: 174 // 6 months
    },
    discounts: [
      { type: "annual", percentage: 17, description: "Save 17% with annual billing" },
      { type: "student", percentage: 20, description: "Student discount" }
    ],
    addOns: [
      { name: "Extra User Seats", price: 5, unit: "per user/month" },
      { name: "Additional Storage", price: 10, unit: "per 10GB/month" }
    ]
  },
  {
    id: "professional",
    name: "Professional",
    price: 79,
    originalPrice: 99,
    period: "month",
    description: "Ideal for growing businesses with multiple needs",
    badge: "Most Popular",
    badgeColor: "bg-green-100 text-green-800",
    popularity: 95,
    status: "active",
    customers: 580,
    mrr: 45820,
    arpu: 79,
    churnRate: 1.8,
    conversionRate: 24.7,
    trialConversion: 84,
    features: [
      { name: "Up to 5 Locations", included: true, limit: "5" },
      { name: "Unlimited Staff Users", included: true },
      { name: "Advanced Inventory & Analytics", included: true },
      { name: "Custom Reports & Dashboards", included: true },
      { name: "Priority Support", included: true },
      { name: "API Access", included: true },
      { name: "Customer Loyalty Programs", included: true },
      { name: "Multi-tenant Management", included: true },
      { name: "Custom Integrations", included: false },
      { name: "White-label Solutions", included: false }
    ],
    pricing: {
      monthly: 79,
      quarterly: 237,
      annually: 790,
      biannually: 474
    },
    discounts: [
      { type: "annual", percentage: 17, description: "Save 17% with annual billing" },
      { type: "enterprise", percentage: 15, description: "Volume discount for 10+ seats" }
    ],
    addOns: [
      { name: "Extra Locations", price: 15, unit: "per location/month" },
      { name: "Advanced Analytics", price: 25, unit: "per month" },
      { name: "Custom Integrations", price: 100, unit: "per integration" }
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    originalPrice: 249,
    period: "month",
    description: "For large businesses requiring advanced features",
    badge: "Enterprise",
    badgeColor: "bg-purple-100 text-purple-800",
    popularity: 78,
    status: "active",
    customers: 247,
    mrr: 49153,
    arpu: 199,
    churnRate: 1.2,
    conversionRate: 31.2,
    trialConversion: 91,
    features: [
      { name: "Unlimited Locations", included: true },
      { name: "Unlimited Staff Users", included: true },
      { name: "White-label Solutions", included: true },
      { name: "Custom Integrations", included: true },
      { name: "24/7 Phone Support", included: true },
      { name: "Dedicated Account Manager", included: true },
      { name: "Advanced Security Features", included: true },
      { name: "Custom Training", included: true },
      { name: "SLA Guarantee", included: true },
      { name: "Priority Feature Requests", included: true }
    ],
    pricing: {
      monthly: 199,
      quarterly: 597,
      annually: 1990,
      biannually: 1194
    },
    discounts: [
      { type: "annual", percentage: 17, description: "Save 17% with annual billing" },
      { type: "custom", percentage: 25, description: "Custom enterprise pricing" }
    ],
    addOns: [
      { name: "Custom Development", price: 500, unit: "per hour" },
      { name: "Dedicated Support", price: 1000, unit: "per month" },
      { name: "Training Sessions", price: 200, unit: "per session" }
    ]
  }
];

// Plan performance metrics
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
  }
];

export default function BillingPlansManager() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTabConfigDialogOpen, setIsTabConfigDialogOpen] = useState(false);
  const [tabConfig, setTabConfig] = useState(defaultTabConfig);
  const { toast } = useToast();

  // Get enabled tabs sorted by order
  const enabledTabs = tabConfig.filter(tab => tab.enabled).sort((a, b) => a.order - b.order);

  const handleCreatePlan = () => {
    toast({
      title: "Plan Created",
      description: "New billing plan has been created successfully.",
    });
    setIsCreateDialogOpen(false);
  };

  const handleEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setIsEditDialogOpen(true);
  };

  const handleDuplicatePlan = (plan: any) => {
    toast({
      title: "Plan Duplicated",
      description: `${plan.name} plan has been duplicated successfully.`,
    });
  };

  const handleDeletePlan = (plan: any) => {
    toast({
      title: "Plan Deleted",
      description: `${plan.name} plan has been deleted.`,
      variant: "destructive"
    });
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

  const PlanCard = ({ plan, showActions = false }: { plan: any, showActions?: boolean }) => (
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
              <Button variant="ghost" size="sm" onClick={() => handleEditPlan(plan)}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDuplicatePlan(plan)}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-3xl font-bold">${plan.price}</span>
          <span className="text-muted-foreground">/{plan.period}</span>
          {plan.originalPrice > plan.price && (
            <span className="text-sm line-through text-muted-foreground">${plan.originalPrice}</span>
          )}
        </div>
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
            <span className="font-medium">${plan.mrr.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Churn Rate:</span>
            <span className="font-medium">{plan.churnRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Conversion:</span>
            <span className="font-medium">{plan.conversionRate}%</span>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Key Features:</h4>
          <ul className="space-y-1 text-sm">
            {plan.features.slice(0, 4).map((feature: any, index: number) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span>{feature.name}</span>
              </li>
            ))}
            {plan.features.length > 4 && (
              <li className="text-muted-foreground text-xs">
                +{plan.features.length - 4} more features
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );

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
                <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
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
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreatePlan}>
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
            <div className="text-2xl font-bold">{billingPlans.length}</div>
            <p className="text-xs text-muted-foreground">Active plans</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingPlans.reduce((sum, plan) => sum + plan.mrr, 0).toLocaleString()}</div>
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
              {(billingPlans.reduce((sum, plan) => sum + plan.conversionRate, 0) / billingPlans.length).toFixed(1)}%
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
            <div className="text-2xl font-bold">{billingPlans.reduce((sum, plan) => sum + plan.customers, 0).toLocaleString()}</div>
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
            {billingPlans.map((plan) => (
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
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={planPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="basic" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="professional" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="enterprise" stackId="1" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
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
            {billingPlans.map((plan) => (
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
                  {billingPlans.map((plan) => (
                    <div key={plan.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{plan.name}</span>
                        <span className="font-medium">{plan.conversionRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(plan.conversionRate / 35) * 100}%` }}
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
                  {billingPlans.map((plan) => (
                    <div key={plan.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">{plan.customers} customers</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{plan.churnRate}%</div>
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
                  {billingPlans.map((plan) => (
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
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>MRR breakdown by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  basic: { label: "Basic", color: "#8884d8" },
                  professional: { label: "Professional", color: "#82ca9d" },
                  enterprise: { label: "Enterprise", color: "#ffc658" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={billingPlans}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="mrr"
                        label={({ name, mrr }) => `${name}: $${mrr.toLocaleString()}`}
                      >
                        {billingPlans.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={["#8884d8", "#82ca9d", "#ffc658"][index]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Popularity Trends</CardTitle>
                <CardDescription>Customer acquisition by plan over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  basic: { label: "Basic", color: "#8884d8" },
                  professional: { label: "Professional", color: "#82ca9d" },
                  enterprise: { label: "Enterprise", color: "#ffc658" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={planPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="basic" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="professional" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="enterprise" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
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
                  {billingPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{plan.name}</div>
                          {plan.badge && (
                            <Badge variant="secondary" className="text-xs">{plan.badge}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>${plan.price}/{plan.period}</TableCell>
                      <TableCell>{plan.customers.toLocaleString()}</TableCell>
                      <TableCell>${plan.mrr.toLocaleString()}</TableCell>
                      <TableCell>${plan.arpu}</TableCell>
                      <TableCell>{plan.conversionRate}%</TableCell>
                      <TableCell>{plan.churnRate}%</TableCell>
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