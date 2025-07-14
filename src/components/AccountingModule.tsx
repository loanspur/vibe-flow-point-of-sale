import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Filter,
  CalendarIcon,
  DollarSign,
  PieChart,
  Users,
  Building2,
  Package,
  Receipt,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialSummary {
  income: number;
  expenses: number;
  profit_loss: number;
}

interface SalesReport {
  id: string;
  receipt_number: string;
  total_amount: number;
  created_at: string;
  customer_name?: string;
  cashier_name?: string;
  location_name?: string;
  payment_method: string;
}

interface ProductReport {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
}

interface CustomerReport {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

interface CommissionReport {
  agent_id: string;
  agent_name: string;
  total_sales: number;
  total_commission: number;
  commission_rate: number;
  pending_commission: number;
}

interface LocationReport {
  location_id: string;
  location_name: string;
  total_sales: number;
  total_transactions: number;
  average_transaction: number;
}

export default function AccountingModule() {
  const { tenantId } = useAuth();
  const { toast } = useToast();

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  // Data state
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [productReports, setProductReports] = useState<ProductReport[]>([]);
  const [customerReports, setCustomerReports] = useState<CustomerReport[]>([]);
  const [commissionReports, setCommissionReports] = useState<CommissionReport[]>([]);
  const [locationReports, setLocationReports] = useState<LocationReport[]>([]);
  
  // Filter options
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  // Fetch filter options
  const fetchFilterOptions = async () => {
    if (!tenantId) return;

    try {
      const [locationsResult, productsResult, customersResult, agentsResult] = await Promise.all([
        supabase.from('store_locations').select('id, name').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('products').select('id, name').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('customers').select('id, name').eq('tenant_id', tenantId),
        supabase.from('commission_agents').select('id, contact_id, contacts(name)').eq('tenant_id', tenantId).eq('is_active', true)
      ]);

      if (locationsResult.data) setLocations(locationsResult.data);
      if (productsResult.data) setProducts(productsResult.data);
      if (customersResult.data) setCustomers(customersResult.data);
      if (agentsResult.data) setAgents(agentsResult.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Fetch financial summary
  const fetchFinancialSummary = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase.rpc('calculate_profit_loss', {
        tenant_id_param: tenantId,
        start_date_param: format(dateRange.start, 'yyyy-MM-dd'),
        end_date_param: format(dateRange.end, 'yyyy-MM-dd')
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setFinancialSummary(data[0]);
      }
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      toast({ title: "Error", description: "Failed to fetch financial summary", variant: "destructive" });
    }
  };

  // Fetch sales reports
  const fetchSalesReports = async () => {
    if (!tenantId) return;

    try {
      let query = supabase
        .from('sales')
        .select(`
          id,
          receipt_number,
          total_amount,
          created_at,
          payment_method,
          cashier_id,
          customers(name)
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Get cashier names separately
      const cashierIds = [...new Set(data?.map(sale => sale.cashier_id).filter(Boolean))];
      const { data: cashiers } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', cashierIds);

      const cashierMap = new Map(cashiers?.map(c => [c.user_id, c.full_name]) || []);

      const formattedData: SalesReport[] = data?.map(sale => ({
        id: sale.id,
        receipt_number: sale.receipt_number,
        total_amount: sale.total_amount,
        created_at: sale.created_at,
        customer_name: sale.customers?.name || 'Walk-in Customer',
        cashier_name: cashierMap.get(sale.cashier_id) || 'Unknown',
        payment_method: sale.payment_method
      })) || [];

      setSalesReports(formattedData);
    } catch (error) {
      console.error('Error fetching sales reports:', error);
      toast({ title: "Error", description: "Failed to fetch sales reports", variant: "destructive" });
    }
  };

  // Fetch product reports
  const fetchProductReports = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          unit_price,
          total_price,
          products(id, name, cost),
          sales!inner(tenant_id, created_at)
        `)
        .eq('sales.tenant_id', tenantId)
        .gte('sales.created_at', dateRange.start.toISOString())
        .lte('sales.created_at', dateRange.end.toISOString());

      if (error) throw error;

      const productMap = new Map<string, ProductReport>();

      data?.forEach(item => {
        const productId = item.products.id;
        const productName = item.products.name;
        const cost = item.products.cost || 0;
        const profit = (item.unit_price - cost) * item.quantity;

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.total_quantity += item.quantity;
          existing.total_revenue += item.total_price;
          existing.total_profit += profit;
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: productName,
            total_quantity: item.quantity,
            total_revenue: item.total_price,
            total_profit: profit
          });
        }
      });

      setProductReports(Array.from(productMap.values()).sort((a, b) => b.total_revenue - a.total_revenue));
    } catch (error) {
      console.error('Error fetching product reports:', error);
      toast({ title: "Error", description: "Failed to fetch product reports", variant: "destructive" });
    }
  };

  // Fetch customer reports
  const fetchCustomerReports = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          customer_id,
          total_amount,
          created_at,
          customers(name)
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .not('customer_id', 'is', null);

      if (error) throw error;

      const customerMap = new Map<string, CustomerReport>();

