import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Download, TrendingUp, DollarSign, ShoppingCart, Users, Calendar, FileText, Filter, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

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

type ReportView = 'overview' | 'sales' | 'products' | 'customers' | 'financial' | 'inventory' | 'custom';

import { SafeWrapper } from '@/components/SafeWrapper';

const Reports = () => {
  const { tenantId } = useAuth();
  const { tenantCurrency, businessSettings } = useApp();
  const [currentView, setCurrentView] = useState<ReportView>('overview');
  const [detailedSales, setDetailedSales] = useState<any[]>([]);
  const [detailedProducts, setDetailedProducts] = useState<any[]>([]);
  const [detailedCustomers, setDetailedCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
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
  const [segmentBy, setSegmentBy] = useState<'none' | 'user' | 'location'>('none');
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [productTop, setProductTop] = useState<{ name: string; quantity: number }[]>([]);

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
        .select("*")
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
        .select("id, name, price, default_profit_margin, stock_quantity, min_stock_level")
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
        sum + (Number(product.default_profit_margin || 0) * product.stock_quantity), 0) || 0;

      // Calculate gross profit (simplified)
      const grossProfit = productsData?.reduce((sum, product) => 
        sum + ((Number(product.price) - Number(product.default_profit_margin || 0)) * product.stock_quantity), 0) || 0;

      // Find top product
      const productSales = new Map();
      topProductsData?.forEach(item => {
        const productName = item.products?.name || "Unknown";
        productSales.set(productName, (productSales.get(productName) || 0) + item.quantity);
      });
      
      const sortedProducts = Array.from(productSales.entries()).sort((a, b) => b[1] - a[1]);
      const topProduct = sortedProducts.length > 0 ? sortedProducts[0][0] : "No data";
      setProductTop(sortedProducts.slice(0, 10).map(([name, qty]) => ({ name, quantity: qty })));

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

      // Set detailed data for reports
      setDetailedSales(salesData || []);
      setDetailedProducts(productsData || []);
      setDetailedCustomers(customersData || []);

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
      currency: tenantCurrency || 'USD'
    }).format(amount);
  };

  // Build period key for aggregation
  const getPeriodKey = (dateStr: string, g: 'day' | 'week' | 'month') => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    if (g === 'day') return `${y}-${m}-${day}`;
    if (g === 'week') {
      const temp = new Date(d);
      const dayNum = d.getDay();
      const monday = new Date(temp.setDate(d.getDate() - ((dayNum + 6) % 7)));
      const wm = (monday.getMonth() + 1).toString().padStart(2, '0');
      const wd = monday.getDate().toString().padStart(2, '0');
      return `${monday.getFullYear()}-W${wm}${wd}`;
    }
    return `${y}-${m}`;
  };

  // Aggregate sales into chart-friendly data
  const buildSalesTrendData = (
    sales: any[],
    seg: 'none' | 'user' | 'location',
    g: 'day' | 'week' | 'month'
  ) => {
    const map = new Map<string, Record<string, number>>();
    const segs = new Set<string>();

    sales.forEach((sale) => {
      const period = getPeriodKey(sale.created_at, g);
      const segKey = seg === 'user'
        ? (sale.created_by || sale.user_id || 'Unknown')
        : seg === 'location'
          ? (sale.location_name || sale.location || sale.location_id || 'Unknown')
          : 'Revenue';
      segs.add(segKey);
      if (!map.has(period)) map.set(period, {});
      map.get(period)![segKey] = (map.get(period)![segKey] || 0) + Number(sale.total_amount || 0);
    });

    const periods = Array.from(map.keys()).sort();
    const data = periods.map((p) => ({ period: p, ...map.get(p)! }));
    const segments = seg === 'none' ? ['Revenue'] : Array.from(segs);
    return { data, segments } as { data: any[]; segments: string[] };
  };


  const filteredSales = detailedSales.filter(sale => {
    const matchesSearch = sale.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formatCurrency(sale.total_amount).includes(searchTerm);
    
    if (dateFilter === 'all') return matchesSearch;
    
    const saleDate = new Date(sale.created_at);
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return matchesSearch && saleDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return matchesSearch && saleDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return matchesSearch && saleDate >= monthAgo;
      default:
        return matchesSearch;
    }
  });

  const filteredProducts = detailedProducts.filter(product => {
    return product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredCustomers = detailedCustomers.filter(customer => {
    return customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const renderReportView = () => {
    switch (currentView) {
      case 'sales':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('overview')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Overview
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Sales Reports</h1>
                    <p className="text-muted-foreground">Detailed sales analytics and trends</p>
                  </div>
                </div>
              </div>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export Sales Data
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.todaySales)}</div>
                  <p className="text-sm text-muted-foreground">Today's total</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Weekly Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.thisWeekSales)}</div>
                  <p className="text-sm text-muted-foreground">This week's total</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Monthly Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.thisMonthSales)}</div>
                  <p className="text-sm text-muted-foreground">This month's total</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={segmentBy} onValueChange={(v) => setSegmentBy(v as any)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Segment by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Segment</SelectItem>
                    <SelectItem value="user">By User</SelectItem>
                    <SelectItem value="location">By Location</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={granularity} onValueChange={(v) => setGranularity(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Granularity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Detailed Sales Table */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Transactions</CardTitle>
                <CardDescription>Detailed list of all sales transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length > 0 ? (
                      filteredSales.slice(0, 20).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {new Date(sale.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            #{sale.id?.slice(-8)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(sale.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                              {sale.status || 'completed'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sale.payment_method || 'Cash'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchTerm || dateFilter !== 'all' ? 'No sales found matching your criteria' : 'No sales data available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {filteredSales.length > 20 && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Showing first 20 of {filteredSales.length} sales. Use export to get all data.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
        
      case 'products':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('overview')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Overview
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Product Performance</h1>
                    <p className="text-muted-foreground">Product analytics and inventory insights</p>
                  </div>
                </div>
              </div>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export Product Data
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.topProduct}</div>
                  <p className="text-sm text-muted-foreground">Best performer</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{metrics.lowStockCount}</div>
                  <p className="text-sm text-muted-foreground">Items need restocking</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalProducts}</div>
                  <p className="text-sm text-muted-foreground">Active products</p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>

            {/* Top Products Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products (by units)</CardTitle>
                <CardDescription>Top performers from sales history</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ quantity: { label: 'Units Sold', color: 'hsl(var(--primary))' } }} className="w-full">
                  <BarChart data={productTop} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} hide={productTop.length > 8} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[4,4,0,0]} />
                  </BarChart>
                </ChartContainer>
                {productTop.length === 0 && (
                  <div className="text-sm text-muted-foreground">No product sales found yet.</div>
                )}
              </CardContent>
            </Card>

            {/* Product Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>Detailed product information and stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 20).map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {product.sku || 'N/A'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(product.price)}
                          </TableCell>
                          <TableCell>
                            <span className={product.stock_quantity <= product.min_stock_level ? 'text-red-600 font-semibold' : ''}>
                              {product.stock_quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              product.stock_quantity <= product.min_stock_level ? 'destructive' :
                              product.stock_quantity <= product.min_stock_level * 2 ? 'secondary' : 'default'
                            }>
                              {product.stock_quantity <= product.min_stock_level ? 'Low Stock' :
                               product.stock_quantity <= product.min_stock_level * 2 ? 'Running Low' : 'In Stock'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.category?.name || 'Uncategorized'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No products found matching your search' : 'No products available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {filteredProducts.length > 20 && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Showing first 20 of {filteredProducts.length} products. Use export to get all data.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
        
      case 'customers':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('overview')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Overview
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Customer Analytics</h1>
                    <p className="text-muted-foreground">Customer behavior and insights</p>
                  </div>
                </div>
              </div>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export Customer Data
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
                  <p className="text-sm text-muted-foreground">All customers</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>New This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{metrics.newCustomers}</div>
                  <p className="text-sm text-muted-foreground">New customers</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Average Order</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.avgOrderValue)}</div>
                  <p className="text-sm text-muted-foreground">Per customer</p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>

            {/* Customer Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Directory</CardTitle>
                <CardDescription>Complete customer information and contact details</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Joined Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.slice(0, 20).map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">
                            {customer.name}
                          </TableCell>
                          <TableCell>
                            {customer.email || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {customer.phone || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {customer.address ? (
                              <span className="text-sm">{customer.address}</span>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(customer.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No customers found matching your search' : 'No customers available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {filteredCustomers.length > 20 && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Showing first 20 of {filteredCustomers.length} customers. Use export to get all data.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
        
      case 'financial':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('overview')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Overview
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Financial Reports</h1>
                    <p className="text-muted-foreground">Profit, loss, and financial summaries</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                  <p className="text-sm text-muted-foreground">All sales</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Gross Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.grossProfit)}</div>
                  <p className="text-sm text-muted-foreground">Revenue - COGS</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</div>
                  <p className="text-sm text-muted-foreground">After expenses</p>
                </CardContent>
              </Card>
            </div>

            {/* Financial Trend */}
            {(() => {
              const { data } = buildSalesTrendData(filteredSales, 'none', granularity);
              const chartConfig = { Revenue: { label: 'Revenue', color: 'hsl(var(--primary))' } } as const;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Aggregated by {granularity}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="w-full">
                      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="period" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="Revenue" stroke="var(--color-Revenue)" fill="var(--color-Revenue)" />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        );
        
      case 'inventory':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('overview')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Overview
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Inventory Reports</h1>
                    <p className="text-muted-foreground">Stock levels and inventory tracking</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalProducts}</div>
                  <p className="text-sm text-muted-foreground">Active products</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Alert</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{metrics.lowStockCount}</div>
                  <p className="text-sm text-muted-foreground">Items need attention</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.totalInventoryValue)}</div>
                  <p className="text-sm text-muted-foreground">Total stock value</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      default:
        return (
          <>
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
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setCurrentView('sales')}>
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
                  <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); setCurrentView('sales'); }}>View Details</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setCurrentView('products')}>
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
                  <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); setCurrentView('products'); }}>View Details</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setCurrentView('customers')}>
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
                  <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); setCurrentView('customers'); }}>View Details</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setCurrentView('financial')}>
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
                  <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); setCurrentView('financial'); }}>View Details</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setCurrentView('inventory')}>
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
                  <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); setCurrentView('inventory'); }}>View Details</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => alert('Custom Reports - Create New Report')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    Custom Reports
                  </CardTitle>
                  <CardDescription>
                    Create and schedule custom reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Saved Reports: <span className="font-semibold">0</span></p>
                    <p className="text-sm text-muted-foreground">Scheduled: <span className="font-semibold">0</span></p>
                    <p className="text-sm text-muted-foreground">Available: <span className="font-semibold">Coming Soon</span></p>
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); alert('Custom reports feature coming soon!'); }}>Create Report</Button>
                </CardContent>
              </Card>
            </div>
          </>
        );
    }
  };
  return (
    <SafeWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          {/* Company Header - visible on all reports */}
          {(businessSettings as any)?.company_logo_url && (
            <div className="flex items-center gap-3 mb-6">
              <img src={(businessSettings as any).company_logo_url} alt={`${businessSettings?.company_name || 'Company'} logo`} className="h-10 w-auto" />
              <div className="text-lg font-semibold">{businessSettings?.company_name}</div>
            </div>
          )}
          {currentView === 'overview' ? (
            <>
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
            </>
          ) : null}
          
          {renderReportView()}
        </div>
      </div>
    </SafeWrapper>
  );
};

export default Reports;