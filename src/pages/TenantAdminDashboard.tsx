import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
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
  Settings,
  TrendingDown,
  Boxes,
  PiggyBank,
  Clock,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';
import { useEffectivePricing } from '@/hooks/useEffectivePricing';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { CashDrawerCard } from '@/components/CashDrawerCard';
// Removed unused recharts import that was causing module loading issues

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

function TenantAdminDashboard() {
  const { user, tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const [userProfile, setUserProfile] = useState<any>(null);
  const { formatPrice } = useCurrencyUpdate();
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cashDrawerRefreshKey, setCashDrawerRefreshKey] = useState(0);

  // Get effective pricing for the current subscription
  const { effectivePricing } = useEffectivePricing(
    tenantId, 
    currentSubscription?.billing_plan_id
  );

  // Fetch subscription data and user profile
  useEffect(() => {
    if (tenantId) {
      console.log('Fetching subscription for tenant:', tenantId);
      fetchCurrentSubscription();
      fetchDashboardData();
    }
    if (user?.id) {
      fetchUserProfile();
    }
  }, [tenantId, user?.id]);

  // Listen for cash drawer updates
  useEffect(() => {
    const handleCashDrawerUpdate = () => {
      setCashDrawerRefreshKey(prev => prev + 1);
    };

    window.addEventListener('cashDrawerUpdated', handleCashDrawerUpdate);
    return () => window.removeEventListener('cashDrawerUpdated', handleCashDrawerUpdate);
  }, []);

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
        .in('status', ['active', 'pending', 'trialing', 'trial'])
        .maybeSingle();

      console.log('Subscription fetch result:', { data, error });
      if (error && error.code !== 'PGRST116') throw error;
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  // Fetch user profile for accurate display name
  const fetchUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.warn('Error fetching user profile:', error);
    }
  };

  // Fast dashboard data fetch with minimal queries
  const fetchDashboardData = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    const today = new Date();
    const startDate = `${format(today, 'yyyy-MM-dd')}T00:00:00.000Z`;
    const endDate = `${format(today, 'yyyy-MM-dd')}T23:59:59.999Z`;
    
    try {
      console.log('🚀 Fast dashboard fetch for tenant:', tenantId);
      
      // Only 3 essential queries for speed
      const [
        salesResponse, 
        productsResponse, 
        customersResponse
      ] = await Promise.all([
        // Today's sales only
        supabase
          .from('sales')
          .select('total_amount, created_at, status')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .limit(100),
        
        // Basic product count and stock
        supabase
          .from('products')
          .select('id, stock_quantity, min_stock_level, is_active')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .limit(100),
        
        // Customer count
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
      ]);

      console.log('📊 Dashboard data loaded:', {
        sales: salesResponse.data?.length,
        products: productsResponse.data?.length,
        customers: customersResponse.count
      });

      // Check for errors
      if (salesResponse.error) throw salesResponse.error;
      if (productsResponse.error) throw productsResponse.error;
      if (customersResponse.error) throw customersResponse.error;

      // Fast calculations
      const sales = salesResponse.data || [];
      const products = productsResponse.data || [];

      const completedSales = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'refunded');
      const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
      const salesCount = completedSales.length;
      const totalCustomers = customersResponse.count || 0;
      
      const lowStockProducts = products.filter(product => {
        const stock = product.stock_quantity || 0;
        const minLevel = product.min_stock_level || 0;
        return stock <= minLevel && stock > 0;
      });
      
      const outOfStockProducts = products.filter(product => (product.stock_quantity || 0) === 0);

      const result = {
        revenue,
        salesCount,
        totalCustomers,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalProducts: products.length
      };

      console.log('🚀 Fast dashboard loaded:', result);
      setDashboardData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData({
        revenue: 0,
        salesCount: 0,
        totalCustomers: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalProducts: 0
      });
    } finally {
      setLoading(false);
    }
  };

  console.log('🎯 CURRENT DASHBOARD DATA:', {
    loading,
    dashboardData,
    tenantId
  });

  const businessStats = [
    {
      title: "Today's Revenue",
      value: dashboardData?.revenue || 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+0%",
      trend: "up"
    },
    {
      title: "Total Customers",
      value: dashboardData?.totalCustomers || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+0%",
      trend: "up"
    },
    {
      title: "Today's Sales",
      value: dashboardData?.salesCount || 0,
      icon: ShoppingCart,
      color: "text-purple-600", 
      bgColor: "bg-purple-50",
      change: "+0%",
      trend: "up"
    },
    {
      title: "Low Stock Items",
      value: dashboardData?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: "+0%",
      trend: "up"
    }
  ];

  const productStats = [
    {
      title: "Total Products",
      value: dashboardData?.totalProducts || 0,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Low Stock Items",
      value: dashboardData?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Out of Stock",
      value: dashboardData?.outOfStockCount || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getTimeBasedGreeting()}, {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening with your business today.
          </p>
        </div>
        <Button 
          onClick={fetchDashboardData}
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
          ) : (
            <ArrowUpRight className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Subscription Status */}
      {currentSubscription && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Crown className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{currentSubscription.billing_plans?.name || 'Current Plan'}</p>
                  <p className="text-sm text-muted-foreground">
                    {effectivePricing ? (
                      <>
                        {formatPrice(effectivePricing.effective_amount)}/{currentSubscription.billing_plans?.period}
                        {effectivePricing.is_custom && (
                          <Badge variant="secondary" className="ml-2">Custom Pricing</Badge>
                        )}
                      </>
                    ) : (
                      `${formatPrice(currentSubscription.billing_plans?.price || 0)}/${currentSubscription.billing_plans?.period}`
                    )}
                  </p>
                </div>
              </div>
              <Badge 
                variant={currentSubscription.status === 'active' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {currentSubscription.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {businessStats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground truncate">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.title.includes('Revenue') 
                      ? formatCurrency(stat.value) 
                      : stat.value.toLocaleString()
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {productStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-xl font-bold">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash Drawer */}
      <CashDrawerCard 
        key={cashDrawerRefreshKey} 
        dateRange={{
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: format(new Date(), 'yyyy-MM-dd')
        }}
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>
            Common business operations to get you started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link to="/admin/sales">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm">New Sale</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link to="/admin/products">
                <Package className="h-5 w-5" />
                <span className="text-sm">Manage Products</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link to="/admin/customers">
                <Users className="h-5 w-5" />
                <span className="text-sm">Customers</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link to="/admin/reports">
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm">View Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant */}
      <FloatingAIAssistant />
    </div>
  );
}

export default TenantAdminDashboard;