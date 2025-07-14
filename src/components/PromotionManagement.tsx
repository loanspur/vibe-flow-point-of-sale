import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Calendar, Clock, Users, Package, Percent, Gift, ShoppingCart, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  min_purchase_amount: number | null;
  max_usage_count: number | null;
  current_usage_count: number;
  customer_type: string | null;
  applies_to: string;
  category_ids: any;
  product_ids: any;
  days_of_week: any;
  time_start: string | null;
  time_end: string | null;
  created_at: string;
  updated_at: string;
}

interface PromotionUsage {
  id: string;
  promotion_id: string;
  sale_id: string | null;
  customer_id: string | null;
  discount_amount: number;
  quantity_affected: number;
  used_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

const PromotionManagement: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionUsage, setPromotionUsage] = useState<PromotionUsage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage',
    status: 'active',
    start_date: '',
    end_date: '',
    discount_percentage: '',
    discount_amount: '',
    buy_quantity: '',
    get_quantity: '',
    min_quantity: '',
    max_quantity: '',
    min_purchase_amount: '',
    max_usage_count: '',
    customer_type: 'all',
    applies_to: 'all',
    category_ids: [] as string[],
    product_ids: [] as string[],
    days_of_week: [] as number[],
    time_start: '',
    time_end: ''
  });

  useEffect(() => {
    fetchPromotions();
    fetchCategories();
    fetchProducts();
    fetchPromotionUsage();
  }, []);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch promotions",
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchPromotionUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('promotion_usage')
        .select('*')
        .order('used_at', { ascending: false });

      if (error) throw error;
      setPromotionUsage(data || []);
    } catch (error) {
      console.error('Error fetching promotion usage:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user's tenant ID
      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      const tenantId = tenantData;

      const promotionData = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        buy_quantity: formData.buy_quantity ? parseInt(formData.buy_quantity) : null,
        get_quantity: formData.get_quantity ? parseInt(formData.get_quantity) : null,
        min_quantity: formData.min_quantity ? parseInt(formData.min_quantity) : null,
        max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : null,
        max_usage_count: formData.max_usage_count ? parseInt(formData.max_usage_count) : null,
        customer_type: formData.customer_type === 'all' ? null : formData.customer_type,
        applies_to: formData.applies_to,
        category_ids: formData.category_ids.length > 0 ? formData.category_ids : null,
        product_ids: formData.product_ids.length > 0 ? formData.product_ids : null,
        days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
        time_start: formData.time_start || null,
        time_end: formData.time_end || null,
        tenant_id: tenantId,
        created_by: user.id
      };

      let error;
      if (editingPromotion) {
        const { error: updateError } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('promotions')
          .insert([promotionData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promotion ${editingPromotion ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingPromotion ? 'update' : 'create'} promotion`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      status: promotion.status,
      start_date: promotion.start_date.split('T')[0],
      end_date: promotion.end_date ? promotion.end_date.split('T')[0] : '',
      discount_percentage: promotion.discount_percentage?.toString() || '',
      discount_amount: promotion.discount_amount?.toString() || '',
      buy_quantity: promotion.buy_quantity?.toString() || '',
      get_quantity: promotion.get_quantity?.toString() || '',
      min_quantity: promotion.min_quantity?.toString() || '',
      max_quantity: promotion.max_quantity?.toString() || '',
      min_purchase_amount: promotion.min_purchase_amount?.toString() || '',
      max_usage_count: promotion.max_usage_count?.toString() || '',
      customer_type: promotion.customer_type || 'all',
      applies_to: promotion.applies_to,
      category_ids: promotion.category_ids || [],
      product_ids: promotion.product_ids || [],
      days_of_week: promotion.days_of_week || [],
      time_start: promotion.time_start || '',
      time_end: promotion.time_end || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotion deleted successfully",
      });

      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        title: "Error",
        description: "Failed to delete promotion",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      status: 'active',
      start_date: '',
      end_date: '',
      discount_percentage: '',
      discount_amount: '',
      buy_quantity: '',
      get_quantity: '',
      min_quantity: '',
      max_quantity: '',
      min_purchase_amount: '',
      max_usage_count: '',
      customer_type: 'all',
      applies_to: 'all',
      category_ids: [],
      product_ids: [],
      days_of_week: [],
      time_start: '',
      time_end: ''
    });
    setEditingPromotion(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'fixed_amount': return <ShoppingCart className="h-4 w-4" />;
      case 'bogo': return <Gift className="h-4 w-4" />;
      case 'bulk_pricing': return <BarChart3 className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      expired: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Promotion Management</h2>
          <p className="text-muted-foreground">
            Create and manage discounts, BOGO offers, and time-based promotions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
              </DialogTitle>
              <DialogDescription>
                Configure discount settings, conditions, and restrictions for your promotion.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="discount">Discount</TabsTrigger>
                  <TabsTrigger value="conditions">Conditions</TabsTrigger>
                  <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Promotion Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Summer Sale 2024"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Promotion Type</Label>
                      <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Discount</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount Discount</SelectItem>
                          <SelectItem value="bogo">Buy One Get One</SelectItem>
                          <SelectItem value="bulk_pricing">Bulk Pricing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Promotion description..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date (Optional)</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="discount" className="space-y-4">
                  {formData.type === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="discount_percentage">Discount Percentage (%)</Label>
                      <Input
                        id="discount_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                        placeholder="10.00"
                        required
                      />
                    </div>
                  )}

                  {formData.type === 'fixed_amount' && (
                    <div className="space-y-2">
                      <Label htmlFor="discount_amount">Discount Amount ($)</Label>
                      <Input
                        id="discount_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                        placeholder="5.00"
                        required
                      />
                    </div>
                  )}

                  {formData.type === 'bogo' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buy_quantity">Buy Quantity</Label>
                        <Input
                          id="buy_quantity"
                          type="number"
                          min="1"
                          value={formData.buy_quantity}
                          onChange={(e) => setFormData({ ...formData, buy_quantity: e.target.value })}
                          placeholder="1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="get_quantity">Get Quantity Free</Label>
                        <Input
                          id="get_quantity"
                          type="number"
                          min="1"
                          value={formData.get_quantity}
                          onChange={(e) => setFormData({ ...formData, get_quantity: e.target.value })}
                          placeholder="1"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === 'bulk_pricing' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min_quantity">Minimum Quantity</Label>
                          <Input
                            id="min_quantity"
                            type="number"
                            min="1"
                            value={formData.min_quantity}
                            onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                            placeholder="10"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max_quantity">Maximum Quantity (Optional)</Label>
                          <Input
                            id="max_quantity"
                            type="number"
                            min="1"
                            value={formData.max_quantity}
                            onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                            placeholder="100"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bulk_discount_percentage">Bulk Discount Percentage (%)</Label>
                          <Input
                            id="bulk_discount_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount_percentage}
                            onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                            placeholder="15.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bulk_discount_amount">Or Fixed Amount per Item ($)</Label>
                          <Input
                            id="bulk_discount_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.discount_amount}
                            onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                            placeholder="2.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="conditions" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_purchase_amount">Minimum Purchase Amount ($)</Label>
                      <Input
                        id="min_purchase_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_purchase_amount}
                        onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                        placeholder="50.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_usage_count">Maximum Usage Count</Label>
                      <Input
                        id="max_usage_count"
                        type="number"
                        min="1"
                        value={formData.max_usage_count}
                        onChange={(e) => setFormData({ ...formData, max_usage_count: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_type">Customer Type</Label>
                    <Select value={formData.customer_type} onValueChange={(value) => setFormData({ ...formData, customer_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="new">New Customers</SelectItem>
                        <SelectItem value="returning">Returning Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Days of Week</Label>
                    <div className="flex gap-2">
                      {dayNames.map((day, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${index}`}
                            checked={formData.days_of_week.includes(index)}
                            onCheckedChange={() => handleDayToggle(index)}
                          />
                          <Label htmlFor={`day-${index}`} className="text-sm">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="time_start">Start Time</Label>
                      <Input
                        id="time_start"
                        type="time"
                        value={formData.time_start}
                        onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time_end">End Time</Label>
                      <Input
                        id="time_end"
                        type="time"
                        value={formData.time_end}
                        onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="restrictions" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Applies To</Label>
                    <Select value={formData.applies_to} onValueChange={(value: any) => setFormData({ ...formData, applies_to: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="categories">Specific Categories</SelectItem>
                        <SelectItem value="products">Specific Products</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.applies_to === 'categories' && (
                    <div className="space-y-2">
                      <Label>Select Categories</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${category.id}`}
                              checked={formData.category_ids.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    category_ids: [...formData.category_ids, category.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    category_ids: formData.category_ids.filter(id => id !== category.id)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`cat-${category.id}`} className="text-sm">{category.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.applies_to === 'products' && (
                    <div className="space-y-2">
                      <Label>Select Products</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                        {products.map((product) => (
                          <div key={product.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`prod-${product.id}`}
                              checked={formData.product_ids.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    product_ids: [...formData.product_ids, product.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    product_ids: formData.product_ids.filter(id => id !== product.id)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={`prod-${product.id}`} className="text-sm">
                              {product.name} - ${product.price}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingPromotion ? 'Update' : 'Create'} Promotion
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Promotions</TabsTrigger>
          <TabsTrigger value="all">All Promotions</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Promotions</CardTitle>
              <CardDescription>Currently running promotions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.filter(p => p.status === 'active').map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{promotion.name}</div>
                          {promotion.description && (
                            <div className="text-sm text-muted-foreground">{promotion.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(promotion.type)}
                          <span className="capitalize">{promotion.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {promotion.type === 'percentage' && `${promotion.discount_percentage}%`}
                        {promotion.type === 'fixed_amount' && `$${promotion.discount_amount}`}
                        {promotion.type === 'bogo' && `Buy ${promotion.buy_quantity} Get ${promotion.get_quantity}`}
                        {promotion.type === 'bulk_pricing' && `${promotion.min_quantity}+ items`}
                      </TableCell>
                      <TableCell>
                        {promotion.current_usage_count}
                        {promotion.max_usage_count && ` / ${promotion.max_usage_count}`}
                      </TableCell>
                      <TableCell>
                        {promotion.end_date ? format(new Date(promotion.end_date), 'MMM dd, yyyy') : 'No expiry'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(promotion)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(promotion.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Promotions</CardTitle>
              <CardDescription>Complete list of promotions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{promotion.name}</div>
                          {promotion.description && (
                            <div className="text-sm text-muted-foreground">{promotion.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(promotion.type)}
                          <span className="capitalize">{promotion.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(promotion.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(promotion.start_date), 'MMM dd, yyyy')}</div>
                          <div className="text-muted-foreground">
                            to {promotion.end_date ? format(new Date(promotion.end_date), 'MMM dd, yyyy') : 'No end'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {promotion.current_usage_count}
                        {promotion.max_usage_count && ` / ${promotion.max_usage_count}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(promotion)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(promotion.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Promotion Usage Analytics</CardTitle>
              <CardDescription>Track promotion performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Promotion</TableHead>
                    <TableHead>Discount Applied</TableHead>
                    <TableHead>Items Affected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotionUsage.slice(0, 50).map((usage) => {
                    const promotion = promotions.find(p => p.id === usage.promotion_id);
                    return (
                      <TableRow key={usage.id}>
                        <TableCell>{format(new Date(usage.used_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell>{promotion?.name || 'Unknown'}</TableCell>
                        <TableCell>${usage.discount_amount.toFixed(2)}</TableCell>
                        <TableCell>{usage.quantity_affected}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromotionManagement;