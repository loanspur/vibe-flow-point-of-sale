import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, TrendingUp, TrendingDown, Users, Building2, DollarSign, Activity, Server, Database, Shield, Gauge } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CurrencyIcon } from "@/components/ui/currency-icon";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";

export default function SuperAdminAnalytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { formatLocalCurrency, tenantCurrency } = useCurrencyConversion();
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    activeTenants: 0,
    totalUsers: 0,
    systemUptime: 99.9,
    billingPlans: [],
    tenantStats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);

        // Fetch billing plans for revenue
        const { data: billingPlans, error: plansError } = await supabase
          .from('billing_plans')
          .select('*')
          .eq('is_active', true);

        // Fetch tenants
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, name, is_active')
          .eq('is_active', true);

        // Fetch total users
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, tenant_id');

        if (!plansError && !tenantsError && !usersError) {
          const totalRevenue = billingPlans?.reduce((sum, plan) => sum + (plan.mrr || 0), 0) * 12 || 0;
          const activeTenants = tenants?.length || 0;
          const totalUsers = users?.length || 0;

          setAnalyticsData({
            totalRevenue,
            activeTenants,
            totalUsers,
            systemUptime: 99.9,
            billingPlans: billingPlans || [],
            tenantStats: tenants || []
          });
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Analytics data export has been initiated.",
    });
  };

  const platformMetrics = [
    { 
      metric: "Total Revenue", 
      value: loading ? "..." : formatLocalCurrency(analyticsData.totalRevenue), 
      change: "+12.5%", 
      trend: "up",
      icon: () => <CurrencyIcon currency={tenantCurrency?.currency || 'USD'} className="h-4 w-4" />
    },
    { 
      metric: "Active Tenants", 
      value: loading ? "..." : analyticsData.activeTenants.toString(), 
      change: "+8.2%", 
      trend: "up",
      icon: Building2
    },
    { 
      metric: "Total Users", 
      value: loading ? "..." : analyticsData.totalUsers.toLocaleString(), 
      change: "+15.3%", 
      trend: "up",
      icon: Users
    },
    { 
      metric: "System Uptime", 
      value: `${analyticsData.systemUptime}%`, 
      change: "+0.1%", 
      trend: "up",
      icon: Activity
    }
  ];

  const systemMetrics = [
    { metric: "CPU Usage", value: "45%", status: "healthy" },
    { metric: "Memory Usage", value: "68%", status: "healthy" },
    { metric: "Database Load", value: "32%", status: "healthy" },
    { metric: "API Response Time", value: "125ms", status: "healthy" }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into platform performance and usage</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {platformMetrics.map((metric, index) => {
          const IconComponent = typeof metric.icon === 'function' ? metric.icon : metric.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                {metric.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {typeof metric.icon === 'function' ? <IconComponent /> : <IconComponent className="h-5 w-5" />}
                  {metric.value}
                </div>
                <p className={`text-xs ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                  {metric.change} from last period
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        {/* Revenue Analytics */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-muted-foreground col-span-3">Loading billing plans...</p>
            ) : analyticsData.billingPlans.length > 0 ? (
              analyticsData.billingPlans.map((plan: any, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {plan.name} Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">{plan.customers || 0}</div>
                    <p className="text-sm text-muted-foreground mb-4">Active customers</p>
                    <div className="text-lg font-semibold">{formatLocalCurrency(plan.mrr || 0)}</div>
                    <p className="text-sm text-muted-foreground">Monthly revenue</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground col-span-3">No billing plans found.</p>
            )}
          </div>
        </TabsContent>

        {/* Tenant Analytics */}
        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Overview</CardTitle>
              <CardDescription>Active tenants on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {loading ? "..." : analyticsData.activeTenants}
              </div>
              <p className="text-sm text-muted-foreground">Total active tenants</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : analyticsData.totalUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">+15.3% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Users per Tenant</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : analyticsData.activeTenants > 0 ? Math.round(analyticsData.totalUsers / analyticsData.activeTenants) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Users per tenant</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+12.4%</div>
                <p className="text-xs text-muted-foreground">Growth rate this month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <Badge variant={metric.status === "healthy" ? "default" : "destructive"} className="mt-2">
                    {metric.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>API Servers</span>
                  <Badge variant="default">Operational</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  <Badge variant="default">Operational</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>CDN</span>
                  <Badge variant="default">Operational</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Storage</span>
                  <Badge variant="default">Operational</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Failed Login Attempts</span>
                  <span className="font-medium">127</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Blocked IPs</span>
                  <span className="font-medium">23</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>SSL Certificate</span>
                  <Badge variant="default">Valid</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Data Backups</span>
                  <Badge variant="default">Complete</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}