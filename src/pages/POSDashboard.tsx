import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPaymentJournalEntry } from "@/lib/accounting-integration";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  CreditCard
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
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    todaySales: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    recentSales: []
  });

  // Payment dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });
  const [arRecord, setArRecord] = useState<any>(null);
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
          payment_method,
          customer_id,
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

  // Credit sale payment functions
  const handleCreditPayment = async (sale: any) => {
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
        description: `Payment of $${paymentData.amount.toFixed(2)} recorded successfully`,
      });

      setIsPaymentDialogOpen(false);
      setPaymentData({ amount: 0, payment_method: 'cash', reference_number: '', notes: '' });
      setArRecord(null);
      
      // Refresh dashboard data
      fetchDashboardStats();

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const isCreditSale = (sale: any) => {
    return sale.payment_method === 'credit' && sale.customer_id;
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
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-bold">${Number(sale.total_amount).toFixed(2)}</div>
                      {sale.payment_method && (
                        <Badge variant={sale.payment_method === 'credit' ? 'destructive' : 'secondary'} className="text-xs">
                          {sale.payment_method.toUpperCase()}
                        </Badge>
                      )}
                    </div>
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
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No sales recorded yet
            </div>
          )}
        </CardContent>
      </Card>

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
};

export default POSDashboard;