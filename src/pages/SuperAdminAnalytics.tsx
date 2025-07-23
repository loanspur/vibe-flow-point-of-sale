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

// Sample data - in a real app, this would come from your database
const platformMetrics = [
  { metric: "Total Revenue", value: "$2.4M", change: "+12.5%", trend: "up" },
  { metric: "Active Tenants", value: "1,247", change: "+8.2%", trend: "up" },
  { metric: "Total Users", value: "15,892", change: "+15.3%", trend: "up" },
  { metric: "System Uptime", value: "99.9%", change: "+0.1%", trend: "up" }
];

const revenueData = [
  { month: "Jan", revenue: 185000, tenants: 980 },
  { month: "Feb", revenue: 195000, tenants: 1020 },
  { month: "Mar", revenue: 210000, tenants: 1080 },
  { month: "Apr", revenue: 225000, tenants: 1150 },
  { month: "May", revenue: 235000, tenants: 1200 },
  { month: "Jun", revenue: 245000, tenants: 1247 }
];

const tenantDistribution = [
  { plan: "Basic", count: 420, revenue: 84000, color: "#8884d8" },
  { plan: "Pro", count: 580, revenue: 174000, color: "#82ca9d" },
  { plan: "Enterprise", count: 247, revenue: 123500, color: "#ffc658" }
];

const userActivityData = [
  { time: "00:00", active: 1200 },
  { time: "04:00", active: 800 },
  { time: "08:00", active: 2400 },
  { time: "12:00", active: 3200 },
  { time: "16:00", active: 2800 },
  { time: "20:00", active: 2000 }
];

const systemMetrics = [
  { metric: "CPU Usage", value: "45%", status: "healthy" },
  { metric: "Memory Usage", value: "68%", status: "healthy" },
  { metric: "Database Load", value: "32%", status: "healthy" },
  { metric: "API Response Time", value: "125ms", status: "healthy" }
];

const topTenants = [
  { name: "TechCorp Solutions", plan: "Enterprise", users: 450, revenue: 22500, growth: "+25%" },
  { name: "Retail Giants Inc", plan: "Pro", users: 280, revenue: 8400, growth: "+18%" },
  { name: "StartUp Dynamics", plan: "Pro", users: 120, revenue: 3600, growth: "+45%" },
  { name: "Global Enterprises", plan: "Enterprise", users: 680, revenue: 34000, growth: "+12%" },
  { name: "Local Business Co", plan: "Basic", users: 50, revenue: 1000, growth: "+8%" }
];

export default function SuperAdminAnalytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Analytics data export has been initiated.",
    });
  };

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
        {platformMetrics.map((metric, index) => (
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
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className={`text-xs ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                {metric.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Revenue Analytics */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue and tenant growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                  tenants: { label: "Tenants", color: "hsl(var(--secondary))" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="revenue" orientation="left" />
                      <YAxis yAxisId="tenants" orientation="right" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line yAxisId="tenants" type="monotone" dataKey="tenants" stroke="hsl(var(--secondary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>Distribution across subscription tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  basic: { label: "Basic", color: "#8884d8" },
                  pro: { label: "Pro", color: "#82ca9d" },
                  enterprise: { label: "Enterprise", color: "#ffc658" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tenantDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="revenue"
                        label={({ plan, revenue }) => `${plan}: $${revenue.toLocaleString()}`}
                      >
                        {tenantDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Tenants */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Tenants</CardTitle>
              <CardDescription>Highest revenue generating customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTenants.map((tenant, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">{tenant.users} users</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${tenant.revenue.toLocaleString()}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{tenant.plan}</Badge>
                        <span className="text-sm text-green-600">{tenant.growth}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenant Analytics */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {tenantDistribution.map((plan, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" style={{ color: plan.color }} />
                    {plan.plan} Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{plan.count}</div>
                  <p className="text-sm text-muted-foreground mb-4">Active tenants</p>
                  <div className="text-lg font-semibold">${plan.revenue.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Monthly revenue</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Growth</CardTitle>
              <CardDescription>New tenant acquisitions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                tenants: { label: "New Tenants", color: "hsl(var(--primary))" }
              }}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="tenants" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Active Users</CardTitle>
              <CardDescription>User activity throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                active: { label: "Active Users", color: "hsl(var(--primary))" }
              }}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="active" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15,892</div>
                <p className="text-xs text-muted-foreground">+15.3% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Active</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8,247</div>
                <p className="text-xs text-muted-foreground">+5.2% from yesterday</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24m</div>
                <p className="text-xs text-muted-foreground">+2.1% from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">234</div>
                <p className="text-xs text-muted-foreground">+12.4% from last week</p>
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

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Response times and throughput</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Average Response Time</span>
                  <span className="font-medium">125ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Requests per Minute</span>
                  <span className="font-medium">2,847</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Error Rate</span>
                  <span className="font-medium text-green-600">0.02%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Uptime</span>
                  <span className="font-medium text-green-600">99.97%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
                <CardDescription>Query performance and connections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Average Query Time</span>
                  <span className="font-medium">45ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Connections</span>
                  <span className="font-medium">234/500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cache Hit Rate</span>
                  <span className="font-medium text-green-600">94.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Storage Used</span>
                  <span className="font-medium">2.4TB/5TB</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}