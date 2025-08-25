import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

interface DashboardMetrics {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  unique_customers: number;
  low_stock_items: number;
  total_products: number;
  new_customers: number;
  active_customers: number;
}

interface SalesData {
  period: string;
  revenue: number;
  orders: number;
  customers: number;
}

interface ProductPerformance {
  product_id: string;
  product_name: string;
  sku: string;
  total_sold: number;
  total_revenue: number;
  avg_price: number;
}

interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  last_order_date: string;
  days_since_last_order: number;
}

interface FinancialMetrics {
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  gross_margin: number;
  total_orders: number;
  avg_order_value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function PerformanceDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [granularity, setGranularity] = useState('day');
  
  // Dashboard data state
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);

  // Calculate date range
  const dateRange = useMemo(() => {
    const days = parseInt(timeRange);
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    return { dateFrom: dateFrom.toISOString().split('T')[0], dateTo: dateTo.toISOString().split('T')[0] };
  }, [timeRange]);

  // Fetch dashboard metrics using server-side aggregation
  const fetchDashboardMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_tenant_id: user?.tenant_id,
        p_date_from: dateRange.dateFrom,
        p_date_to: dateRange.dateTo
      });

      if (error) throw error;
      setMetrics(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard metrics',
        variant: 'destructive',
      });
    }
  };

  // Fetch sales aggregation data
  const fetchSalesData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_sales_aggregation', {
        p_tenant_id: user?.tenant_id,
        p_granularity: granularity,
        p_date_from: dateRange.dateFrom,
        p_date_to: dateRange.dateTo
      });

      if (error) throw error;
      setSalesData(data || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales data',
        variant: 'destructive',
      });
    }
  };

  // Fetch top performing products
  const fetchTopProducts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_product_performance', {
        p_tenant_id: user?.tenant_id,
        p_limit: 10,
        p_date_from: dateRange.dateFrom
      });

      if (error) throw error;
      setTopProducts(data || []);
    } catch (error) {
      console.error('Error fetching product performance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product performance',
        variant: 'destructive',
      });
    }
  };

  // Fetch customer analytics
  const fetchCustomerAnalytics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_customer_analytics', {
        p_tenant_id: user?.tenant_id,
        p_date_from: dateRange.dateFrom
      });

      if (error) throw error;
      setCustomerAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer analytics',
        variant: 'destructive',
      });
    }
  };

  // Fetch financial metrics
  const fetchFinancialMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_financial_metrics', {
        p_tenant_id: user?.tenant_id,
        p_date_from: dateRange.dateFrom,
        p_date_to: dateRange.dateTo
      });

      if (error) throw error;
      setFinancialMetrics(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial metrics',
        variant: 'destructive',
      });
    }
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchDashboardMetrics(),
        fetchSalesData(),
        fetchTopProducts(),
        fetchCustomerAnalytics(),
        fetchFinancialMetrics()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh dashboard data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDashboardData();
      toast({
        title: 'Success',
        description: 'Dashboard data refreshed successfully',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data on component mount and when date range changes
  useEffect(() => {
    if (user?.tenant_id) {
      loadDashboardData();
    }
  }, [user?.tenant_id, dateRange, granularity]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  // Calculate percentage change (mock data for now)
  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time insights and analytics powered by server-side aggregation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? formatCurrency(metrics.total_revenue) : 'KES 0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.total_orders || 0} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? formatCurrency(metrics.avg_order_value) : 'KES 0'}
            </div>
            <p className="text-xs text-muted-foreground">
              per order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(metrics?.active_customers || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{formatNumber(metrics?.new_customers || 0)} new this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.low_stock_items || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              out of {formatNumber(metrics?.total_products || 0)} products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      {financialMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Performance</CardTitle>
            <CardDescription>
              Revenue, costs, and profitability analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialMetrics.gross_profit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {financialMetrics.gross_margin.toFixed(1)}% margin
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialMetrics.total_cost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cost of goods sold
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold">
                  {formatNumber(financialMetrics.total_orders)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total orders
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Order</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(financialMetrics.avg_order_value)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Average value
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Analytics */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sales Trends
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Top Products
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
              <CardDescription>
                Revenue and order trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Select value={granularity} onValueChange={setGranularity}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                      name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Customers'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>
                Best-selling products by revenue and quantity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProducts.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'total_revenue' ? formatCurrency(value) : formatNumber(value),
                      name === 'total_revenue' ? 'Revenue' : 'Quantity Sold'
                    ]}
                  />
                  <Bar dataKey="total_sold" fill="#0088FE" name="Quantity Sold" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
              <CardDescription>
                Customer spending patterns and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerAnalytics.slice(0, 10).map((customer, index) => (
                  <div key={customer.customer_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {customer.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{customer.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.total_orders} orders • {formatCurrency(customer.total_spent)} spent
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(customer.avg_order_value)}</p>
                      <p className="text-sm text-muted-foreground">
                        avg order
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