      data?.forEach(sale => {
        const customerId = sale.customer_id!;
        const customerName = sale.customers?.name || 'Unknown Customer';

        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId)!;
          existing.total_orders += 1;
          existing.total_spent += sale.total_amount;
          if (new Date(sale.created_at) > new Date(existing.last_order_date)) {
            existing.last_order_date = sale.created_at;
          }
        } else {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: customerName,
            total_orders: 1,
            total_spent: sale.total_amount,
            last_order_date: sale.created_at
          });
        }
      });

      setCustomerReports(Array.from(customerMap.values()).sort((a, b) => b.total_spent - a.total_spent));
    } catch (error) {
      console.error('Error fetching customer reports:', error);
      toast({ title: "Error", description: "Failed to fetch customer reports", variant: "destructive" });
    }
  };

  // Fetch commission reports
  const fetchCommissionReports = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('commission_transactions')
        .select(`
          commission_agent_id,
          base_amount,
          commission_amount,
          commission_rate,
          status,
          commission_agents(
            contacts(name)
          )
        `)
        .eq('tenant_id', tenantId)
        .gte('commission_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('commission_date', format(dateRange.end, 'yyyy-MM-dd'));

      if (error) throw error;

      const agentMap = new Map<string, CommissionReport>();

      data?.forEach(commission => {
        const agentId = commission.commission_agent_id;
        const agentName = commission.commission_agents?.contacts?.name || 'Unknown Agent';

        if (agentMap.has(agentId)) {
          const existing = agentMap.get(agentId)!;
          existing.total_sales += commission.base_amount;
          existing.total_commission += commission.commission_amount;
          if (commission.status === 'pending') {
            existing.pending_commission += commission.commission_amount;
          }
        } else {
          agentMap.set(agentId, {
            agent_id: agentId,
            agent_name: agentName,
            total_sales: commission.base_amount,
            total_commission: commission.commission_amount,
            commission_rate: commission.commission_rate,
            pending_commission: commission.status === 'pending' ? commission.commission_amount : 0
          });
        }
      });

      setCommissionReports(Array.from(agentMap.values()).sort((a, b) => b.total_commission - a.total_commission));
    } catch (error) {
      console.error('Error fetching commission reports:', error);
      toast({ title: "Error", description: "Failed to fetch commission reports", variant: "destructive" });
    }
  };

  // Load all data
  const loadReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFinancialSummary(),
        fetchSalesReports(),
        fetchProductReports(),
        fetchCustomerReports(),
        fetchCommissionReports()
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      loadReports();
    }
  }, [tenantId, dateRange]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Date picker component
  const DateRangePicker = ({ date, onDateChange, placeholder }: any) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onDateChange} initialFocus className="pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
          <p className="text-muted-foreground text-center">
            Accounting module requires an active tenant. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Accounting & Reports</h2>
          <p className="text-muted-foreground">Comprehensive financial reporting and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={loadReports} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Refresh Reports'}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DateRangePicker
                date={dateRange.start}
                onDateChange={(date: Date) => setDateRange(prev => ({ ...prev, start: date }))}
                placeholder="Start date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DateRangePicker
                date={dateRange.end}
                onDateChange={(date: Date) => setDateRange(prev => ({ ...prev, end: date }))}
                placeholder="End date"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sales Rep</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="All Reps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Reps</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.contacts?.name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialSummary?.income || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialSummary?.expenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className={`h-4 w-4 ${(financialSummary?.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(financialSummary?.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialSummary?.profit_loss || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <Receipt className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesReports.length}</div>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productReports.reduce((sum, product) => sum + product.total_quantity, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Units</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <Users className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerReports.length}</div>
                <p className="text-xs text-muted-foreground">Unique customers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                <PieChart className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    salesReports.length > 0
                      ? salesReports.reduce((sum, sale) => sum + sale.total_amount, 0) / salesReports.length
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Per sale</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Report</CardTitle>
              <CardDescription>Detailed sales transactions and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReports.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell>{sale.cashier_name}</TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sale.payment_method}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Report</CardTitle>
              <CardDescription>Sales performance by product</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Quantity Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Avg. Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productReports.map((product) => (
                    <TableRow key={product.product_id}>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell>{product.total_quantity}</TableCell>
                      <TableCell>{formatCurrency(product.total_revenue)}</TableCell>
                      <TableCell className={product.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(product.total_profit)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(product.total_revenue / product.total_quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Report</CardTitle>
              <CardDescription>Customer purchasing behavior and lifetime value</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Avg. Order Value</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerReports.map((customer) => (
                    <TableRow key={customer.customer_id}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>{customer.total_orders}</TableCell>
                      <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                      <TableCell>
                        {formatCurrency(customer.total_spent / customer.total_orders)}
                      </TableCell>
                      <TableCell>{format(new Date(customer.last_order_date), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission Report</CardTitle>
              <CardDescription>Sales representative commission tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Total Commission</TableHead>
                    <TableHead>Pending Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionReports.map((agent) => (
                    <TableRow key={agent.agent_id}>
                      <TableCell className="font-medium">{agent.agent_name}</TableCell>
                      <TableCell>{formatCurrency(agent.total_sales)}</TableCell>
                      <TableCell>{(agent.commission_rate * 100).toFixed(2)}%</TableCell>
                      <TableCell>{formatCurrency(agent.total_commission)}</TableCell>
                      <TableCell>
                        <Badge variant={agent.pending_commission > 0 ? "destructive" : "secondary"}>
                          {formatCurrency(agent.pending_commission)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location Performance Report</CardTitle>
              <CardDescription>Sales performance by store location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4" />
                <p>Location reports will be available when location tracking is implemented</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}