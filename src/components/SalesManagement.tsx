import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Download, Eye, DollarSign, ShoppingCart, Users, TrendingUp, FileText, Printer, CreditCard, RotateCcw, Mail } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrencySettings } from "@/lib/currency";
import { SaleForm } from "./SaleForm";
import { QuoteManagement } from "./QuoteManagement";
import SalesReturns from "./SalesReturns";
import { ReceiptPreview } from "./ReceiptPreview";
import { InvoiceEmailDialog } from "./InvoiceEmailDialog";
import { createPaymentJournalEntry } from "@/lib/accounting-integration";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";

interface Sale {
  id: string;
  receipt_number: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  customer_id?: string;
  customer_name?: string;
  cashier_id: string;
  contacts?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
}

interface SalesStats {
  totalSales: number;
  todaySales: number;
  totalTransactions: number;
  averageSale: number;
}

export default function SalesManagement() {
  const { tenantId, user } = useAuth();
  const { setOpen } = useSidebar();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    todaySales: 0,
    totalTransactions: 0,
    averageSale: 0,
  });
  
  // Get active tab from URL or default to overview
  const activeTab = searchParams.get('tab') || 'overview';
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [saleForReturn, setSaleForReturn] = useState<Sale | null>(null);
  
  // Invoice email dialog states
  const [showInvoiceEmailDialog, setShowInvoiceEmailDialog] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Sale | null>(null);
  
  // Payment dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });
  const [arRecord, setArRecord] = useState<any>(null);
  const [salesPaymentStatus, setSalesPaymentStatus] = useState<Record<string, { status: string; outstanding: number }>>({});
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSales();
    fetchInvoices();
    fetchStats();
  }, []);

  const fetchInvoices = async () => {
    if (!tenantId) return;

    try {
      // Fetch invoices - these are sales converted from quotes that are awaiting payment
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          contacts!sales_customer_id_fkey (
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('payment_method', 'credit')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get cashier profiles for invoices
      const cashierIds = [...new Set((data || []).map(invoice => invoice.cashier_id))];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', cashierIds);
        
      if (profilesError) throw profilesError;
      
      const profilesMap: Record<string, any> = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.user_id] = profile;
      });
      
      const invoicesWithProfiles = (data || []).map(invoice => ({
        ...invoice,
        profiles: profilesMap[invoice.cashier_id] || null,
        // Handle customer data properly - use customer_name from sales if contacts join fails
        contacts: invoice.contacts || (invoice.customer_name ? {
          name: invoice.customer_name,
          email: null,
          phone: null,
          address: null
        } : null)
      }));

      setInvoices(invoicesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchSales = async () => {
    if (!tenantId) return;

    try {
      // Fetch sales with customers in one query
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          contacts!sales_customer_id_fkey (
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique cashier IDs to fetch all profiles in one query
      const cashierIds = [...new Set((data || []).map(sale => sale.cashier_id))];
      
      // Fetch all profiles in a single query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', cashierIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map of cashier_id to profile for easy lookup
      const profilesMap: Record<string, any> = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.user_id] = profile;
      });
      
      // Add profile data to sales and ensure contacts is properly handled
      const salesWithProfiles = (data || []).map(sale => ({
        ...sale,
        profiles: profilesMap[sale.cashier_id] || null,
        contacts: sale.contacts || null
      }));

      setSales(salesWithProfiles);
      
      // Get credit sales for AR status
      const creditSales = salesWithProfiles.filter(sale => sale.payment_method === 'credit');
      
      // Fetch AR status for credit sales in parallel
      if (creditSales.length > 0) {
        fetchCreditSalesStatus(creditSales);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch sales data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreditSalesStatus = async (creditSales: Sale[]) => {
    if (creditSales.length === 0) return;

    const saleIds = creditSales.map(sale => sale.id);
    
    try {
      const { data: arData, error } = await supabase
        .from('accounts_receivable')
        .select('reference_id, status, outstanding_amount')
        .eq('tenant_id', tenantId)
        .eq('reference_type', 'sale')
        .in('reference_id', saleIds);

      if (error) throw error;

      const statusMap: Record<string, { status: string; outstanding: number }> = {};
      arData?.forEach(ar => {
        statusMap[ar.reference_id] = {
          status: ar.status,
          outstanding: ar.outstanding_amount
        };
      });
      
      setSalesPaymentStatus(statusMap);
    } catch (error) {
      console.error('Error fetching AR status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: salesData } = await supabase
        .from("sales")
        .select("total_amount, created_at");

      if (salesData) {
        const totalSales = salesData.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        const totalTransactions = salesData.length;
        
        const today = new Date().toISOString().split('T')[0];
        const todaySales = salesData
          .filter(sale => sale.created_at.startsWith(today))
          .reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        
        const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        setStats({
          totalSales,
          todaySales,
          totalTransactions,
          averageSale,
        });
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || sale.status === filterStatus;
    const matchesPayment = filterPayment === "all" || sale.payment_method === filterPayment;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const { formatAmount } = useCurrencySettings();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      cash: "default",
      card: "secondary",
      digital: "outline",
      bank_transfer: "outline",
    };
    return <Badge variant={variants[method] || "default"}>{method.toUpperCase()}</Badge>;
  };

  const handleSaleCompleted = () => {
    fetchSales();
    fetchStats();
    setSearchParams({ tab: 'overview' });
    toast({
      title: "Success",
      description: "Sale completed successfully!",
    });
  };

  const handleViewReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setShowReceiptPreview(true);
  };

  const handleReprintReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setShowReceiptPreview(true);
    const documentType = sale.payment_method === 'credit' ? 'Invoice' : 'Receipt';
    toast({
      title: `${documentType} Reprint`,
      description: `${documentType} ${sale.receipt_number} ready for reprint`,
    });
  };

  // Credit sale payment functions
  const handleCreditPayment = async (sale: Sale) => {
    if (!tenantId || !sale.customer_id) {
      toast({
        title: "Error",
        description: "Customer information is required for credit sale payments",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the AR record for this sale
      const { data: arData, error: arError } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('reference_id', sale.id)
        .eq('reference_type', 'sale')
        .single();

      if (arError || !arData) {
        toast({
          title: "Error",
          description: "No outstanding balance found for this credit sale",
          variant: "destructive",
        });
        return;
      }

      if (arData.status === 'paid') {
        toast({
          title: "Already Paid",
          description: "This credit sale has already been paid in full",
        });
        return;
      }

      setArRecord(arData);
      setPaymentData({
        amount: arData.outstanding_amount,
        payment_method: 'cash',
        reference_number: '',
        notes: ''
      });
      setIsPaymentDialogOpen(true);

    } catch (error) {
      console.error('Error checking AR record:', error);
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive",
      });
    }
  };

  const processPayment = async () => {
    if (!tenantId || !user || !arRecord) return;

    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('ar_ap_payments')
        .insert({
          tenant_id: tenantId,
          payment_type: 'receivable',
          reference_id: arRecord.id,
          payment_date: new Date().toISOString().split('T')[0],
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number,
          notes: paymentData.notes
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create accounting journal entry
      try {
        await createPaymentJournalEntry(tenantId, {
          paymentId: payment.id,
          amount: paymentData.amount,
          paymentType: 'receivable',
          paymentMethod: paymentData.payment_method,
          referenceId: arRecord.id,
          createdBy: user.id
        });
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        toast({
          title: "Warning", 
          description: "Payment recorded but accounting entry failed",
          variant: "destructive"
        });
      }

      toast({
        title: "Success",
        description: `Payment of ${formatAmount(paymentData.amount)} recorded successfully`,
      });

      setIsPaymentDialogOpen(false);
      setPaymentData({ amount: 0, payment_method: 'cash', reference_number: '', notes: '' });
      setArRecord(null);
      
      // Refresh sales data to update any payment status
      fetchSales();

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const handleCreateReturn = (sale: Sale) => {
    setSaleForReturn(sale);
    setShowReturnDialog(true);
  };

  const createReturnFromSale = async () => {
    if (!saleForReturn || !tenantId) return;

    try {
      // Fetch the sale with complete details including sale items
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name, email),
          sale_items(
            *,
            products(name, sku)
          )
        `)
        .eq('id', saleForReturn.id)
        .single();

      if (saleError) throw saleError;

      // Navigate to the returns tab with pre-selected sale
      setSearchParams({ tab: 'returns' });
      
      // Close the dialog
      setShowReturnDialog(false);
      setSaleForReturn(null);

      toast({
        title: "Success",
        description: "Redirected to Returns page. Please create the return from the Historical Sales tab.",
      });

    } catch (error) {
      console.error('Error preparing return:', error);
      toast({
        title: "Error",
        description: "Failed to prepare return",
        variant: "destructive",
      });
    }
  };

  const isCreditSale = (sale: Sale) => {
    return sale.payment_method === 'credit' && sale.customer_id;
  };

  const getPaymentStatusButton = (sale: Sale) => {
    if (!isCreditSale(sale)) return null;

    const paymentStatus = salesPaymentStatus[sale.id];
    
    if (!paymentStatus) {
      // Default unpaid state
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleCreditPayment(sale)} 
          title="Record Payment"
          className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
        >
          <CreditCard className="h-3 w-3" />
        </Button>
      );
    }

    switch (paymentStatus.status) {
      case 'paid':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            disabled
            title="Fully Paid"
            className="bg-green-50 border-green-200 text-green-700 cursor-not-allowed"
          >
            <CheckCircle className="h-3 w-3" />
          </Button>
        );
      case 'partial':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleCreditPayment(sale)} 
            title={`Partial Payment - $${paymentStatus.outstanding.toFixed(2)} remaining`}
            className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
          >
            <Clock className="h-3 w-3" />
          </Button>
        );
      case 'overdue':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleCreditPayment(sale)} 
            title={`Overdue Payment - $${paymentStatus.outstanding.toFixed(2)} remaining`}
            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 animate-pulse"
          >
            <AlertTriangle className="h-3 w-3" />
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleCreditPayment(sale)} 
            title={`Outstanding Payment - $${paymentStatus.outstanding.toFixed(2)} remaining`}
            className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
          >
            <CreditCard className="h-3 w-3" />
          </Button>
        );
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading sales data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sales Management</h2>
        <Button onClick={() => {
          // Navigate to new sale tab with URL parameter
          setSearchParams({ tab: 'new-sale' });
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Sale
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="new-sale">New Sale</TabsTrigger>
          <TabsTrigger value="history">Sales History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sales.slice(0, 10).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{sale.receipt_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.contacts?.name || "Walk-in Customer"} • {formatDate(sale.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold">{formatAmount(sale.total_amount)}</p>
                        {getPaymentMethodBadge(sale.payment_method)}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewReceipt(sale)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleReprintReceipt(sale)} title="Reprint Receipt">
                        <Printer className="h-3 w-3" />
                      </Button>
                      {sale.status === "completed" && (
                        <Button variant="outline" size="sm" onClick={() => handleCreateReturn(sale)} title="Create Return">
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                      {getPaymentStatusButton(sale)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-sale">
          <SaleForm onSaleCompleted={handleSaleCompleted} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by receipt number or customer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Sales Data Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Items Total</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Final Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(sale.created_at).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">
                              {new Date(sale.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {sale.contacts?.name || "Walk-in Customer"}
                            </div>
                            {sale.contacts?.email && (
                              <div className="text-sm text-muted-foreground">
                                {sale.contacts.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {sale.profiles?.full_name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatAmount(sale.total_amount - (sale.discount_amount || 0) - (sale.tax_amount || 0))}
                        </TableCell>
                        <TableCell>
                          {sale.discount_amount > 0 ? (
                            <span className="text-red-600">-{formatAmount(sale.discount_amount)}</span>
                          ) : (
                            <span className="text-muted-foreground">{formatAmount(0)}</span>
                          )}
                        </TableCell>
                         <TableCell>
                           {sale.tax_amount > 0 ? (
                             formatAmount(sale.tax_amount)
                           ) : (
                             <span className="text-muted-foreground">{formatAmount(0)}</span>
                           )}
                         </TableCell>
                         <TableCell className="font-bold">
                           {formatAmount(sale.total_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getPaymentMethodBadge(sale.payment_method)}
                            {getPaymentStatusButton(sale) && (
                              <div className="mt-1">
                                {getPaymentStatusButton(sale)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewReceipt(sale)} 
                              title="View Receipt"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleReprintReceipt(sale)} 
                              title="Reprint Receipt"
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
                            {sale.status === "completed" && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCreateReturn(sale)} 
                                title="Create Return"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredSales.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No sales found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage invoices created from quotes that are awaiting payment
              </p>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Outstanding Invoices</h3>
                  <p>No invoices are currently awaiting payment. Invoices are created when quotes are converted to sales.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search invoices..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Invoices
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Created by</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Status</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices
                          .filter(invoice => 
                            invoice.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            invoice.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((invoice) => {
                            const paymentStatus = salesPaymentStatus[invoice.id];
                            return (
                              <TableRow key={invoice.id} className="hover:bg-accent/50">
                                <TableCell className="font-medium font-mono">
                                  {invoice.receipt_number}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div>{new Date(invoice.created_at).toLocaleDateString()}</div>
                                    <div className="text-muted-foreground">
                                      {new Date(invoice.created_at).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {invoice.contacts?.name || "Walk-in Customer"}
                                    </div>
                                    {invoice.contacts?.email && (
                                      <div className="text-sm text-muted-foreground">
                                        {invoice.contacts.email}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {invoice.profiles?.full_name || "Unknown"}
                                  </div>
                                </TableCell>
                                <TableCell className="font-bold">
                                  {formatAmount(invoice.total_amount)}
                                </TableCell>
                                <TableCell>
                                  {paymentStatus ? (
                                    <div className="flex flex-col gap-1">
                                      <Badge 
                                        variant={
                                          paymentStatus.status === 'paid' ? 'default' :
                                          paymentStatus.status === 'partial' ? 'secondary' :
                                          paymentStatus.status === 'overdue' ? 'destructive' : 'outline'
                                        }
                                      >
                                        {paymentStatus.status.charAt(0).toUpperCase() + paymentStatus.status.slice(1)}
                                      </Badge>
                                      {paymentStatus.status !== 'paid' && (
                                        <span className="text-xs text-muted-foreground">
                                          {formatAmount(paymentStatus.outstanding)} remaining
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge variant="outline">Outstanding</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={invoice.status === "completed" ? "default" : "secondary"}>
                                    {invoice.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleViewReceipt(invoice)} 
                                      title="View Invoice"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleReprintReceipt(invoice)} 
                                      title="Print Invoice"
                                    >
                                      <Printer className="h-3 w-3" />
                                    </Button>
                                     <Button 
                                       variant="outline" 
                                       size="sm" 
                                       onClick={() => {
                                         setSelectedInvoiceForEmail(invoice);
                                         setShowInvoiceEmailDialog(true);
                                       }} 
                                       title="Email Invoice"
                                       className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                     >
                                       <Mail className="h-3 w-3" />
                                     </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                          // Navigate to AR section for payment recording
                                          navigate('/ar-ap?tab=make-payments&filter=receivable&search=' + invoice.receipt_number);
                                        }}
                                        title="Record Payment (Go to AR)"
                                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                      >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Pay
                                      </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <QuoteManagement />
        </TabsContent>

        <TabsContent value="returns">
          <SalesReturns />
        </TabsContent>
      </Tabs>

      {/* Receipt Preview Dialog */}
      <ReceiptPreview
        isOpen={showReceiptPreview}
        onClose={() => {
          setShowReceiptPreview(false);
          setSelectedSale(null);
        }}
        sale={selectedSale || undefined}
        type="receipt"
      />

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Credit Sale Payment</DialogTitle>
            <DialogDescription>
              Record payment for {arRecord ? `Invoice #${arRecord.invoice_number}` : 'credit sale'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select 
                value={paymentData.payment_method} 
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reference_number">Reference Number (Optional)</Label>
              <Input
                id="reference_number"
                value={paymentData.reference_number}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Check number, transaction ID, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional payment details..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={processPayment} disabled={paymentData.amount <= 0}>
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Email Dialog */}
      <InvoiceEmailDialog
        invoice={selectedInvoiceForEmail}
        open={showInvoiceEmailDialog}
        onOpenChange={setShowInvoiceEmailDialog}
      />

      {/* Return Confirmation Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Return</DialogTitle>
            <DialogDescription>
              Create a return for sale {saleForReturn?.receipt_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Sale Details:</span>
                <Badge variant="outline">{saleForReturn?.status}</Badge>
              </div>
              <div className="text-sm space-y-1">
                <div>Receipt: {saleForReturn?.receipt_number}</div>
                <div>Customer: {saleForReturn?.contacts?.name || "Walk-in Customer"}</div>
                <div>Amount: {saleForReturn ? formatAmount(saleForReturn.total_amount) : formatAmount(0)}</div>
                <div>Date: {saleForReturn ? formatDate(saleForReturn.created_at) : ""}</div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              This will redirect you to the Returns page where you can select the items to return 
              and specify the return details.
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createReturnFromSale}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Create Return
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}