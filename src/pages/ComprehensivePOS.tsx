import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import PromotionManagement from '@/components/PromotionManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { useCurrencyUpdate } from '@/hooks/useCurrencyUpdate';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart,
  DollarSign,
  FileText,
  Calculator,
  UserPlus,
  Phone,
  ShoppingBag,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  Building2,
  Settings
} from 'lucide-react';

interface DashboardData {
  todaysSales: number;
  todaysOrders: number;
  productsCount: number;
  lowStockCount: number;
  customersCount: number;
  recentSales: any[];
  products: any[];
}

export default function ComprehensivePOS() {
  const { formatPrice } = useCurrencyUpdate();
  const { user, tenantId, userRole, refreshUserInfo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tenantSetupLoading, setTenantSetupLoading] = useState(false);
  const [missingTenantForm, setMissingTenantForm] = useState({
    businessName: '',
    ownerName: ''
  });

  // Debug logging
  console.log('ComprehensivePOS render:', { user: !!user, tenantId, userRole });

  const handleSetupMissingTenant = async () => {
    if (!missingTenantForm.businessName || !missingTenantForm.ownerName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setTenantSetupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-missing-tenant', {
        body: {
          businessName: missingTenantForm.businessName,
          ownerName: missingTenantForm.ownerName,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to setup tenant');
      }

      toast({
        title: "Success!",
        description: "Your business has been set up successfully. Redirecting to admin dashboard...",
      });

      // Refresh user info to get the new role and tenant_id, then redirect
      await refreshUserInfo();
      
      // Navigate to admin dashboard
      setTimeout(() => {
        navigate('/admin');
      }, 500);

    } catch (error: any) {
      console.error('Tenant setup error:', error);
      toast({
        title: "Setup Error",
        description: error.message || "Failed to setup your business. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTenantSetupLoading(false);
    }
  };

  // Show setup warning if no tenant is configured
  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Complete Your Business Setup</CardTitle>
                <CardDescription>
                  Complete your business setup to access the POS system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Your Business Name"
                    value={missingTenantForm.businessName}
                    onChange={(e) => setMissingTenantForm(prev => ({ ...prev, businessName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Your Full Name</Label>
                  <Input
                    id="ownerName"
                    placeholder="John Doe"
                    value={missingTenantForm.ownerName}
                    onChange={(e) => setMissingTenantForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleSetupMissingTenant}
                  disabled={tenantSetupLoading || !missingTenantForm.businessName || !missingTenantForm.ownerName}
                  className="w-full"
                >
                  {tenantSetupLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting up...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Fetch real dashboard data
  const { data: dashboardData, loading: dashboardLoading } = useOptimizedQuery<DashboardData>(
    async () => {
      if (!tenantId) return { data: null, error: null };
      
      try {
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch today's sales total
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', today + 'T00:00:00')
          .lt('created_at', today + 'T23:59:59');
        
        if (salesError) throw salesError;
        
        // Count today's orders
        const todaysSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
        const todaysOrders = salesData?.length || 0;
        
        // Get total products count
        const { count: productsCount, error: productsCountError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('is_active', true);
        
        if (productsCountError) throw productsCountError;
        
        // Get low stock products count  
        const { data: lowStockProducts, error: lowStockError } = await supabase
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .filter('stock_quantity', 'lte', 'min_stock_level');
        
        if (lowStockError) throw lowStockError;
        const lowStockCount = lowStockProducts?.length || 0;
        
        // Get total customers count
        const { count: customersCount, error: customersError } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('type', 'customer');
        
        if (customersError) throw customersError;
        
        // Get recent sales
        const { data: recentSalesData, error: recentSalesError } = await supabase
          .from('sales')
          .select(`
            id,
            total_amount,
            created_at,
            contacts!inner (name)
          `)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recentSalesError) throw recentSalesError;
        
        // Get recent products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            sku,
            price,
            stock_quantity,
            product_categories (name)
          `)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (productsError) throw productsError;
        
        const result: DashboardData = {
          todaysSales,
          todaysOrders,
          productsCount: productsCount || 0,
          lowStockCount: lowStockCount || 0,
          customersCount: customersCount || 0,
          recentSales: recentSalesData || [],
          products: productsData || []
        };
        
        return { data: result, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    [tenantId],
    {
      enabled: !!tenantId,
      staleTime: 1000 * 60 * 2, // 2 minutes
      cacheKey: `pos-dashboard-metrics-${tenantId}`
    }
  );

  const stats = [
    { 
      title: "Today's Sales", 
      value: dashboardData?.todaysSales ? formatPrice(dashboardData.todaysSales) : formatPrice(0), 
      change: dashboardData?.todaysOrders ? `${dashboardData.todaysOrders} orders` : "No orders today", 
      icon: DollarSign, 
      color: "text-green-600" 
    },
    { 
      title: "Orders", 
      value: dashboardData?.todaysOrders?.toString() || "0", 
      change: "Today", 
      icon: ShoppingCart, 
      color: "text-blue-600" 
    },
    { 
      title: "Products", 
      value: dashboardData?.productsCount?.toString() || "0", 
      change: dashboardData?.lowStockCount ? `${dashboardData.lowStockCount} low stock` : "All in stock", 
      icon: Package, 
      color: "text-purple-600" 
    },
    { 
      title: "Customers", 
      value: dashboardData?.customersCount?.toString() || "0", 
      change: "Total customers", 
      icon: Users, 
      color: "text-orange-600" 
    }
  ];

  const recentSales = dashboardData?.recentSales?.map((sale: any, index: number) => ({
    id: `#${String(index + 1).padStart(3, '0')}`,
    customer: sale.contacts?.name || 'Unknown Customer',
    amount: formatPrice(Number(sale.total_amount || 0)),
    time: new Date(sale.created_at).toLocaleString(),
    status: 'completed'
  })) || [];

  const products = dashboardData?.products?.map((product: any) => ({
    id: product.id,
    name: product.name,
    sku: product.sku || 'N/A',
    price: formatPrice(Number(product.price || 0)),
    stock: product.stock_quantity || 0,
    category: product.product_categories?.name || 'Uncategorized'
  })) || [];

  const ActionButton = ({ icon: Icon, children, onClick, variant = "outline" }: any) => (
    <Button variant={variant} size="sm" onClick={onClick} className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {children}
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">POS Management System</h1>
            <p className="text-muted-foreground">Complete business management solution</p>
            {tenantId && (
              <Badge variant="outline" className="mt-2">
                <Building2 className="h-3 w-3 mr-1" />
                Tenant Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary capitalize">
              {userRole || 'User'}
            </Badge>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Quick Sale
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-2 min-w-[300px]">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
              <TabsTrigger value="promotions" className="text-xs sm:text-sm">Promotions</TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Latest transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : recentSales.length > 0 ? (
                      recentSales.map((sale, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div>
                              <p className="font-medium">{sale.id}</p>
                              <p className="text-sm text-muted-foreground">{sale.customer}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{sale.amount}</p>
                            <p className="text-sm text-muted-foreground">{sale.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No sales yet today</p>
                        <p className="text-xs text-muted-foreground">Start making sales to see them here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Frequently used features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <ActionButton icon={ShoppingCart} onClick={() => navigate('/admin/sales')}>
                      Manage Sales
                    </ActionButton>
                    <ActionButton icon={Package} onClick={() => navigate('/admin/products')}>
                      Manage Products
                    </ActionButton>
                    <ActionButton icon={UserPlus} onClick={() => navigate('/admin/customers')}>
                      Manage Contacts
                    </ActionButton>
                    <ActionButton icon={Users} onClick={() => navigate('/admin/team')}>
                      Manage Team
                    </ActionButton>
                    <ActionButton icon={Settings} onClick={() => navigate('/admin/settings')}>
                      Settings
                    </ActionButton>
                    <ActionButton icon={Calculator} onClick={() => navigate('/admin/purchases')}>
                      Purchases
                    </ActionButton>
                    <ActionButton icon={Calculator} onClick={() => navigate('/admin/accounting')}>
                      Accounting
                    </ActionButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>







          {/* Promotions Tab */}
          <TabsContent value="promotions" className="space-y-6">
            {tenantId ? (
              <PromotionManagement />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
                  <p className="text-muted-foreground text-center">
                    Promotion management requires an active tenant. Please contact your administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>



        </Tabs>
      </div>
    </div>
  );
}