import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, RotateCcw, Receipt, CheckCircle, XCircle, Clock, ShoppingCart, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";

interface ReturnReasonCode {
  id: string;
  code: string;
  description: string;
  requires_approval: boolean;
}

interface Sale {
  id: string;
  receipt_number: string;
  total_amount: number;
  tax_amount?: number;
  customer_id?: string;
  created_at: string;
  customers?: {
    name: string;
    email?: string;
  };
  sale_items: SaleItem[];
}

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: {
    name: string;
    sku?: string;
  };
}

interface Return {
  id: string;
  return_number: string;
  original_sale_id?: string;
  customer_id?: string;
  return_type: 'refund' | 'exchange' | 'store_credit';
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  reason_code_id?: string;
  custom_reason?: string;
  total_amount: number;
  refund_amount: number;
  store_credit_amount: number;
  exchange_difference: number;
  refund_method?: string;
  notes?: string;
  created_at: string;
  return_reason_codes?: ReturnReasonCode;
  customers?: {
    name: string;
    email?: string;
  };
  return_items: ReturnItem[];
  exchange_items?: ExchangeItem[];
}

interface ReturnItem {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity_returned: number;
  unit_price: number;
  total_price: number;
  condition_notes?: string;
  restock: boolean;
  product: {
    name: string;
    sku?: string;
  };
}

interface ExchangeItem {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: {
    name: string;
    sku?: string;
  };
}

interface ReturnFormData {
  return_type: 'refund' | 'exchange' | 'store_credit';
  reason_code_id?: string;
  custom_reason?: string;
  refund_method?: string;
  notes?: string;
}

