import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
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
  XCircle,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useEffectivePricing } from '@/hooks/useEffectivePricing';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { CashDrawerCard } from '@/components/CashDrawerCard';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SubdomainFeatureAlerts } from '@/components/SubdomainFeatureAlerts';
// Removed unused imports that were causing build issues
// import { useAutoRefresh } from '@/hooks/useAutoRefresh';
// import { useDebouncedRealtimeRefresh } from '@/hooks/useDebouncedRealtimeRefresh';

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

function TenantAdminDashboard() {
  // Removed excessive console logging for better performance
  
  const { user, tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cashDrawerRefreshKey, setCashDrawerRefreshKey] = useState(0);
  // Date filters
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null}>({ start: new Date(), end: new Date() });
  

  console.log('🏠 Dashboard auth state:', { user: !!user, tenantId, userEmail: user?.email });

  // Get effective pricing for the current subscription
  const { effectivePricing } = useEffectivePricing(
    tenantId, 
    currentSubscription?.billing_plan_id
  );

  // Stabilized effect to prevent render loops
  useEffect(() => {
    if (!tenantId || !user?.id) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const initializeDashboard = async () => {
      setLoading(true);
      
      try {
        // Fetch all data in parallel
        const promises = [
          fetchCurrentSubscription(),
          fetchDashboardData(),
          fetchUserProfile()
        ];
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, [tenantId, user?.id]); // Only depend on essential values

  // Listen for cash drawer updates - stable event listener
  useEffect(() => {
    const handleCashDrawerUpdate = () => {
      setCashDrawerRefreshKey(prev => prev + 1);
    };

    window.addEventListener('cashDrawerUpdated', handleCashDrawerUpdate);
    return () => window.removeEventListener('cashDrawerUpdated', handleCashDrawerUpdate);
  }, []);

  // Date filter effect - debounced to prevent excessive calls
  useEffect(() => {
    if (!tenantId || loading) return;
    
    const timeoutId = setTimeout(() => {
      fetchDashboardData();
    }, 500); // Increased debounce time

    return () => clearTimeout(timeoutId);
  }, [dateFilter, dateRange.start, dateRange.end, tenantId]); // Added tenantId dependency

  // Remove these problematic hook calls:
  // useAutoRefresh({ interval: 30000, onRefresh: () => fetchDashboardData(), visibilityBased: true, enabled: true });
  // useDebouncedRealtimeRefresh({
  //   tables: ['sales', 'products', 'customers', 'accounts_receivable', 'accounts_payable', 'purchase_items'],
  //   tenantId,
  //   onChange: () => fetchDashboardData(),
  //   enabled: true,
  //   debounceMs: 2000,
  // });

  const fetchCurrentSubscription = async () => {
    if (!tenantId) return;
    
    try {
      console.log('Fetching subscription for tenant:', tenantId);
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

  // Optimized dashboard data fetch
  const fetchDashboardData = async () => {
    if (!tenantId) return;
    
    // Don't set loading if already loaded to prevent flickering
    const wasLoading = loading;
    if (!dashboardData) setLoading(true);

    // Determine date window
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;

    if (dateFilter === 'today') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay(); // 0=Sun
      startOfWeek.setDate(startOfWeek.getDate() - day);
      rangeStart = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      rangeStart = dateRange.start || new Date(now.getFullYear(), now.getMonth(), now.getDate());
      rangeEnd = dateRange.end || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const startDate = `${format(rangeStart, 'yyyy-MM-dd')}T00:00:00.000Z`;
    const endDate = `${format(rangeEnd, 'yyyy-MM-dd')}T23:59:59.999Z`;

    try {
      console.log('🚀 Dashboard fetch for tenant with filters:', { tenantId, dateFilter, startDate, endDate });

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const next30Str = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      const [
        salesResponse,
        productsResponse,
        customersResponse,
        arResponse,
        apResponse,
        profitLossResponse,
        expiringItemsResponse
      ] = await Promise.all([
        // Sales in range
        supabase
          .from('sales')
          .select('total_amount, created_at, status')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate),

        // Products for stock stats
        supabase
          .from('products')
          .select('id, stock_quantity, min_stock_level, is_active, cost_price, price')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),

        // Customer count
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),

        // Accounts receivable due
        supabase
          .from('accounts_receivable')
          .select('outstanding_amount, status')
          .eq('tenant_id', tenantId)
          .in('status', ['outstanding', 'partial', 'overdue']),

        // Accounts payable due
        supabase
          .from('accounts_payable')
          .select('outstanding_amount, status')
          .eq('tenant_id', tenantId)
          .in('status', ['outstanding', 'partial', 'overdue']),

        // Profit/Loss for period
        supabase.rpc('calculate_profit_loss', {
          tenant_id_param: tenantId,
          start_date_param: format(rangeStart, 'yyyy-MM-dd'),
          end_date_param: format(rangeEnd, 'yyyy-MM-dd')
        }),

        // Expiring items in next 30 days (filtered later by tenant products)
        supabase
          .from('purchase_items')
          .select('id, product_id, expiry_date')
          .gte('expiry_date', todayStr)
          .lte('expiry_date', next30Str)
      ]);

      // Error checks
      if (salesResponse.error) throw salesResponse.error;
      if (productsResponse.error) throw productsResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (arResponse.error) throw arResponse.error;
      if (apResponse.error) throw apResponse.error;
      if (profitLossResponse.error) throw profitLossResponse.error;
      if (expiringItemsResponse.error) throw expiringItemsResponse.error;

      // Calculations
      const sales = salesResponse.data || [];
      const products = productsResponse.data || [];

      const completedSales = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'refunded');
      const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
      const salesCount = completedSales.length;
      const totalCustomers = customersResponse.count || 0;

      const lowStockProducts = products.filter((p: any) => (p.stock_quantity || 0) <= (p.min_stock_level || 0) && (p.stock_quantity || 0) > 0);
      const outOfStockProducts = products.filter((p: any) => (p.stock_quantity || 0) === 0);

      const stockPurchaseValue = products.reduce((sum: number, p: any) => sum + (Number(p.stock_quantity || 0) * Number(p.cost_price || 0)), 0);
      const stockSaleValue = products.reduce((sum: number, p: any) => sum + (Number(p.stock_quantity || 0) * Number(p.price || 0)), 0);

      // Expiry alerts - filter expiring lots to tenant products
      const productIdsSet = new Set(products.map((p: any) => p.id));
      const expiringSoonItems = (expiringItemsResponse.data || []).filter((i: any) => productIdsSet.has(i.product_id));
      const expiringSoonCount = expiringSoonItems.length;

      const arDue = (arResponse.data || []).reduce((sum: number, r: any) => sum + Number(r.outstanding_amount || 0), 0);
      const apDue = (apResponse.data || []).reduce((sum: number, r: any) => sum + Number(r.outstanding_amount || 0), 0);

      const plRow = Array.isArray(profitLossResponse.data) ? profitLossResponse.data[0] : null;
      const expenses = Number(plRow?.expenses || 0);
      const profit = Number(plRow?.profit_loss || 0);

      const result = {
        revenue,
        salesCount,
        totalCustomers,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalProducts: products.length,
        stockPurchaseValue,
        stockSaleValue,
        arDue,
        apDue,
        expenses,
        profit,
        expiringSoonCount,
        startDate,
        endDate
      };

      console.log('📈 Dashboard metrics:', result);
      setDashboardData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData({
        revenue: 0,
        salesCount: 0,
        totalCustomers: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalProducts: 0,
        stockPurchaseValue: 0,
        stockSaleValue: 0,
        arDue: 0,
        apDue: 0,
        expenses: 0,
        profit: 0,
        expiringSoonCount: 0
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
      title: dateFilter === 'today' ? "Today's Revenue" : 'Revenue',
      value: dashboardData?.revenue || 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+0%",
      trend: "up",
      to: "/admin/reports?view=sales"
    },
    {
      title: "Total Customers",
      value: dashboardData?.totalCustomers || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+0%",
      trend: "up",
      to: "/admin/customers"
    },
    {
      title: dateFilter === 'today' ? "Today's Sales" : 'Sales',
      value: dashboardData?.salesCount || 0,
      icon: ShoppingCart,
      color: "text-purple-600", 
      bgColor: "bg-purple-50",
      change: "+0%",
      trend: "up",
      to: "/admin/sales"
    },
    {
      title: dateFilter === 'today' ? "Today's Profit" : 'Profit',
      value: dashboardData?.profit || 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      change: "+0%",
      trend: "up",
      to: "/admin/reports?view=profit-loss"
    }
  ];

  const productStats = [
    {
      title: "Total Products",
      value: dashboardData?.totalProducts || 0,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
      to: "/admin/products"
    },
    {
      title: "Low Stock Items",
      value: dashboardData?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      to: "/admin/products?filter=low-stock"
    },
    {
      title: "Out of Stock",
      value: dashboardData?.outOfStockCount || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      to: "/admin/products?filter=out-of-stock"
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
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getTimeBasedGreeting()}, {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant={dateFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('today')}
            >
              Today
            </Button>
            <Button
              variant={dateFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('week')}
            >
              Week
            </Button>
            <Button
              variant={dateFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('month')}
            >
              Month
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={dateFilter === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateFilter === 'custom' && dateRange.start && dateRange.end
                    ? `${format(dateRange.start, 'LLL d, y')} - ${format(dateRange.end, 'LLL d, y')}`
                    : 'Custom'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.start || undefined, to: dateRange.end || undefined } as any}
                  onSelect={(range: any) => {
                    setDateRange({ start: range?.from || null, end: range?.to || null });
                    if (range?.from && range?.to) setDateFilter('custom');
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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
      </div>

      {/* Subdomain Feature Alerts */}
      <SubdomainFeatureAlerts />

      {/* Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Stock Alerts</span>
          </CardTitle>
          <CardDescription>Expiry and quantity alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/admin/products?filter=low-profit" className="block">
              <div className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Low Profit Items</p>
                  <p className="text-xl font-bold">{dashboardData?.lowProfitCount || 0}</p>
                </div>
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </Link>
            <Link to="/admin/products?filter=expiring" className="block">
              <div className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon (30 days)</p>
                  <p className="text-xl font-bold">{dashboardData?.expiringSoonCount || 0}</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>


      {/* Business Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {businessStats.map((stat, index) => (
          <Link key={index} to={stat.to} className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
            <Card className="relative overflow-hidden hover:bg-muted/40 transition-colors">
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
          </Link>
        ))}
      </div>

      {/* Product Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {productStats.map((stat, index) => (
          <Link key={index} to={stat.to} className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
            <Card>
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
          </Link>
        ))}
      </div>

      {/* Inventory Value */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/admin/products" className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Value (Purchase)</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData?.stockPurchaseValue || 0)}</p>
              </div>
              <Boxes className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/products" className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Value (Sale)</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData?.stockSaleValue || 0)}</p>
              </div>
              <PiggyBank className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/reports?view=receivables" className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoices Due</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboardData?.arDue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/reports?view=payables" className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchases Due</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboardData?.apDue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/reports?view=expenses" className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <TrendingDown className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expenses</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboardData?.expenses || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/reports?view=profit-loss" className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profit</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboardData?.profit || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
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
