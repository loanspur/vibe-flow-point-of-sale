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
import { updateProductInventory } from "@/lib/inventory-integration";
import { createPurchaseReturnJournalEntry } from "@/lib/accounting-integration";
import { useAuth } from "@/contexts/AuthContext";

interface ReturnReasonCode {
  id: string;
  code: string;
  description: string;
  requires_approval: boolean;
}

interface Purchase {
  id: string;
  purchase_number: string;
  total_amount: number;
  supplier_id: string;
  status: string;
  created_at: string;
  contacts?: {
    name: string;
    email?: string;
  };
  purchase_items: PurchaseItem[];
}

interface PurchaseItem {
  id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  products: {
    name: string;
    sku?: string;
  };
}

interface PurchaseReturn {
  id: string;
  return_number: string;
  original_sale_id?: string;
  customer_id?: string;
  supplier_id?: string;
  return_type: 'refund' | 'replacement' | 'credit_note' | 'purchase';
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  reason_code_id?: string;
  custom_reason?: string;
  total_amount: number;
  refund_amount: number;
  store_credit_amount: number;
  refund_method?: string;
  notes?: string;
  created_at: string;
  return_reason_codes?: ReturnReasonCode;
  customers?: {
    name: string;
    email?: string;
  };
  contacts?: {
    name: string;
    email?: string;
  };
  return_items: PurchaseReturnItem[];
}

interface PurchaseReturnItem {
  id: string;
  product_id: string;
  quantity_returned: number;
  unit_cost: number;
  total_cost: number;
  condition_notes?: string;
  restock: boolean;
  products: {
    name: string;
    sku?: string;
  };
}

interface ReturnFormData {
  return_type: 'refund' | 'replacement' | 'credit_note';
  reason_code_id?: string;
  custom_reason?: string;
  refund_method?: string;
  notes?: string;
}