export default function SalesReturns() {
  const [activeTab, setActiveTab] = useState('overview');
  const [returns, setReturns] = useState<Return[]>([]);
  const [reasonCodes, setReasonCodes] = useState<ReturnReasonCode[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [newReturnDialogOpen, setNewReturnDialogOpen] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnFormData, setReturnFormData] = useState<ReturnFormData>({
    return_type: 'refund',
    refund_method: 'original_payment'
  });
  const [selectedItems, setSelectedItems] = useState<{[key: string]: { quantity: number; condition: string }}>({});
  const [exchangeItems, setExchangeItems] = useState<{product_id: string; quantity: number; unit_price: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchReturns();
    fetchReasonCodes();
  }, []);

  const fetchReturns = async () => {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          return_reason_codes(id, code, description, requires_approval),
          customers(name, email),
          return_items(
            *,
            products(name, sku)
          ),
          exchange_items(
            *,
            products(name, sku)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data as any || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch returns",
        variant: "destructive"
      });
    }
  };

  const fetchReasonCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('return_reason_codes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setReasonCodes(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch reason codes",
        variant: "destructive"
      });
    }
  };

  const searchSale = async () => {
    if (!receiptSearch.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name, email),
          sale_items(
            *,
            products(name, sku)
          )
        `)
        .eq('receipt_number', receiptSearch.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Not Found",
            description: "No sale found with that receipt number",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      // Transform the data to match our interface
      const transformedData = {
        ...data,
        sale_items: data.sale_items.map((item: any) => ({
          ...item,
          product: item.products
        }))
      };
      
      setSelectedSale(transformedData);
      // Initialize selected items
      const initialSelection: {[key: string]: { quantity: number; condition: string }} = {};
      transformedData.sale_items.forEach((item: SaleItem) => {
        initialSelection[item.id] = { quantity: 0, condition: 'new' };
      });
      setSelectedItems(initialSelection);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for sale",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processReturn = async () => {
    if (!selectedSale) return;

    const returnItems = Object.entries(selectedItems)
      .filter(([_, data]) => data.quantity > 0)
      .map(([saleItemId, data]) => {
        const saleItem = selectedSale.sale_items.find(item => item.id === saleItemId);
        return {
          original_sale_item_id: saleItemId,
          product_id: saleItem!.product_id,
          quantity_returned: data.quantity,
          unit_price: saleItem!.unit_price,
          total_price: saleItem!.unit_price * data.quantity,
          condition_notes: data.condition,
          restock: data.condition === 'new' || data.condition === 'opened'
        };
      });

    if (returnItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item to return",
        variant: "destructive"
      });
      return;
    }

    const subtotalAmount = returnItems.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = selectedSale.tax_amount ? (subtotalAmount * (selectedSale.tax_amount / selectedSale.total_amount)) : 0;
    const totalAmount = subtotalAmount + taxAmount;

    let refundAmount = 0;
    let storeCreditAmount = 0;
    let exchangeDifference = 0;

    if (returnFormData.return_type === 'refund') {
      refundAmount = totalAmount;
    } else if (returnFormData.return_type === 'store_credit') {
      storeCreditAmount = totalAmount;
    } else if (returnFormData.return_type === 'exchange') {
      const exchangeTotal = exchangeItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      exchangeDifference = exchangeTotal - totalAmount;
      if (exchangeDifference < 0) {
        refundAmount = Math.abs(exchangeDifference);
        exchangeDifference = 0;
      }
    }

    setLoading(true);
    try {
      // Get tenant ID
      const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
      const tenantId = profile?.tenant_id;

      // Generate return number
      const { data: returnNumberData, error: returnNumberError } = await supabase
        .rpc('generate_return_number', { tenant_id_param: tenantId });

      if (returnNumberError) throw returnNumberError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create return
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .insert({
          tenant_id: tenantId,
          return_number: returnNumberData,
          original_sale_id: selectedSale.id,
          customer_id: selectedSale.customer_id,
          processed_by: user?.id,
          return_type: returnFormData.return_type,
          reason_code_id: returnFormData.reason_code_id,
          custom_reason: returnFormData.custom_reason,
          subtotal_amount: subtotalAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          refund_amount: refundAmount,
          store_credit_amount: storeCreditAmount,
          exchange_difference: exchangeDifference,
          refund_method: returnFormData.refund_method,
          notes: returnFormData.notes,
          status: 'pending'
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsWithReturnId = returnItems.map(item => ({
        ...item,
        return_id: returnData.id
      }));

      const { error: itemsError } = await supabase
        .from('return_items')
        .insert(returnItemsWithReturnId);

      if (itemsError) throw itemsError;

      // Create exchange items if applicable
      if (returnFormData.return_type === 'exchange' && exchangeItems.length > 0) {
        const exchangeItemsWithReturnId = exchangeItems.map(item => ({
          ...item,
          return_id: returnData.id,
          total_price: item.unit_price * item.quantity
        }));

        const { error: exchangeError } = await supabase
          .from('exchange_items')
          .insert(exchangeItemsWithReturnId);

        if (exchangeError) throw exchangeError;
      }

      toast({
        title: "Success",
        description: `Return ${returnData.return_number} created successfully`,
      });

      // Reset form
      setNewReturnDialogOpen(false);
      setSelectedSale(null);
      setReceiptSearch('');
      setSelectedItems({});
      setExchangeItems([]);
      setReturnFormData({
        return_type: 'refund',
        refund_method: 'original_payment'
      });

      fetchReturns();

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create return",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveReturn = async (returnId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('returns')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', returnId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Return approved successfully",
      });

      fetchReturns();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve return",
        variant: "destructive"
      });
    }
  };

  const completeReturn = async (returnId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('process_return', { return_id_param: returnId });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Return completed and stock updated",
      });

      fetchReturns();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete return",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      completed: "default",
      cancelled: "destructive"
    } as const;

    const colors = {
      pending: "text-yellow-600",
      approved: "text-blue-600", 
      completed: "text-green-600",
      cancelled: "text-red-600"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getReturnTypeIcon = (type: string) => {
    switch (type) {
      case 'refund': return <RotateCcw className="h-4 w-4" />;
      case 'exchange': return <ArrowLeftRight className="h-4 w-4" />;
      case 'store_credit': return <ShoppingCart className="h-4 w-4" />;
      default: return <RotateCcw className="h-4 w-4" />;
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Return Management</h2>
          <p className="text-muted-foreground">Process returns, refunds, and exchanges</p>
        </div>
        <Dialog open={newReturnDialogOpen} onOpenChange={setNewReturnDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <RotateCcw className="mr-2 h-4 w-4" />
              New Return
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Return</DialogTitle>
              <DialogDescription>
                Search for the original sale and process the return
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Sale Search */}
              <div className="space-y-4">
                <Label>Search Original Sale</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter receipt number..."
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchSale()}
                  />
                  <Button onClick={searchSale} disabled={loading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedSale && (
                <>
                  {/* Sale Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Sale {selectedSale.receipt_number}
                      </CardTitle>
                      <CardDescription>
                        {selectedSale.customers?.name || 'Walk-in Customer'} • {format(new Date(selectedSale.created_at), 'PPp')} • {formatCurrency(selectedSale.total_amount)}
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Return Items Selection */}
                  <div className="space-y-4">
                    <Label>Select Items to Return</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Original Qty</TableHead>
                          <TableHead>Return Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Return Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.sale_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product.name}</div>
                                {item.product.sku && (
                                  <div className="text-sm text-muted-foreground">SKU: {item.product.sku}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={selectedItems[item.id]?.quantity || 0}
                                onChange={(e) => setSelectedItems(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    quantity: parseInt(e.target.value) || 0
                                  }
                                }))}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>
                              <Select
                                value={selectedItems[item.id]?.condition || 'new'}
                                onValueChange={(value) => setSelectedItems(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    condition: value
                                  }
                                }))}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="opened">Opened</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="defective">Defective</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {formatCurrency((selectedItems[item.id]?.quantity || 0) * item.unit_price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Return Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Return Type</Label>
                      <Select
                        value={returnFormData.return_type}
                        onValueChange={(value: 'refund' | 'exchange' | 'store_credit') => 
                          setReturnFormData(prev => ({ ...prev, return_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="exchange">Exchange</SelectItem>
                          <SelectItem value="store_credit">Store Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Reason Code</Label>
                      <Select
                        value={returnFormData.reason_code_id}
                        onValueChange={(value) => setReturnFormData(prev => ({ ...prev, reason_code_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {reasonCodes.map((code) => (
                            <SelectItem key={code.id} value={code.id}>
                              {code.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {returnFormData.return_type === 'refund' && (
                      <div className="space-y-2">
                        <Label>Refund Method</Label>
                        <Select
                          value={returnFormData.refund_method}
                          onValueChange={(value) => setReturnFormData(prev => ({ ...prev, refund_method: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original_payment">Original Payment Method</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="store_credit">Store Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Reason / Notes</Label>
                    <Textarea
                      placeholder="Additional details about the return..."
                      value={returnFormData.custom_reason || ''}
                      onChange={(e) => setReturnFormData(prev => ({ ...prev, custom_reason: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setNewReturnDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={processReturn} disabled={loading}>
                      {loading ? "Processing..." : "Create Return"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="reason-codes">Reason Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{returns.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {returns.filter(r => r.status === 'pending').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(returns.reduce((sum, r) => sum + r.refund_amount, 0))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Store Credit Issued</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(returns.reduce((sum, r) => sum + r.store_credit_amount, 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Returns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Returns</CardTitle>
              <CardDescription>Latest return transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.slice(0, 5).map((returnItem) => (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                      <TableCell>{returnItem.customers?.name || 'Walk-in Customer'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getReturnTypeIcon(returnItem.return_type)}
                          {returnItem.return_type.charAt(0).toUpperCase() + returnItem.return_type.slice(1)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(returnItem.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                      <TableCell>{format(new Date(returnItem.created_at), 'MMM dd, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search returns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Returns Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((returnItem) => (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                      <TableCell>{returnItem.customers?.name || 'Walk-in Customer'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getReturnTypeIcon(returnItem.return_type)}
                          {returnItem.return_type.charAt(0).toUpperCase() + returnItem.return_type.slice(1)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(returnItem.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                      <TableCell>{format(new Date(returnItem.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {returnItem.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveReturn(returnItem.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {returnItem.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => completeReturn(returnItem.id)}
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReturn(returnItem)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reason-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Return Reason Codes</CardTitle>
              <CardDescription>Manage standardized return reasons</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Requires Approval</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reasonCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-medium">{code.code}</TableCell>
                      <TableCell>{code.description}</TableCell>
                      <TableCell>
                        {code.requires_approval ? (
                          <Badge variant="secondary">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Return Details Dialog */}
      {selectedReturn && (
        <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Return Details - {selectedReturn.return_number}</DialogTitle>
              <DialogDescription>
                {selectedReturn.customers?.name || 'Walk-in Customer'} • {format(new Date(selectedReturn.created_at), 'PPp')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Return Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="flex items-center gap-2">
                        {getReturnTypeIcon(selectedReturn.return_type)}
                        {selectedReturn.return_type.charAt(0).toUpperCase() + selectedReturn.return_type.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      {getStatusBadge(selectedReturn.status)}
                    </div>
                    <div className="flex justify-between">
                      <span>Reason:</span>
                      <span>{selectedReturn.return_reason_codes?.description || 'No reason provided'}</span>
                    </div>
                    {selectedReturn.refund_method && (
                      <div className="flex justify-between">
                        <span>Refund Method:</span>
                        <span>{selectedReturn.refund_method.replace('_', ' ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedReturn.total_amount)}</span>
                    </div>
                    {selectedReturn.refund_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Refund Amount:</span>
                        <span className="font-medium text-green-600">{formatCurrency(selectedReturn.refund_amount)}</span>
                      </div>
                    )}
                    {selectedReturn.store_credit_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Store Credit:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(selectedReturn.store_credit_amount)}</span>
                      </div>
                    )}
                    {selectedReturn.exchange_difference > 0 && (
                      <div className="flex justify-between">
                        <span>Additional Payment:</span>
                        <span className="font-medium text-orange-600">{formatCurrency(selectedReturn.exchange_difference)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Return Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Returned Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Restock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.return_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              {item.product.sku && (
                                <div className="text-sm text-muted-foreground">SKU: {item.product.sku}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity_returned}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(item.total_price)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.condition_notes || 'Not specified'}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.restock ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Exchange Items */}
              {selectedReturn.exchange_items && selectedReturn.exchange_items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Exchange Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReturn.exchange_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product.name}</div>
                                {item.product.sku && (
                                  <div className="text-sm text-muted-foreground">SKU: {item.product.sku}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>{formatCurrency(item.total_price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {selectedReturn.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedReturn.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}