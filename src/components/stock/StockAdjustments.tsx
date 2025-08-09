import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCw, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEnsureBaseUnitPcs } from '@/hooks/useEnsureBaseUnitPcs';
import { processStockAdjustment } from '@/lib/inventory-integration';

export const StockAdjustments: React.FC = () => {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adjustmentItems, setAdjustmentItems] = useState<any[]>([]);
  const { user } = useAuth();
  useEnsureBaseUnitPcs();
  const { toast } = useToast();

  useEffect(() => {
    fetchAdjustments();
    fetchProducts();
  }, [user]);

  const fetchAdjustments = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdjustments(data || []);
    } catch (error) {
      console.error('Error fetching stock adjustments:', error);
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

  const addAdjustmentItem = () => {
    setAdjustmentItems([
      ...adjustmentItems,
      {
        product_id: '',
        system_quantity: 0,
        physical_quantity: 0,
        adjustment_quantity: 0,
        reason: ''
      }
    ]);
  };

  const updateAdjustmentItem = (index: number, field: string, value: any) => {
    const updatedItems = [...adjustmentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate adjustment quantity
    if (field === 'physical_quantity' || field === 'system_quantity') {
      const physical = field === 'physical_quantity' ? value : updatedItems[index].physical_quantity;
      const system = field === 'system_quantity' ? value : updatedItems[index].system_quantity;
      updatedItems[index].adjustment_quantity = physical - system;
    }
    
    // Auto-fill system quantity when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].system_quantity = product.stock_quantity || 0;
        updatedItems[index].unit_cost = product.cost_price || 0;
      }
    }
    
    setAdjustmentItems(updatedItems);
  };

  const removeAdjustmentItem = (index: number) => {
    setAdjustmentItems(adjustmentItems.filter((_, i) => i !== index));
  };

  const createAdjustment = async (formData: FormData) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      if (adjustmentItems.length === 0) {
        throw new Error('Please add at least one adjustment item');
      }

      const adjustmentNumber = `ADJ-${Date.now()}`;
      const adjustmentType = formData.get('adjustment_type') as string;
      const reason = formData.get('reason') as string;

      // Calculate total value
      const totalValue = adjustmentItems.reduce((sum, item) => {
        return sum + (Math.abs(item.adjustment_quantity) * (item.unit_cost || 0));
      }, 0);

      // Create adjustment record
      const { data: adjustment, error } = await supabase
        .from('stock_adjustments')
        .insert({
          tenant_id: profile.tenant_id,
          adjustment_number: adjustmentNumber,
          adjustment_type: adjustmentType,
          reason: reason,
          total_value: totalValue,
          status: 'approved', // Auto-approve for now
          created_by: user?.id,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create adjustment items
      const itemsToInsert = adjustmentItems.map(item => ({
        adjustment_id: adjustment.id,
        product_id: item.product_id,
        system_quantity: item.system_quantity,
        physical_quantity: item.physical_quantity,
        adjustment_quantity: item.adjustment_quantity,
        unit_cost: item.unit_cost || 0,
        total_cost: item.adjustment_quantity * (item.unit_cost || 0),
        reason: item.reason || reason
      }));

      const { error: itemsError } = await supabase
        .from('stock_adjustment_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Process the adjustment to update inventory
      await processStockAdjustment(
        profile.tenant_id,
        adjustment.id,
        adjustmentItems.map(item => ({
          productId: item.product_id,
          adjustmentQuantity: item.adjustment_quantity,
          reason: item.reason || reason
        }))
      );

      toast({
        title: 'Stock Adjustment Created',
        description: `Adjustment ${adjustmentNumber} has been processed successfully.`
      });

      setIsCreateDialogOpen(false);
      setAdjustmentItems([]);
      fetchAdjustments();
    } catch (error) {
      console.error('Error creating stock adjustment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create stock adjustment.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAdjustmentTypeIcon = (type: string) => {
    switch (type) {
      case 'increase': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <RotateCw className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Stock Adjustments</h2>
          <p className="text-muted-foreground">
            Create adjustments to correct inventory discrepancies
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Stock Adjustment</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createAdjustment(new FormData(e.currentTarget));
            }}>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adjustment_type">Adjustment Type</Label>
                    <Select name="adjustment_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="increase">Increase</SelectItem>
                        <SelectItem value="decrease">Decrease</SelectItem>
                        <SelectItem value="correction">Correction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Input name="reason" required placeholder="Enter reason for adjustment" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Adjustment Items</Label>
                    <Button type="button" variant="outline" onClick={addAdjustmentItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {adjustmentItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      No items added. Click "Add Item" to start.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {adjustmentItems.map((item, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-6 gap-4 items-end">
                              <div>
                                <Label>Product</Label>
                                <Select
                                  value={item.product_id}
                                  onValueChange={(value) => updateAdjustmentItem(index, 'product_id', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>System Qty (pcs)</Label>
                                <Input
                                  type="number"
                                  value={item.system_quantity}
                                  onChange={(e) => updateAdjustmentItem(index, 'system_quantity', parseInt(e.target.value) || 0)}
                                  readOnly
                                />
                              </div>
                              <div>
                                <Label>Physical Qty (pcs)</Label>
                                <Input
                                  type="number"
                                  value={item.physical_quantity}
                                  onChange={(e) => updateAdjustmentItem(index, 'physical_quantity', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Adjustment (pcs)</Label>
                                <Input
                                  type="number"
                                  value={item.adjustment_quantity}
                                  readOnly
                                  className={item.adjustment_quantity > 0 ? 'text-green-600' : 
                                           item.adjustment_quantity < 0 ? 'text-red-600' : ''}
                                />
                              </div>
                              <div>
                                <Label>Reason</Label>
                                <Input
                                  value={item.reason}
                                  onChange={(e) => updateAdjustmentItem(index, 'reason', e.target.value)}
                                  placeholder="Item reason"
                                />
                              </div>
                              <div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeAdjustmentItem(index)}
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
                  <Button type="submit" disabled={loading || adjustmentItems.length === 0}>
                    {loading ? 'Creating...' : 'Create Adjustment'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Adjustments List */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustments History</CardTitle>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock adjustments found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow key={adjustment.id}>
                    <TableCell className="font-medium">
                      {adjustment.adjustment_number}
                    </TableCell>
                    <TableCell>
                      {new Date(adjustment.adjustment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAdjustmentTypeIcon(adjustment.adjustment_type)}
                        <span className="capitalize">{adjustment.adjustment_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{adjustment.reason}</TableCell>
                    <TableCell>
                      <Badge className={`text-white ${getStatusColor(adjustment.status)}`}>
                        {adjustment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>KES {adjustment.total_value.toFixed(2)}</TableCell>
                    <TableCell>Admin</TableCell>
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