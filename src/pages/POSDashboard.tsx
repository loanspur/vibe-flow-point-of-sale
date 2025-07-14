import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle 
} from "lucide-react";

interface DashboardStats {
  totalSales: number;
  todaySales: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  recentSales: any[];
}

const POSDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    todaySales: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Get total sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .eq('status', 'completed');

      const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      
      // Get today's sales
      const today = new Date().toISOString().split('T')[0];
      const todaySales = salesData?.filter(sale => 
        sale.created_at.startsWith(today)
      ).reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      // Get products stats
      const { data: productsData } = await supabase
        .from('products')
        .select('id, stock_quantity, min_stock_level')
        .eq('is_active', true);

      const totalProducts = productsData?.length || 0;
      const lowStockProducts = productsData?.filter(product => 
        product.stock_quantity <= product.min_stock_level
      ).length || 0;

      // Get customers count
      const { data: customersData } = await supabase
        .from('customers')
        .select('id');

      const totalCustomers = customersData?.length || 0;

      // Get recent sales
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          receipt_number,
          customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalSales,
        todaySales,
        totalProducts,
        lowStockProducts,
        totalCustomers,
        recentSales: recentSalesData || []
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">POS Dashboard</h1>
        <Badge variant="secondary">Welcome back!</Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todaySales.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            {stats.lowStockProducts > 0 && (
              <div className="flex items-center mt-2 text-sm text-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.lowStockProducts} low stock
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentSales.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">#{sale.receipt_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {sale.customers?.name || 'Walk-in Customer'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(sale.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${Number(sale.total_amount).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No sales recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default POSDashboard;