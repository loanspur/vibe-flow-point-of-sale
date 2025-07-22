import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Download, Eye, DollarSign, ShoppingCart, Users, TrendingUp, FileText, Printer, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SaleForm } from "./SaleForm";
import { QuoteManagement } from "./QuoteManagement";
import SalesReturns from "./SalesReturns";
import { ReceiptPreview } from "./ReceiptPreview";
import { createPaymentJournalEntry } from "@/lib/accounting-integration";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  cashier_id: string;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
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

export function SalesManagement() {
  const { tenantId, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    todaySales: 0,
    totalTransactions: 0,
    averageSale: 0,
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  
  // Payment dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });
  const [arRecord, setArRecord] = useState<any>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSales();
    fetchStats();
  }, []);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          customers (name, email, phone, address)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
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
                         sale.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || sale.status === filterStatus;
    const matchesPayment = filterPayment === "all" || sale.payment_method === filterPayment;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
    setActiveTab("overview");
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
    toast({
      title: "Receipt Reprint",
      description: `Receipt ${sale.receipt_number} ready for reprint`,
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
        description: `Payment of ${formatCurrency(paymentData.amount)} recorded successfully`,
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

  const isCreditSale = (sale: Sale) => {
    return sale.payment_method === 'credit' && sale.customer_id;
  };

  if (isLoading) {
    return <div className="p-6">Loading sales data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sales Management</h2>
        <Button onClick={() => setActiveTab("new-sale")}>
          <Plus className="h-4 w-4 mr-2" />
          New Sale
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="new-sale">New Sale</TabsTrigger>
          <TabsTrigger value="history">Sales History</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.averageSale)}</div>
              </CardContent>
            </Card>
          </div>

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
                        {sale.customers?.name || "Walk-in Customer"} • {formatDate(sale.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(sale.total_amount)}</p>
                        {getPaymentMethodBadge(sale.payment_method)}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewReceipt(sale)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleReprintReceipt(sale)} title="Reprint Receipt">
                        <Printer className="h-3 w-3" />
                      </Button>
                      {isCreditSale(sale) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCreditPayment(sale)} 
                          title="Record Payment"
                          className="bg-green-50 hover:bg-green-100 border-green-200"
                        >
                          <CreditCard className="h-3 w-3" />
                        </Button>
                      )}
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

              {/* Sales List */}
              <div className="space-y-3">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{sale.receipt_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(sale.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {sale.customers?.name || "Walk-in Customer"}
                          </p>
                          <p className="text-sm text-muted-foreground">Customer</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(sale.total_amount)}</p>
                        {getPaymentMethodBadge(sale.payment_method)}
                      </div>
                      <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                        {sale.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleViewReceipt(sale)} title="View Receipt">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReprintReceipt(sale)} title="Reprint Receipt">
                          <Printer className="h-3 w-3" />
                        </Button>
                        {isCreditSale(sale) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCreditPayment(sale)} 
                            title="Record Payment"
                            className="bg-green-50 hover:bg-green-100 border-green-200"
                          >
                            <CreditCard className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSales.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No sales found matching your criteria.
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
    </div>
  );
}