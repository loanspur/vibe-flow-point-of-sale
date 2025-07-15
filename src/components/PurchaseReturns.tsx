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

interface Purchase {
  id: string;
  purchase_number: string;
  total_amount: number;
  supplier_id: string;
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
  original_purchase_id?: string;
  supplier_id?: string;
  return_type: 'refund' | 'replacement' | 'credit_note';
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  reason_code_id?: string;
  custom_reason?: string;
  total_amount: number;
  refund_amount: number;
  credit_amount: number;
  refund_method?: string;
  notes?: string;
  created_at: string;
  return_reason_codes?: ReturnReasonCode;
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
  const [activeTab, setActiveTab] = useState('overview');
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [reasonCodes, setReasonCodes] = useState<ReturnReasonCode[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [newReturnDialogOpen, setNewReturnDialogOpen] = useState(false);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [returnFormData, setReturnFormData] = useState<ReturnFormData>({
    return_type: 'refund',
    refund_method: 'bank_transfer'
  });
  const [selectedItems, setSelectedItems] = useState<{[key: string]: { quantity: number; condition: string }}>({});
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
      // Note: Purchase returns would be fetched from a dedicated table when implemented
      // For now, returns are managed through the general returns table
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          return_reason_codes(id, code, description, requires_approval),
          contacts!returns_customer_id_fkey(name, email),
          return_items(
            *,
            products(name, sku)
          )
        `)
        .eq('return_type', 'refund')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data as any || []);
    } catch (error) {
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
      const initialSelection: {[key: string]: { quantity: number; condition: string }} = {};
      data.purchase_items.forEach((item: any) => {
        initialSelection[item.id] = { quantity: 0, condition: 'new' };
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

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.contacts?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    return matchesSearch && matchesStatus;
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
                    <Button disabled={loading}>
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
                <CardTitle className="text-sm font-medium">Credit Notes Issued</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(returns.reduce((sum, r) => sum + r.credit_amount, 0))}
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
                        <TableCell>{returnItem.contacts?.name || 'Unknown Supplier'}</TableCell>
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
                        <TableCell>{returnItem.contacts?.name || 'Unknown Supplier'}</TableCell>
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
                            onClick={() => setSelectedReturn(returnItem)}
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