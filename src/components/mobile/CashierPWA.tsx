import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShoppingCart, 
  Search, 
  Barcode, 
  CreditCard, 
  Receipt,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Plus,
  Minus,
  Trash2,
  Smartphone
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface CashierPWAProps {
  deviceId: string;
  tenantId: string;
}

export default function CashierPWA({ deviceId, tenantId }: CashierPWAProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerPhone, setCustomerPhone] = useState('');

  // Mock products data
  const mockProducts = [
    { id: '1', name: 'Coca Cola 500ml', price: 50, sku: 'CC001', stock: 100 },
    { id: '2', name: 'Bread White', price: 80, sku: 'BR001', stock: 50 },
    { id: '3', name: 'Milk 1L', price: 120, sku: 'ML001', stock: 30 },
    { id: '4', name: 'Sugar 1kg', price: 150, sku: 'SG001', stock: 25 },
    { id: '5', name: 'Rice 2kg', price: 200, sku: 'RC001', stock: 40 },
  ];

  // Initialize products
  useEffect(() => {
    setProducts(mockProducts);
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Search products
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add item to cart
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }]);
    }

    toast({
      title: 'Added to cart',
      description: `${product.name} added to cart`,
    });
  };

  // Update cart item quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
        : item
    ));
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Calculate cart totals
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = cartTotal * 0.16; // 16% tax
  const total = cartTotal + tax;

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Empty cart',
        description: 'Please add items to cart before processing payment',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Simulate payment processing
      setIsSyncing(true);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create receipt data
      const receipt = {
        receiptNumber: `RCP-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        items: cart,
        subtotal: cartTotal,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        cashier: user?.user_metadata?.full_name || 'Cashier'
      };

      // Print receipt (simulated)
      console.log('Printing receipt:', receipt);

      // Clear cart
      setCart([]);
      setCustomerPhone('');

      toast({
        title: 'Payment processed',
        description: 'Transaction completed successfully',
      });
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual sync
  const handleManualSync = async () => {
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: 'Sync completed',
        description: 'Data synchronized successfully',
      });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync data',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Cashier POS</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.user_metadata?.full_name || 'Cashier'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="pos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pos">POS</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Products Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Products
                  </CardTitle>
                  <CardDescription>
                    Search and add products to cart
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search products, SKU, or barcode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button size="icon" variant="outline">
                      <Barcode className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Products List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => addToCart(product)}
                      >
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            SKU: {product.sku} • Stock: {product.stock}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {new Intl.NumberFormat('en-KE', {
                              style: 'currency',
                              currency: 'KES',
                            }).format(product.price)}
                          </p>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cart Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Cart
                  </CardTitle>
                  <CardDescription>
                    {cart.length} items in cart
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Intl.NumberFormat('en-KE', {
                              style: 'currency',
                              currency: 'KES',
                            }).format(item.price)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{new Intl.NumberFormat('en-KE', {
                        style: 'currency',
                        currency: 'KES',
                      }).format(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (16%):</span>
                      <span>{new Intl.NumberFormat('en-KE', {
                        style: 'currency',
                        currency: 'KES',
                      }).format(tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{new Intl.NumberFormat('en-KE', {
                        style: 'currency',
                        currency: 'KES',
                      }).format(total)}</span>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="space-y-3">
                    <Input
                      placeholder="Customer phone (optional)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('cash')}
                      >
                        Cash
                      </Button>
                      <Button
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('card')}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Card
                      </Button>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={processPayment}
                      disabled={cart.length === 0 || isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Receipt className="h-5 w-5 mr-2" />
                          Process Payment
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  Manage products and inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Product management features will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sync Status</CardTitle>
                <CardDescription>
                  Monitor data synchronization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium">Connection</h4>
                    <Badge variant={isOnline ? 'default' : 'destructive'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Sync Status</h4>
                    <Badge variant={isSyncing ? 'default' : 'outline'}>
                      {isSyncing ? 'Syncing...' : 'Idle'}
                    </Badge>
                  </div>
                </div>
                
                <Button
                  onClick={handleManualSync}
                  disabled={!isOnline || isSyncing}
                  className="w-full"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
