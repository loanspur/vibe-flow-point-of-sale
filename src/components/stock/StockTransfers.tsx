import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Plus, Truck, Package, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { processStockTransfer } from '@/lib/inventory-integration';

export const StockTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferItems, setTransferItems] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTransfers();
    fetchLocations();
    fetchProducts();
  }, [user]);

  const fetchTransfers = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          from_location:store_locations!from_location_id(name),
          to_location:store_locations!to_location_id(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching stock transfers:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity, cost_price')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addTransferItem = () => {
    setTransferItems([
      ...transferItems,
      {
        product_id: '',
        quantity_requested: 0,
        unit_cost: 0
      }
    ]);
  };

  const updateTransferItem = (index: number, field: string, value: any) => {
    const updatedItems = [...transferItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-fill unit cost when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].unit_cost = product.cost_price || 0;
      }
    }
    
    setTransferItems(updatedItems);
  };

  const removeTransferItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const createTransfer = async (formData: FormData) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      if (transferItems.length === 0) {
        throw new Error('Please add at least one transfer item');
      }

      const fromLocationId = formData.get('from_location_id') as string;
      const toLocationId = formData.get('to_location_id') as string;

      if (fromLocationId === toLocationId) {
        throw new Error('From and To locations must be different');
      }

      const transferNumber = `TRF-${Date.now()}`;

      // Calculate totals
      const totalItems = transferItems.reduce((sum, item) => sum + item.quantity_requested, 0);
      const totalValue = transferItems.reduce((sum, item) => {
        return sum + (item.quantity_requested * (item.unit_cost || 0));
      }, 0);

      // Create transfer record
      const { data: transfer, error } = await supabase
        .from('stock_transfers')
        .insert({
          tenant_id: profile.tenant_id,
          transfer_number: transferNumber,
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          total_items: totalItems,
          total_value: totalValue,
          status: 'pending',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create transfer items
      const itemsToInsert = transferItems.map(item => ({
        transfer_id: transfer.id,
        product_id: item.product_id,
        quantity_requested: item.quantity_requested,
        quantity_shipped: item.quantity_requested, // Auto-ship for now
        quantity_received: 0,
        unit_cost: item.unit_cost || 0,
        total_cost: item.quantity_requested * (item.unit_cost || 0)
      }));

      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Stock Transfer Created',
        description: `Transfer ${transferNumber} has been created successfully.`
      });

      setIsCreateDialogOpen(false);
      setTransferItems([]);
      fetchTransfers();
    } catch (error) {
      console.error('Error creating stock transfer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create stock transfer.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const completeTransfer = async (transferId: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      // Get transfer items
      const { data: items, error: itemsError } = await supabase
        .from('stock_transfer_items')
        .select('*')
        .eq('transfer_id', transferId);

      if (itemsError) throw itemsError;

      // Update transfer status
      const { error: updateError } = await supabase
        .from('stock_transfers')
        .update({
          status: 'completed',
          received_by: user?.id,
          received_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (updateError) throw updateError;

      // Update transfer items to mark as received (set quantity_received = quantity_shipped)
      if (items) {
        for (const item of items) {
          await supabase
            .from('stock_transfer_items')
            .update({ quantity_received: item.quantity_shipped })
            .eq('id', item.id);
        }
      }

      // Get transfer details for processing
      const transfer = transfers.find(t => t.id === transferId);
      if (transfer && items) {
        await processStockTransfer(
          profile.tenant_id,
          transferId,
          items.map(item => ({
            productId: item.product_id,
            quantityTransferred: item.quantity_shipped
          })),
          transfer.from_location_id,
          transfer.to_location_id
        );
      }

      toast({
        title: 'Transfer Completed',
        description: 'Stock transfer has been completed successfully.'
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error completing transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete stock transfer.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_transit': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Package className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Stock Transfers</h2>
          <p className="text-muted-foreground">
            Transfer inventory between different store locations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Stock Transfer</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createTransfer(new FormData(e.currentTarget));
            }}>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from_location_id">From Location</Label>
                    <Select name="from_location_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="to_location_id">To Location</Label>
                    <Select name="to_location_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Transfer Items</Label>
                    <Button type="button" variant="outline" onClick={addTransferItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {transferItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      No items added. Click "Add Item" to start.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transferItems.map((item, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-4 gap-4 items-end">
                              <div>
                                <Label>Product</Label>
                                <Select
                                  value={item.product_id}
                                  onValueChange={(value) => updateTransferItem(index, 'product_id', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name} ({product.sku}) - Stock: {product.stock_quantity}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity_requested}
                                  onChange={(e) => updateTransferItem(index, 'quantity_requested', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Unit Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_cost}
                                  onChange={(e) => updateTransferItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  readOnly
                                />
                              </div>
                              <div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeTransferItem(index)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || transferItems.length === 0}>
                    {loading ? 'Creating...' : 'Create Transfer'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transfers List */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock transfers found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">
                      {transfer.transfer_number}
                    </TableCell>
                    <TableCell>
                      {new Date(transfer.transfer_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{transfer.from_location?.name}</TableCell>
                    <TableCell>{transfer.to_location?.name}</TableCell>
                    <TableCell>{transfer.total_items}</TableCell>
                    <TableCell>KES {transfer.total_value.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`text-white ${getStatusColor(transfer.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(transfer.status)}
                        {transfer.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transfer.status === 'in_transit' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => completeTransfer(transfer.id)}
                          disabled={loading}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};