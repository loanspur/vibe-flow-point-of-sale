import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Download, TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReportMetrics {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  avgOrderValue: number;
  todaySales: number;
  thisWeekSales: number;
  thisMonthSales: number;
  topProduct: string;
  lowStockCount: number;
  totalProducts: number;
  newCustomers: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalInventoryValue: number;
}

const Reports = () => {
  const { tenantId } = useAuth();
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalSales: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    todaySales: 0,
    thisWeekSales: 0,
    thisMonthSales: 0,
    topProduct: "No data",
    lowStockCount: 0,
    totalProducts: 0,
    newCustomers: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalInventoryValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchReportData();
    }
  }, [tenantId]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("total_amount, created_at")
        .eq("tenant_id", tenantId);

      if (salesError) throw salesError;

      // Fetch customers data
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, created_at")
        .eq("tenant_id", tenantId);

      if (customersError) throw customersError;

      // Fetch products data
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, cost, stock_quantity, min_stock_level")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      if (productsError) throw productsError;

      // Fetch top selling products with sales items
      const { data: topProductsData, error: topProductsError } = await supabase
        .from("sale_items")
        .select(`
          quantity,
          products:product_id (
            name
          ),
          sales:sale_id (
            tenant_id
          )
        `)
        .eq("sales.tenant_id", tenantId);

      if (topProductsError) throw topProductsError;

      // Calculate metrics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Calculate sales metrics
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalSales = salesData?.length || 0;
      
      const todaySales = salesData?.filter(sale => 
        new Date(sale.created_at) >= today
      ).reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const thisWeekSales = salesData?.filter(sale => 
        new Date(sale.created_at) >= thisWeekStart
      ).reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const thisMonthSales = salesData?.filter(sale => 
        new Date(sale.created_at) >= thisMonthStart
      ).reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Calculate customer metrics
      const totalCustomers = customersData?.length || 0;
      const newCustomers = customersData?.filter(customer => 
        new Date(customer.created_at) >= thisMonthStart
      ).length || 0;

      // Calculate product metrics
      const totalProducts = productsData?.length || 0;
      const lowStockCount = productsData?.filter(product => 
        product.stock_quantity <= product.min_stock_level
      ).length || 0;

      // Calculate inventory value
      const totalInventoryValue = productsData?.reduce((sum, product) => 
        sum + (Number(product.cost || 0) * product.stock_quantity), 0) || 0;

      // Calculate gross profit (simplified)
      const grossProfit = productsData?.reduce((sum, product) => 
        sum + ((Number(product.price) - Number(product.cost || 0)) * product.stock_quantity), 0) || 0;

      // Find top product
      const productSales = new Map();
      topProductsData?.forEach(item => {
        const productName = item.products?.name || "Unknown";
        productSales.set(productName, (productSales.get(productName) || 0) + item.quantity);
      });
      
      const topProduct = productSales.size > 0 
        ? Array.from(productSales.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : "No data";

      setMetrics({
        totalRevenue,
        totalSales,
        totalCustomers,
        avgOrderValue,
        todaySales,
        thisWeekSales,
        thisMonthSales,
        topProduct,
        lowStockCount,
        totalProducts,
        newCustomers,
        grossProfit,
        totalExpenses: 0, // Would need expense tracking
        netProfit: grossProfit, // Simplified calculation
        totalInventoryValue,
      });

    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Reports</h1>
                <p className="text-muted-foreground">Business analytics and insights</p>
              </div>
            </div>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "Loading..." : formatCurrency(metrics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {metrics.totalSales} sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "Loading..." : metrics.totalSales.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Today: {formatCurrency(metrics.todaySales)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "Loading..." : metrics.totalCustomers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+{metrics.newCustomers}</span> this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "Loading..." : formatCurrency(metrics.avgOrderValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on all sales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => alert('Sales Reports - View Details')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Sales Reports
              </CardTitle>
              <CardDescription>
                Daily, weekly, and monthly sales analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Today's Sales: <span className="font-semibold">{formatCurrency(metrics.todaySales)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  This Week: <span className="font-semibold">{formatCurrency(metrics.thisWeekSales)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  This Month: <span className="font-semibold">{formatCurrency(metrics.thisMonthSales)}</span>
                </p>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); alert('View Sales Details'); }}>View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => alert('Product Performance - View Details')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Product Performance
              </CardTitle>
              <CardDescription>
                Best and worst performing products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Top Seller: <span className="font-semibold">{metrics.topProduct}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Low Stock: <span className="font-semibold text-red-600">{metrics.lowStockCount} items</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Products: <span className="font-semibold">{metrics.totalProducts}</span>
                </p>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); alert('View Product Performance Details'); }}>View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => alert('Customer Analytics - View Details')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Customer Analytics
              </CardTitle>
              <CardDescription>
                Customer behavior and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  New Customers: <span className="font-semibold">{metrics.newCustomers}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Customers: <span className="font-semibold">{metrics.totalCustomers}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Avg. Order: <span className="font-semibold">{formatCurrency(metrics.avgOrderValue)}</span>
                </p>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); alert('View Customer Analytics Details'); }}>View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => alert('Financial Reports - View Details')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Financial Reports
              </CardTitle>
              <CardDescription>
                Profit, loss, and financial summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Gross Profit: <span className="font-semibold">{formatCurrency(metrics.grossProfit)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Revenue: <span className="font-semibold">{formatCurrency(metrics.totalRevenue)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Net Profit: <span className="font-semibold">{formatCurrency(metrics.netProfit)}</span>
                </p>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); alert('View Financial Reports Details'); }}>View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => alert('Inventory Reports - View Details')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                Inventory Reports
              </CardTitle>
              <CardDescription>
                Stock levels and inventory tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Total Items: <span className="font-semibold">{metrics.totalProducts}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Low Stock: <span className="font-semibold text-red-600">{metrics.lowStockCount} items</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Value: <span className="font-semibold">{formatCurrency(metrics.totalInventoryValue)}</span>
                </p>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); alert('View Inventory Reports Details'); }}>View Details</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => alert('Custom Reports - Create New Report')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Custom Reports
              </CardTitle>
              <CardDescription>
                Create and schedule custom reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Saved Reports: <span className="font-semibold">5</span></p>
                <p className="text-sm text-muted-foreground">Scheduled: <span className="font-semibold">3</span></p>
                <p className="text-sm text-muted-foreground">Last Run: <span className="font-semibold">Today</span></p>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); alert('Create New Custom Report'); }}>Create Report</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;