export default function PurchaseReturns() {
  const { tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState('historical-purchases');
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [reasonCodes, setReasonCodes] = useState<ReturnReasonCode[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [newReturnDialogOpen, setNewReturnDialogOpen] = useState(false);
  const [viewReturnDialogOpen, setViewReturnDialogOpen] = useState<string | null>(null);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [returnFormData, setReturnFormData] = useState<ReturnFormData>({
    return_type: 'refund',
    refund_method: 'bank_transfer'
  });
  const [selectedItems, setSelectedItems] = useState<{[key: string]: { quantity: number; condition: string; restock: boolean }}>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchReturns();
    fetchReasonCodes();
    fetchHistoricalPurchases();
  }, []);

  const fetchReturns = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          return_reason_codes(id, code, description, requires_approval),
          customers(name, email),
          contacts(name, email),
          return_items(
            *,
            products(name, sku)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('return_type', 'purchase')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data as any || []);
    } catch (error) {
      console.error('Failed to fetch purchase returns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase returns",
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

  const fetchHistoricalPurchases = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          contacts!purchases_supplier_id_fkey(name, email),
          purchase_items(
            *,
            products(name, sku)
          )
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['received', 'completed'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Failed to fetch historical purchases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch historical purchases",
        variant: "destructive"
      });
    }
  };

  const searchPurchase = async () => {
    if (!purchaseSearch.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          contacts!purchases_supplier_id_fkey(name, email),
          purchase_items(
            *,
            products(name, sku)
          )
        `)
        .eq('purchase_number', purchaseSearch.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Not Found",
            description: "No purchase found with that number",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }
      
      setSelectedPurchase(data);
      // Initialize selected items
      const initialSelection: {[key: string]: { quantity: number; condition: string; restock: boolean }} = {};
      data.purchase_items.forEach((item: any) => {
        initialSelection[item.id] = { quantity: 0, condition: 'new', restock: true };
      });
      setSelectedItems(initialSelection);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for purchase",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      case 'replacement': return <ArrowLeftRight className="h-4 w-4" />;
      case 'credit_note': return <Receipt className="h-4 w-4" />;
      default: return <RotateCcw className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateReturnTotal = () => {
    if (!selectedPurchase) return 0;
    
    return selectedPurchase.purchase_items.reduce((total, item) => {
      const selectedQuantity = selectedItems[item.id]?.quantity || 0;
      return total + (selectedQuantity * item.unit_cost);
    }, 0);
  };

  const generateReturnNumber = () => {
    return `RET-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  };

  const processReturn = async () => {
    if (!selectedPurchase || !tenantId) return;

    const returnTotal = calculateReturnTotal();
    if (returnTotal === 0) {
      toast({
        title: "Error",
        description: "Please select items to return",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const returnNumber = generateReturnNumber();

      // Create purchase return record (using returns table with supplier_id)
      const { data: returnRecord, error: returnError } = await supabase
        .from('returns')
        .insert({
          return_number: returnNumber,
          supplier_id: selectedPurchase.supplier_id,  // Use supplier_id for purchase returns
          return_type: 'purchase',
          status: 'completed',
          reason_code_id: returnFormData.reason_code_id,
          custom_reason: returnFormData.custom_reason,
          total_amount: returnTotal,
          refund_amount: returnFormData.return_type === 'refund' ? returnTotal : 0,
          store_credit_amount: returnFormData.return_type === 'credit_note' ? returnTotal : 0,
          refund_method: returnFormData.refund_method,
          notes: `Purchase return for ${selectedPurchase.purchase_number}. ${returnFormData.notes || ''}`,
          tenant_id: tenantId,
          processed_by: user.id,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items and update inventory
      const returnItems = [];
      const inventoryTransactions = [];

      for (const item of selectedPurchase.purchase_items) {
        const selectedItem = selectedItems[item.id];
        if (selectedItem && selectedItem.quantity > 0) {
          // Create return item
          const returnItem = {
            return_id: returnRecord.id,
            product_id: item.product_id,
            quantity_returned: selectedItem.quantity,
            unit_price: item.unit_cost,
            total_price: selectedItem.quantity * item.unit_cost,
            condition_notes: selectedItem.condition,
            restock: selectedItem.restock,
          };
          returnItems.push(returnItem);

          // Add to inventory if restocking
          if (selectedItem.restock) {
            inventoryTransactions.push({
              productId: item.product_id,
              quantity: selectedItem.quantity,
              type: 'return' as const,
              referenceId: returnRecord.id,
              referenceType: 'purchase_return',
              unitCost: item.unit_cost,
              notes: `Purchase return: ${returnNumber}`,
            });
          }
        }
      }

      if (returnItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(returnItems);

        if (itemsError) throw itemsError;

        // Update inventory for restocked items
        if (inventoryTransactions.length > 0) {
          await updateProductInventory(tenantId, inventoryTransactions);
        }
      }

      // Create accounting entries for purchase return
      try {
        const restockAmount = returnItems
          .filter(item => selectedItems[item.product_id]?.restock)
          .reduce((sum, item) => sum + (item.total_price || 0), 0);

        await createPurchaseReturnJournalEntry(tenantId, {
          returnId: returnRecord.id,
          originalPurchaseId: selectedPurchase.purchase_number,
          supplierId: selectedPurchase.supplier_id,
          refundAmount: returnTotal,
          restockAmount: restockAmount,
          processedBy: user.id
        });
      } catch (accountingError) {
        console.error('Error creating purchase return accounting entries:', accountingError);
        // Don't fail the return if accounting fails
      }

      toast({
        title: "Return Processed",
        description: `Purchase return ${returnNumber} has been successfully processed. Refund amount: ${formatCurrency(returnTotal)}`,
      });

      // Reset form and refresh data
      setNewReturnDialogOpen(false);
      setSelectedPurchase(null);
      setSelectedItems({});
      setReturnFormData({
        return_type: 'refund',
        refund_method: 'bank_transfer'
      });
      fetchReturns();
      fetchHistoricalPurchases();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process return",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const supplierName = returnItem.contacts?.name || 'Unknown Supplier';
    const customerName = returnItem.customers?.name || 'Unknown Customer';
    const matchesSearch = returnItem.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.purchase_number.toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
                         purchase.contacts?.name.toLowerCase().includes(purchaseSearchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Returns</h2>
          <p className="text-muted-foreground">Process returns, refunds, and replacements for purchases</p>
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
              <DialogTitle>Create New Purchase Return</DialogTitle>
              <DialogDescription>
                Search for the original purchase and process the return
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Purchase Search */}
              <div className="space-y-4">
                <Label>Search Original Purchase</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter purchase number..."
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPurchase()}
                  />
                  <Button onClick={searchPurchase} disabled={loading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedPurchase && (
                <>
                  {/* Purchase Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Purchase {selectedPurchase.purchase_number}
                      </CardTitle>
                      <CardDescription>
                        {selectedPurchase.contacts?.name || 'Unknown Supplier'} • {format(new Date(selectedPurchase.created_at), 'PPp')} • {formatCurrency(selectedPurchase.total_amount)}
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
                          <TableHead>Ordered Qty</TableHead>
                          <TableHead>Received Qty</TableHead>
                          <TableHead>Return Qty</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Restock</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Return Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPurchase.purchase_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.products.name}</div>
                                {item.products.sku && (
                                  <div className="text-sm text-muted-foreground">SKU: {item.products.sku}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity_ordered}</TableCell>
                            <TableCell>{item.quantity_received}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity_received}
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
                            <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={selectedItems[item.id]?.restock || false}
                                onCheckedChange={(checked) => setSelectedItems(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    restock: !!checked
                                  }
                                }))}
                              />
                            </TableCell>
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
                              {formatCurrency((selectedItems[item.id]?.quantity || 0) * item.unit_cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Return Summary */}
                    <Card className="mt-4">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium">Total Return Amount:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(calculateReturnTotal())}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Return Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Return Type</Label>
                      <Select
                        value={returnFormData.return_type}
                        onValueChange={(value: 'refund' | 'replacement' | 'credit_note') => 
                          setReturnFormData(prev => ({ ...prev, return_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="replacement">Replacement</SelectItem>
                          <SelectItem value="credit_note">Credit Note</SelectItem>
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
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="credit_note">Credit Note</SelectItem>
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
                    <Button onClick={processReturn} disabled={loading || calculateReturnTotal() === 0}>
                      {loading ? "Processing..." : `Process Return - ${formatCurrency(calculateReturnTotal())}`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View Return Dialog */}
        <Dialog open={viewReturnDialogOpen !== null} onOpenChange={(open) => !open && setViewReturnDialogOpen(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Return Details</DialogTitle>
              <DialogDescription>
                View detailed information about this purchase return
              </DialogDescription>
            </DialogHeader>
            
            {viewReturnDialogOpen && (() => {
              const returnItem = returns.find(r => r.id === viewReturnDialogOpen);
              if (!returnItem) return <div>Return not found</div>;
              
              return (
                <div className="space-y-6">
                  {/* Return Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Return {returnItem.return_number}
                      </CardTitle>
                      <CardDescription>
                        Supplier: {returnItem.contacts?.name || 'Unknown Supplier'} • 
                        Date: {format(new Date(returnItem.created_at), 'PPp')} • 
                        Status: {returnItem.status.toUpperCase()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Return Type</Label>
                          <div className="flex items-center gap-2 mt-1">
                            {getReturnTypeIcon(returnItem.return_type)}
                            <span className="capitalize">{returnItem.return_type}</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                          <div className="text-lg font-semibold mt-1">{formatCurrency(returnItem.total_amount)}</div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Refund Amount</Label>
                          <div className="text-lg font-semibold mt-1 text-green-600">
                            {formatCurrency(returnItem.refund_amount)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <div className="mt-1">{getStatusBadge(returnItem.status)}</div>
                        </div>
                      </div>
                      
                      {returnItem.refund_method && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium text-muted-foreground">Refund Method</Label>
                          <div className="mt-1 capitalize">{returnItem.refund_method.replace('_', ' ')}</div>
                        </div>
                      )}
                      
                      {returnItem.notes && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                          <div className="mt-1 p-3 bg-muted rounded-md text-sm">{returnItem.notes}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Returned Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Returned Items</CardTitle>
                      <CardDescription>List of items included in this return</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {returnItem.return_items && returnItem.return_items.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Quantity Returned</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Restocked</TableHead>
                              <TableHead>Condition</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {returnItem.return_items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.products.name}</div>
                                    {item.products.sku && (
                                      <div className="text-sm text-muted-foreground">SKU: {item.products.sku}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{item.quantity_returned}</TableCell>
                                <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                                <TableCell className="font-semibold">
                                  {formatCurrency(item.total_cost)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={item.restock ? "default" : "secondary"}>
                                    {item.restock ? "Yes" : "No"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {item.condition_notes || 'No condition notes'}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No returned items found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="historical-purchases">Historical Purchases</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="reason-codes">Reason Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="historical-purchases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Received Purchases - Return Options</CardTitle>
              <CardDescription>Choose any received or completed purchase to process returns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search for purchases */}
              <div className="flex gap-4">
                <Input
                  placeholder="Search purchases by number or supplier..."
                  value={purchaseSearchTerm}
                  onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {filteredPurchases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {purchaseSearchTerm ? 'No purchases found matching your search' : 'No received purchases found'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purchase #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                        <TableCell>{purchase.contacts?.name || 'Unknown Supplier'}</TableCell>
                        <TableCell>{format(new Date(purchase.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{formatCurrency(purchase.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              const initialSelection: {[key: string]: { quantity: number; condition: string; restock: boolean }} = {};
                              purchase.purchase_items.forEach((item: any) => {
                                initialSelection[item.id] = { quantity: 0, condition: 'new', restock: true };
                              });
                              setSelectedItems(initialSelection);
                              setNewReturnDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Process Return
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                <CardTitle className="text-sm font-medium">Credit Notes Issued</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(returns.reduce((sum, r) => sum + (r.store_credit_amount || 0), 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Returns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Purchase Returns</CardTitle>
              <CardDescription>Latest return transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {returns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No purchase returns found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Supplier</TableHead>
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
                        <TableCell>{returnItem.contacts?.name || returnItem.customers?.name || 'Unknown'}</TableCell>
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
              )}
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
              {filteredReturns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No purchase returns found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Supplier</TableHead>
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
                        <TableCell>{returnItem.contacts?.name || returnItem.customers?.name || 'Unknown'}</TableCell>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewReturnDialogOpen(returnItem.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reason-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Return Reason Codes</CardTitle>
              <CardDescription>Manage return reason codes for purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Requires Approval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reasonCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-medium">{code.code}</TableCell>
                      <TableCell>{code.description}</TableCell>
                      <TableCell>
                        <Badge variant={code.requires_approval ? "destructive" : "secondary"}>
                          {code.requires_approval ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}