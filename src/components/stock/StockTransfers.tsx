import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Plus, Truck, Package, CheckCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEnsureBaseUnitPcs } from '@/hooks/useEnsureBaseUnitPcs';
import { processStockTransfer } from '@/lib/inventory-integration';

export const StockTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [transferItems, setTransferItems] = useState<any[]>([]);
  const [editTransferItems, setEditTransferItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  useEnsureBaseUnitPcs();
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

      // Fetch products with variants and stock quantities
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          sku, 
          stock_quantity, 
          cost_price,
          product_variants (
            id,
            name,
            value,
            stock_quantity,
            sale_price
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);

      if (error) throw error;
      
      // Flatten products and variants for easier selection
      const productsWithVariants: any[] = [];
      (data || []).forEach(product => {
        // Add main product
        productsWithVariants.push({
          id: product.id,
          variant_id: null,
          name: product.name,
          sku: product.sku,
          stock_quantity: product.stock_quantity,
          cost_price: product.cost_price,
          display_name: product.name
        });
        
        // Add variants if they exist
        if (product.product_variants && product.product_variants.length > 0) {
          product.product_variants.forEach((variant: any) => {
            productsWithVariants.push({
              id: product.id,
              variant_id: variant.id,
              name: product.name,
              sku: product.sku,
              stock_quantity: variant.stock_quantity,
              cost_price: variant.sale_price || product.cost_price, // Use sale_price from variant as cost_price fallback
              display_name: `${product.name} - ${variant.name}: ${variant.value}`
            });
          });
        }
      });
      
      setProducts(productsWithVariants);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addTransferItem = () => {
    setTransferItems([
      ...transferItems,
      {
        product_id: '',
        variant_id: null,
        quantity_requested: 0,
        unit_cost: 0
      }
    ]);
  };

  const updateTransferItem = (index: number, field: string, value: any) => {
    const updatedItems = [...transferItems];
    
    if (field === 'product_selection') {
      // Parse product and variant IDs from the selection value
      const [productId, variantId] = value.split('|');
      const product = products.find(p => p.id === productId && 
        (variantId === 'null' ? p.variant_id === null : p.variant_id === variantId));
      
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          product_id: productId,
          variant_id: variantId === 'null' ? null : variantId,
          unit_cost: product.cost_price || 0,
          available_stock: product.stock_quantity || 0
        };
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
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
        variant_id: item.variant_id,
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

  const viewTransferDetails = async (transferId: string) => {
    try {
      const transfer = transfers.find(t => t.id === transferId);
      if (!transfer) return;

      // Fetch transfer items first
      const { data: items, error: itemsError } = await supabase
        .from('stock_transfer_items')
        .select('*')
        .eq('transfer_id', transferId);

      if (itemsError) throw itemsError;

      // If we have items, fetch product details separately
      let enrichedItems = items || [];
      if (items && items.length > 0) {
        const productIds = items.map(item => item.product_id).filter(Boolean);
        const variantIds = items.map(item => item.variant_id).filter(Boolean);

        // Fetch products
        let productDetails = [];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name, sku')
            .in('id', productIds);
          productDetails = products || [];
        }

        // Fetch variants if any
        let variantDetails = [];
        if (variantIds.length > 0) {
          const { data: variants } = await supabase
            .from('product_variants')
            .select('id, name, value')
            .in('id', variantIds);
          variantDetails = variants || [];
        }

        // Enrich items with product/variant details
        enrichedItems = items.map(item => ({
          ...item,
          product: productDetails.find(p => p.id === item.product_id) || null,
          variant: variantDetails.find(v => v.id === item.variant_id) || null
        }));
      }

      setSelectedTransfer({ ...transfer, items: enrichedItems });
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching transfer details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch transfer details.',
        variant: 'destructive'
      });
    }
  };

  const editTransfer = async (transfer: any) => {
    try {
      // Fetch transfer items for editing
      const { data: items, error } = await supabase
        .from('stock_transfer_items')
        .select(`
          *,
          product:products(name, sku),
          variant:product_variants(name, value)
        `)
        .eq('transfer_id', transfer.id);

      if (error) throw error;

      const formattedItems = (items || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity_requested: item.quantity_requested,
        unit_cost: item.unit_cost
      }));

      setSelectedTransfer(transfer);
      setEditTransferItems(formattedItems);
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error preparing transfer for edit:', error);
      toast({
        title: 'Error',
        description: 'Failed to prepare transfer for editing.',
        variant: 'destructive'
      });
    }
  };

  const deleteTransfer = async (transferId: string) => {
    try {
      const { error } = await supabase
        .from('stock_transfers')
        .delete()
        .eq('id', transferId);

      if (error) throw error;

      toast({
        title: 'Transfer Deleted',
        description: 'Stock transfer has been deleted successfully.'
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error deleting transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete stock transfer.',
        variant: 'destructive'
      });
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
                             <div className="grid grid-cols-5 gap-4 items-end">
                               <div>
                                 <Label>Product/Variant</Label>
                                 <Select
                                   value={item.product_id ? `${item.product_id}|${item.variant_id || 'null'}` : ''}
                                   onValueChange={(value) => updateTransferItem(index, 'product_selection', value)}
                                 >
                                   <SelectTrigger>
                                     <SelectValue placeholder="Select product" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {products.map((product) => (
                                       <SelectItem 
                                         key={`${product.id}-${product.variant_id || 'main'}`} 
                                         value={`${product.id}|${product.variant_id || 'null'}`}
                                       >
                                         {product.display_name} - Stock: {product.stock_quantity}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                               <div>
                                 <Label>Available Stock</Label>
                                 <Input
                                   type="number"
                                   value={item.available_stock || 0}
                                   readOnly
                                   className="bg-muted"
                                 />
                               </div>
                               <div>
                                 <Label>Quantity</Label>
                                 <Input
                                   type="number"
                                   min="1"
                                   max={item.available_stock || 0}
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
                             {item.available_stock !== undefined && item.quantity_requested > item.available_stock && (
                               <p className="text-sm text-destructive mt-2">
                                 Quantity exceeds available stock ({item.available_stock})
                               </p>
                             )}
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
                      <div className="flex items-center gap-2">
                        {/* View Details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewTransferDetails(transfer.id)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {/* Edit Transfer (only for pending status) */}
                        {transfer.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editTransfer(transfer)}
                            className="h-8 w-8 p-0"
                            title="Edit Transfer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Complete Transfer (only for in_transit status) */}
                        {transfer.status === 'in_transit' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => completeTransfer(transfer.id)}
                            disabled={loading}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            title="Complete Transfer"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                         {/* Delete Transfer (only for pending or cancelled status) */}
                         {(transfer.status === 'pending' || transfer.status === 'cancelled') && (
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                 title="Delete Transfer"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Delete Stock Transfer</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Are you sure you want to delete transfer {transfer.transfer_number}? This action cannot be undone.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                 <AlertDialogAction
                                   onClick={() => deleteTransfer(transfer.id)}
                                   className="bg-red-600 hover:bg-red-700"
                                 >
                                   Delete
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Transfer Details Modal */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Details - {selectedTransfer?.transfer_number}</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transfer Number</Label>
                  <Input value={selectedTransfer.transfer_number} readOnly />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input value={new Date(selectedTransfer.transfer_date).toLocaleDateString()} readOnly />
                </div>
                <div>
                  <Label>From Location</Label>
                  <Input value={selectedTransfer.from_location?.name || 'N/A'} readOnly />
                </div>
                <div>
                  <Label>To Location</Label>
                  <Input value={selectedTransfer.to_location?.name || 'N/A'} readOnly />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-white ${getStatusColor(selectedTransfer.status)} flex items-center gap-1 w-fit`}>
                      {getStatusIcon(selectedTransfer.status)}
                      {selectedTransfer.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Total Value</Label>
                  <Input value={`KES ${selectedTransfer.total_value.toFixed(2)}`} readOnly />
                </div>
              </div>
              
              {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                <div>
                  <Label>Transfer Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Shipped</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransfer.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {item.product?.name || 'Unknown Product'}
                            {item.variant && ` - ${item.variant.name}: ${item.variant.value}`}
                          </TableCell>
                          <TableCell>{item.quantity_requested}</TableCell>
                          <TableCell>{item.quantity_shipped}</TableCell>
                          <TableCell>{item.quantity_received}</TableCell>
                          <TableCell>KES {item.unit_cost.toFixed(2)}</TableCell>
                          <TableCell>KES {item.total_cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transfer Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transfer - {selectedTransfer?.transfer_number}</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transfer Number</Label>
                  <Input value={selectedTransfer.transfer_number} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input value={new Date(selectedTransfer.transfer_date).toLocaleDateString()} readOnly className="bg-muted" />
                </div>
              </div>
              
              <div>
                <Label className="text-base font-semibold">Transfer Items</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  You can only modify quantities for pending transfers.
                </p>
                
                {editTransferItems.length > 0 && (
                  <div className="space-y-4">
                    {editTransferItems.map((item, index) => {
                      const product = products.find(p => 
                        p.id === item.product_id && 
                        (item.variant_id ? p.variant_id === item.variant_id : p.variant_id === null)
                      );
                      
                      return (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-4 gap-4 items-center">
                              <div>
                                <Label>Product</Label>
                                <Input 
                                  value={product?.display_name || 'Unknown Product'} 
                                  readOnly 
                                  className="bg-muted"
                                />
                              </div>
                              <div>
                                <Label>Available Stock</Label>
                                <Input
                                  type="number"
                                  value={product?.stock_quantity || 0}
                                  readOnly
                                  className="bg-muted"
                                />
                              </div>
                              <div>
                                <Label>Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={product?.stock_quantity || 0}
                                  value={item.quantity_requested}
                                  onChange={(e) => {
                                    const updatedItems = [...editTransferItems];
                                    updatedItems[index].quantity_requested = parseInt(e.target.value) || 0;
                                    setEditTransferItems(updatedItems);
                                  }}
                                />
                              </div>
                              <div>
                                <Label>Unit Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_cost}
                                  readOnly
                                  className="bg-muted"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    // Implementation for updating transfer
                    toast({
                      title: 'Feature Coming Soon',
                      description: 'Transfer editing will be implemented in the next update.',
                    });
                    setIsEditDialogOpen(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};