import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';

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
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans (
            name,
            price,
            period
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .maybeSingle();

      console.log('Subscription fetch result:', { data, error });
      if (error && error.code !== 'PGRST116') throw error;
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  // Fetch real dashboard data
  const { data: dashboardData, loading } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: null, error: null };
      
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // Fetch all data in parallel for better performance
        const [todaySalesResponse, totalOrdersResponse, productsResponse, customersResponse, lowStockResponse] = await Promise.all([
          supabase
            .from('sales')
            .select('total_amount')
            .eq('tenant_id', tenantId)
            .gte('created_at', today),
          supabase
            .from('sales')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', today),
          supabase
            .from('products')
            .select('id, stock_quantity, min_stock_level', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId),
          supabase
            .from('products')
            .select('id, stock_quantity, min_stock_level', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .then(response => {
              if (response.error) throw response.error;
              const lowStockProducts = response.data.filter(product => 
                product.stock_quantity <= product.min_stock_level || product.stock_quantity === 0
              );
              return { ...response, count: lowStockProducts.length };
            })
        ]);

        const todayRevenue = todaySalesResponse.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
        const todayOrders = totalOrdersResponse.count || 0;
        const totalProducts = productsResponse.count || 0;
        const totalCustomers = customersResponse.count || 0;
        const lowStockCount = lowStockResponse.count || 0;

        return {
          data: {
            todayRevenue,
            todayOrders,
            totalProducts,
            totalCustomers,
            lowStockCount
          },
          error: null
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw error;
      }
    },
    [tenantId],
    {
      enabled: !!tenantId,
      staleTime: 2 * 60 * 1000, // 2 minutes cache
      cacheKey: `tenant-dashboard-${tenantId}`
    }
  );

  const businessStats = [
    {
      title: "Today's Revenue",
      value: formatCurrency(dashboardData?.todayRevenue || 0),
      change: dashboardData?.todayRevenue ? "+0%" : "No sales",
      changeType: dashboardData?.todayRevenue ? "positive" : "neutral",
      icon: DollarSign,
      description: "vs yesterday",
      trend: [0, 0, 0, dashboardData?.todayRevenue || 0]
    },
    {
      title: "Total Orders",
      value: (dashboardData?.todayOrders || 0).toString(),
      change: dashboardData?.todayOrders ? `+${dashboardData.todayOrders}` : "No orders",
      changeType: dashboardData?.todayOrders ? "positive" : "neutral", 
      icon: ShoppingCart,
      description: "orders today",
      trend: [0, 0, 0, dashboardData?.todayOrders || 0]
    },
    {
      title: "Active Products",
      value: (dashboardData?.totalProducts || 0).toString(),
      change: dashboardData?.lowStockCount ? `${dashboardData.lowStockCount} low stock` : "in stock",
      changeType: dashboardData?.lowStockCount && dashboardData.lowStockCount > 0 ? "warning" : "positive",
      icon: Package,
      description: "need attention",
      trend: [0, 0, 0, dashboardData?.totalProducts || 0]
    },
    {
      title: "Team Members",
      value: "1", // Current user
      change: "1 online",
      changeType: "neutral",
      icon: Users,
      description: "currently active",
      trend: [1, 1, 1, 1]
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
  
  if (dashboardData?.todayRevenue && dashboardData.todayRevenue > 0) {
    recentActivity.push({
      id: "#TODAY",
      type: "sales_summary",
      customer: "Today's Sales",
      amount: formatCurrency(dashboardData.todayRevenue),
      time: "Today",
      status: "completed",
      description: `${dashboardData.todayOrders} order(s) completed`
    });
  } else {
    recentActivity.push({
      id: "#NONE",
      type: "info",
      customer: "No Sales Today",
      amount: formatCurrency(0),
      time: "Today",
      status: "info",
      description: "No transactions recorded today"
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

  if (!dashboardData?.todayRevenue || dashboardData.todayRevenue === 0) {
    alerts.push({
      type: "info", 
      message: "No sales recorded today - consider promoting your products",
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
          Here's what's happening with your business today.
        </p>
      </div>

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
                    {new Date(currentSubscription.expires_at) > new Date() ? (
                      <>Trial expires {new Date(currentSubscription.expires_at).toLocaleDateString()}</>
                    ) : (
                      <>Trial expired - Payment required</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {formatPrice((currentSubscription.billing_plans?.price || 0) / 100)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
              <CardTitle>Today's Performance</CardTitle>
              <CardDescription>Sales summary and key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(dashboardData?.todayRevenue || 0)}</p>
                  </div>
                  <div className="text-right">
                    <TrendingUp className="h-6 w-6 text-green-600 mb-1" />
                    <Badge className="bg-green-100 text-green-700">Today</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <span className="font-semibold">{dashboardData?.todayOrders || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Order Value</span>
                    <span className="font-semibold">{formatCurrency(dashboardData?.todayRevenue && dashboardData?.todayOrders ? dashboardData.todayRevenue / dashboardData.todayOrders : 0)}</span>
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
    </div>
  );
}