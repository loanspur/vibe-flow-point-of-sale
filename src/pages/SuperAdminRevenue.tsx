import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  RefreshCw
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { CurrencyIcon } from "@/components/ui/currency-icon";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { supabase } from "@/integrations/supabase/client";

// Revenue overview metrics
const revenueMetrics = [
  { metric: "Monthly Recurring Revenue", value: "$284,500", change: "+15.2%", trend: "up", icon: DollarSign },
  { metric: "Annual Recurring Revenue", value: "$3.4M", change: "+18.7%", trend: "up", icon: TrendingUp },
  { metric: "Average Revenue Per User", value: "$228", change: "+3.4%", trend: "up", icon: Users },
  { metric: "Customer Lifetime Value", value: "$2,840", change: "+8.9%", trend: "up", icon: Building2 }
];

// Monthly revenue data
const monthlyRevenueData = [
  { month: "Jul 2024", mrr: 245000, arr: 2940000, newMrr: 15000, churnMrr: 8000, netMrr: 7000 },
  { month: "Aug 2024", mrr: 252000, arr: 3024000, newMrr: 18000, churnMrr: 11000, netMrr: 7000 },
  { month: "Sep 2024", mrr: 259000, arr: 3108000, newMrr: 16000, churnMrr: 9000, netMrr: 7000 },
  { month: "Oct 2024", mrr: 267000, arr: 3204000, newMrr: 20000, churnMrr: 12000, netMrr: 8000 },
  { month: "Nov 2024", mrr: 275000, arr: 3300000, newMrr: 22000, churnMrr: 14000, netMrr: 8000 },
  { month: "Dec 2024", mrr: 284500, arr: 3414000, newMrr: 25000, churnMrr: 15500, netMrr: 9500 }
];

// Revenue by plan
const revenueByPlan = [
  { plan: "Basic", mrr: 84000, customers: 420, arpu: 200, color: "#8884d8" },
  { plan: "Pro", mrr: 145000, customers: 580, arpu: 250, color: "#82ca9d" },
  { plan: "Enterprise", mrr: 55500, customers: 111, arpu: 500, color: "#ffc658" }
];

// Payment transactions
const recentTransactions = [
  { id: "TXN-001", tenant: "TechCorp Solutions", amount: 2500, plan: "Enterprise", status: "success", date: "2024-12-20", method: "Credit Card" },
  { id: "TXN-002", tenant: "Retail Giants Inc", amount: 750, plan: "Pro", status: "success", date: "2024-12-20", method: "ACH" },
  { id: "TXN-003", tenant: "StartUp Dynamics", amount: 250, plan: "Pro", status: "failed", date: "2024-12-19", method: "Credit Card" },
  { id: "TXN-004", tenant: "Global Enterprises", amount: 5000, plan: "Enterprise", status: "success", date: "2024-12-19", method: "Wire Transfer" },
  { id: "TXN-005", tenant: "Local Business Co", amount: 200, plan: "Basic", status: "pending", date: "2024-12-18", method: "Credit Card" },
  { id: "TXN-006", tenant: "Innovation Labs", amount: 750, plan: "Pro", status: "success", date: "2024-12-18", method: "Credit Card" },
  { id: "TXN-007", tenant: "Digital Solutions", amount: 200, plan: "Basic", status: "failed", date: "2024-12-17", method: "Credit Card" },
  { id: "TXN-008", tenant: "Enterprise Corp", amount: 2500, plan: "Enterprise", status: "success", date: "2024-12-17", method: "ACH" }
];

// Churn analytics
const churnData = [
  { month: "Jul", churnRate: 3.2, churned: 15, retained: 465 },
  { month: "Aug", churnRate: 2.8, churned: 14, retained: 486 },
  { month: "Sep", churnRate: 4.1, churned: 21, retained: 490 },
  { month: "Oct", churnRate: 3.5, churned: 18, retained: 497 },
  { month: "Nov", churnRate: 2.9, churned: 15, retained: 500 },
  { month: "Dec", churnRate: 3.8, churned: 19, retained: 481 }
];

