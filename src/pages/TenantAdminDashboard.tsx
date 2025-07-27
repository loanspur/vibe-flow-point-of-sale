import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowUpRight,
  Eye,
  AlertTriangle,
  Crown,
  Settings,
  Calendar,
  TrendingDown,
  Boxes,
  PiggyBank
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function TenantAdminDashboard() {
  const { user, tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const { formatPrice } = useCurrencyUpdate();
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch subscription data
  useEffect(() => {
    if (tenantId) {
      console.log('Fetching subscription for tenant:', tenantId);
      fetchCurrentSubscription();
    }
  }, [tenantId]);

  const fetchCurrentSubscription = async () => {
    try {
      console.log('Starting subscription fetch...');
      const { data, error } = await supabase
        .from('tenant_subscription_details')
        .select(`
          *,
          billing_plans (
            name,
            price,
            period
          )
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'pending'])
        .maybeSingle();

      console.log('Subscription fetch result:', { data, error });
      if (error && error.code !== 'PGRST116') throw error;
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  // Fetch enhanced dashboard data with date filtering
  const { data: dashboardData, loading } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: null, error: null };
      
      const startDate = `${dateRange.startDate}T00:00:00.000Z`;
      const endDate = `${dateRange.endDate}T23:59:59.999Z`;
      
      try {
        console.log('Fetching dashboard data for tenant:', tenantId, 'Date range:', dateRange);
        
        // Fetch all data in parallel for better performance
        const [
          salesResponse, 
          productsResponse, 
          customersResponse, 
          purchasesResponse,
          saleItemsResponse
        ] = await Promise.all([
          // Sales data for the date range including customer_id
          supabase
            .from('sales')
            .select('total_amount, created_at, customer_id')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate)
            .lte('created_at', endDate),
          
          // Products with stock info
          supabase
            .from('products')
            .select('id, stock_quantity, min_stock_level, price, cost_price')
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
          
          // Customers count
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId),
          
          // Purchases data for the date range
          supabase
            .from('purchases')
            .select('total_amount, created_at')
            .eq('tenant_id', tenantId)
            .gte('created_at', startDate)
            .lte('created_at', endDate),
          
          // Sale items with product info for COGS calculation
          supabase
            .from('sale_items')
            .select(`
              quantity,
              unit_price,
              total_price,
              product_id,
              variant_id,
              products!inner(cost_price, price),
              sales!inner(created_at, tenant_id)
            `)
            .eq('sales.tenant_id', tenantId)
            .gte('sales.created_at', startDate)
            .lte('sales.created_at', endDate),
        ]);

        console.log('Sales response:', salesResponse);
        console.log('Products response:', productsResponse);
        console.log('Customers response:', customersResponse);
        console.log('Purchases response:', purchasesResponse);
        console.log('Sale items response:', saleItemsResponse);

        // Check for errors
        if (salesResponse.error) throw salesResponse.error;
        if (productsResponse.error) throw productsResponse.error;
        if (customersResponse.error) throw customersResponse.error;
        if (purchasesResponse.error) throw purchasesResponse.error;
        if (saleItemsResponse.error) throw saleItemsResponse.error;

        // Calculate metrics
        const revenue = salesResponse.data?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
        const salesCount = salesResponse.data?.length || 0;
        const totalCustomers = customersResponse.count || 0;
        const totalPurchases = purchasesResponse.data?.reduce((sum, purchase) => sum + Number(purchase.total_amount || 0), 0) || 0;
        
        // Calculate active customers (unique customers who made purchases in the period)
        const activeCustomers = [...new Set(salesResponse.data?.map(sale => sale.customer_id).filter(Boolean))].length || 0;
        
        // Calculate stock values using null coalescing
        const stockByPurchasePrice = productsResponse.data?.reduce((sum, product) => 
          sum + ((product.stock_quantity || 0) * (product.cost_price || 0)), 0) || 0;
        const stockBySalePrice = productsResponse.data?.reduce((sum, product) => 
          sum + ((product.stock_quantity || 0) * (product.price || 0)), 0) || 0;
        
        // Calculate COGS from actual sale items - if cost_price is 0, use unit_price as fallback
        const cogs = saleItemsResponse.data?.reduce((sum, item) => {
          const costPrice = item.products?.cost_price || 0;
          const unitPrice = item.unit_price || 0;
          const actualCost = costPrice > 0 ? costPrice : unitPrice * 0.7; // Use 70% of selling price as estimated cost if no cost_price
          return sum + ((item.quantity || 0) * actualCost);
        }, 0) || 0;
        const profit = revenue - cogs;
        
        // Calculate profitable products (products with price > cost_price)
        const profitableProducts = productsResponse.data?.filter(product => 
          (product.price || 0) > (product.cost_price || 0) && (product.cost_price || 0) > 0
        ).length || 0;
        
        // Low stock count
        const lowStockCount = productsResponse.data?.filter(product => 
          (product.stock_quantity || 0) <= (product.min_stock_level || 0) && (product.min_stock_level || 0) > 0
        ).length || 0;

        const result = {
          revenue,
          salesCount,
          totalCustomers,
          activeCustomers,
          totalPurchases,
          stockByPurchasePrice,
          stockBySalePrice,
          profit,
          cogs,
          lowStockCount,
          totalProducts: productsResponse.data?.length || 0,
          profitableProducts
        };

        console.log('Calculated dashboard metrics:', result);

        return {
          data: result,
          error: null
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
          data: {
            revenue: 0,
            salesCount: 0,
            totalCustomers: 0,
            activeCustomers: 0,
            totalPurchases: 0,
            stockByPurchasePrice: 0,
            stockBySalePrice: 0,
            profit: 0,
            cogs: 0,
            lowStockCount: 0,
            totalProducts: 0,
            profitableProducts: 0
          },
          error: error
        };
      }
    },
    [tenantId, dateRange.startDate, dateRange.endDate],
    {
      enabled: !!tenantId,
      staleTime: 1 * 60 * 1000, // 1 minute cache for more real-time data
      cacheKey: `enhanced-dashboard-${tenantId}-${dateRange.startDate}-${dateRange.endDate}`
    }
  );

  const businessStats = [
    {
      title: "Revenue",
      value: formatCurrency(dashboardData?.revenue || 0),
      change: dashboardData?.revenue ? `${dashboardData.salesCount} sales` : "No sales",
      changeType: dashboardData?.revenue ? "positive" : "neutral",
      icon: DollarSign,
      description: "selected period",
      trend: [0, 0, 0, dashboardData?.revenue || 0]
    },
    {
      title: "Total Purchases",
      value: formatCurrency(dashboardData?.totalPurchases || 0),
      change: dashboardData?.totalPurchases ? "purchases made" : "No purchases",
      changeType: dashboardData?.totalPurchases ? "neutral" : "neutral", 
      icon: ShoppingCart,
      description: "selected period",
      trend: [0, 0, 0, dashboardData?.totalPurchases || 0]
    },
    {
      title: "Stock Value (Purchase)",
      value: formatCurrency(dashboardData?.stockByPurchasePrice || 0),
      change: dashboardData?.lowStockCount ? `${dashboardData.lowStockCount} low stock` : "in stock",
      changeType: dashboardData?.lowStockCount && dashboardData.lowStockCount > 0 ? "warning" : "positive",
      icon: Boxes,
      description: "at cost price",
      trend: [0, 0, 0, dashboardData?.stockByPurchasePrice || 0]
    },
    {
      title: "Stock Value (Sale)",
      value: formatCurrency(dashboardData?.stockBySalePrice || 0),
      change: "potential value",
      changeType: "positive",
      icon: TrendingUp,
      description: "at selling price",
      trend: [0, 0, 0, dashboardData?.stockBySalePrice || 0]
    },
    {
      title: "Profit",
      value: formatCurrency(dashboardData?.profit || 0),
      change: dashboardData?.profit && dashboardData.profit > 0 ? "profitable" : dashboardData?.profit && dashboardData.profit < 0 ? "loss" : "break even",
      changeType: dashboardData?.profit && dashboardData.profit > 0 ? "positive" : dashboardData?.profit && dashboardData.profit < 0 ? "warning" : "neutral",
      icon: dashboardData?.profit && dashboardData.profit < 0 ? TrendingDown : PiggyBank,
      description: "selected period",
      trend: [0, 0, 0, Math.abs(dashboardData?.profit || 0)]
    },
    {
      title: "Active Customers",
      value: (dashboardData?.activeCustomers || 0).toString(),
      change: dashboardData?.activeCustomers ? "purchased this period" : "no purchases",
      changeType: dashboardData?.activeCustomers ? "positive" : "neutral",
      icon: Users,
      description: "selected period",
      trend: [0, 0, 0, dashboardData?.activeCustomers || 0]
    },
    {
      title: "Profitable Products",
      value: (dashboardData?.profitableProducts || 0).toString(),
      change: dashboardData?.profitableProducts ? "with positive margin" : "no profitable items",
      changeType: dashboardData?.profitableProducts ? "positive" : "warning",
      icon: TrendingUp,
      description: "in catalog",
      trend: [0, 0, 0, dashboardData?.profitableProducts || 0]
    }
  ];

  const quickActions = [
    {
      title: "New Sale",
      description: "Process a transaction",
      icon: ShoppingCart,
      href: "/pos",
      color: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
      iconColor: "text-green-600",
      primary: true
    },
    {
      title: "Add Product", 
      description: "Expand your inventory",
      icon: Package,
      href: "/admin/products",
      color: "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      title: "View Reports",
      description: "Business analytics",
      icon: BarChart3,
      href: "/admin/reports",
      color: "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200",
      iconColor: "text-purple-600"
    },
    {
      title: "Manage Team",
      description: "Staff & permissions",
      icon: Users,
      href: "/admin/team",
      color: "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200",
      iconColor: "text-orange-600"
    }
  ];

  // Generate real activity based on actual data
  const recentActivity = [];
  
  if (dashboardData?.revenue && dashboardData.revenue > 0) {
    recentActivity.push({
      id: "#PERIOD",
      type: "sales_summary",
      customer: "Period Sales",
      amount: formatCurrency(dashboardData.revenue),
      time: "Selected Period",
      status: "completed",
      description: `${dashboardData.salesCount} sale(s) completed`
    });
  } else {
    recentActivity.push({
      id: "#NONE",
      type: "info",
      customer: "No Sales",
      amount: formatCurrency(0),
      time: "Selected Period",
      status: "info",
      description: "No transactions recorded for selected period"
    });
  }

  const alerts = [];
  
  if (dashboardData?.lowStockCount && dashboardData.lowStockCount > 0) {
    alerts.push({
      type: "warning",
      message: `${dashboardData.lowStockCount} products are running low on stock`,
      action: "View inventory",
      time: "Now"
    });
  }

  if (!dashboardData?.revenue || dashboardData.revenue === 0) {
    alerts.push({
      type: "info", 
      message: "No sales recorded for selected period - consider promoting your products",
      action: "View promotions",
      time: "Now"
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {getTimeBasedGreeting()}, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your business.
        </p>
      </div>

      {/* Date Filter Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
          <CardDescription>
            Select date range to view specific period metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDateRange({
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                setDateRange({
                  startDate: lastWeek.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }}
            >
              Last 7 Days
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                setDateRange({
                  startDate: lastMonth.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Plan Display */}
      {currentSubscription ? (
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">
                    {currentSubscription.billing_plans?.name} Plan
                  </p>
                  <p className="text-sm text-blue-600">
                    {currentSubscription.status === 'pending' ? (
                      <>Payment pending</>
                    ) : currentSubscription.trial_end && new Date(currentSubscription.trial_end) > new Date() ? (
                      <>Trial expires {new Date(currentSubscription.trial_end).toLocaleDateString()}</>
                    ) : currentSubscription.trial_end ? (
                      <>Trial expired - Payment required</>
                    ) : (
                      <>Active subscription</>
                    )}
                  </p>
                  {currentSubscription.next_billing_date && (
                    <p className="text-xs text-blue-500 mt-1">
                      Next billing: {new Date(currentSubscription.next_billing_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {formatPrice(currentSubscription.billing_plans?.price || 0)}
                  </p>
                  <p className="text-sm text-blue-600">per {currentSubscription.billing_plans?.period}</p>
                </div>
                <Link to="/admin/settings?tab=billing">
                  <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-100">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Plan
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-orange-900">
                    No Active Subscription
                  </p>
                  <p className="text-sm text-orange-600">
                    Choose a plan to unlock all features
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Link to="/admin/settings?tab=billing">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Crown className="h-4 w-4 mr-2" />
                    Choose Plan
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Alerts Bar */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className={`flex items-center justify-between rounded-lg p-3 ${
                alert.type === 'warning' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    alert.type === 'warning' ? 'text-orange-900' : 'text-blue-900'
                  }`}>{alert.message}</span>
                  <span className={`text-xs ${
                    alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                  }`}>• {alert.time}</span>
                </div>
                <Button variant="ghost" size="sm" className={`${
                  alert.type === 'warning' ? 'text-orange-700 hover:text-orange-900' : 'text-blue-700 hover:text-blue-900'
                }`}>
                  {alert.action}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          {businessStats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.changeType === 'positive';
            const isWarning = stat.changeType === 'warning';
            const isNeutral = stat.changeType === 'neutral';
            
            return (
              <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isWarning ? 'bg-orange-100' : isPositive ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      isWarning ? 'text-orange-600' : isPositive ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isPositive && <ArrowUpRight className="h-3 w-3 text-green-600" />}
                      {isWarning && <AlertTriangle className="h-3 w-3 text-orange-600" />}
                      <span className={`text-xs font-medium ${
                        isWarning ? 'text-orange-600' : isPositive ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} to={action.href}>
                  <Card className={`${action.color} hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group ${action.primary ? 'ring-2 ring-green-200' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`h-5 w-5 ${action.iconColor}`} />
                        </div>
                        {action.primary && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold">{action.title}</CardTitle>
                      <CardDescription className="text-sm">{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Activity and Performance */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest business transactions</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-500' : 
                          activity.status === 'refunded' ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{activity.id}</p>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.customer}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${activity.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                          {activity.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Period Performance</CardTitle>
              <CardDescription>Sales summary and key metrics for selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(dashboardData?.revenue || 0)}</p>
                  </div>
                  <div className="text-right">
                    <TrendingUp className="h-6 w-6 text-green-600 mb-1" />
                    <Badge className="bg-green-100 text-green-700">Period</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sales Count</span>
                    <span className="font-semibold">{dashboardData?.salesCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Sale Value</span>
                    <span className="font-semibold">{formatCurrency(dashboardData?.revenue && dashboardData?.salesCount ? dashboardData.revenue / dashboardData.salesCount : 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Profit</span>
                    <span className={`font-semibold ${dashboardData?.profit && dashboardData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dashboardData?.profit || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Products in Catalog</span>
                    <span className="font-semibold">{dashboardData?.totalProducts || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />
    </div>
  );
}