export default function SuperAdminRevenue() {
  const [timeRange, setTimeRange] = useState("12m");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { formatLocalCurrency, tenantCurrency } = useCurrencyConversion();
  const [revenueData, setRevenueData] = useState({
    totalMRR: 0,
    totalARR: 0,
    averageARPU: 0,
    totalCustomers: 0,
    billingPlans: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        
        const { data: billingPlans, error } = await supabase
          .from('billing_plans')
          .select('*')
          .eq('is_active', true);

        if (!error && billingPlans) {
          const totalMRR = billingPlans.reduce((sum, plan) => sum + (plan.mrr || 0), 0);
          const totalCustomers = billingPlans.reduce((sum, plan) => sum + (plan.customers || 0), 0);
          const totalARR = totalMRR * 12;
          const averageARPU = totalCustomers > 0 ? totalMRR / totalCustomers : 0;

          setRevenueData({
            totalMRR,
            totalARR,
            averageARPU,
            totalCustomers,
            billingPlans
          });
        }
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  const handleExportRevenue = () => {
    toast({
      title: "Export Started",
      description: "Revenue report export has been initiated.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransactions = recentTransactions.filter(transaction => {
    const matchesSearch = transaction.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = transactionFilter === "all" || transaction.status === transactionFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Revenue Tracking</h1>
          <p className="text-muted-foreground">Monitor subscription revenue, payments, and financial metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="24m">Last 24 months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportRevenue} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <CurrencyIcon currency={tenantCurrency?.currency || 'USD'} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : formatLocalCurrency(revenueData.totalMRR)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+15.2% from last period</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : formatLocalCurrency(revenueData.totalARR)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+18.7% from last period</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Revenue Per User</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : formatLocalCurrency(revenueData.averageARPU)}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+3.4% from last period</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : revenueData.totalCustomers.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+8.9% from last period</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="churn">Churn Analysis</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        {/* Revenue Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Recurring Revenue Trend</CardTitle>
                <CardDescription>MRR growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  mrr: { label: "MRR", color: "hsl(var(--primary))" },
                  netMrr: { label: "Net New MRR", color: "hsl(var(--secondary))" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={3} />
                      <Line type="monotone" dataKey="netMrr" stroke="hsl(var(--secondary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Subscription Plan</CardTitle>
                <CardDescription>MRR distribution across plans</CardDescription>
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
                        data={revenueByPlan}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="mrr"
                        label={({ plan, mrr }) => `${plan}: $${mrr.toLocaleString()}`}
                      >
                        {revenueByPlan.map((entry, index) => (
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

          <Card>
            <CardHeader>
              <CardTitle>MRR Movement Analysis</CardTitle>
              <CardDescription>New, expansion, contraction, and churn MRR</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                newMrr: { label: "New MRR", color: "#22c55e" },
                churnMrr: { label: "Churned MRR", color: "#ef4444" },
                netMrr: { label: "Net MRR", color: "hsl(var(--primary))" }
              }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="newMrr" fill="#22c55e" />
                    <Bar dataKey="churnMrr" fill="#ef4444" />
                    <Bar dataKey="netMrr" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Analytics */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-muted-foreground col-span-3">Loading billing plans...</p>
            ) : revenueData.billingPlans.length > 0 ? (
              revenueData.billingPlans.map((plan: any, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary"></div>
                      {plan.name} Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold">{formatLocalCurrency(plan.mrr || 0)}</div>
                      <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{plan.customers || 0}</div>
                      <p className="text-sm text-muted-foreground">Active Customers</p>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{formatLocalCurrency(plan.price || 0)}</div>
                      <p className="text-sm text-muted-foreground">Price per month</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground col-span-3">No billing plans found.</p>
            )}
          </div>
        </TabsContent>

        {/* Transaction Management */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={transactionFilter} onValueChange={setTransactionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest payment transactions across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                      <TableCell className="font-medium">{transaction.tenant}</TableCell>
                      <TableCell>${transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{transaction.plan}</Badge>
                      </TableCell>
                      <TableCell>{transaction.method}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                          {transaction.status === "failed" && (
                            <Button variant="ghost" size="sm">
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Analysis */}
        <TabsContent value="churn" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Churn Rate</CardTitle>
                <CardDescription>Customer churn percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  churnRate: { label: "Churn Rate %", color: "#ef4444" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={churnData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="churnRate" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Retention</CardTitle>
                <CardDescription>Retained vs churned customers</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  retained: { label: "Retained", color: "#22c55e" },
                  churned: { label: "Churned", color: "#ef4444" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={churnData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="retained" fill="#22c55e" />
                      <Bar dataKey="churned" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Forecasting */}
        <TabsContent value="forecasting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>Predicted revenue based on current growth trends</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Forecasting models coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}