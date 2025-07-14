import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import ProductManagement from '@/components/ProductManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart,
  DollarSign,
  FileText,
  Calculator,
  UserPlus,
  Phone,
  ShoppingBag,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  Building2
} from 'lucide-react';

export default function ComprehensivePOS() {
  const { user, tenantId, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Show setup warning if no tenant is configured
  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Tenant Setup Required</CardTitle>
                <CardDescription>
                  Your account needs to be associated with a tenant to access the POS system.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please contact your system administrator to assign you to a tenant.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { title: "Today's Sales", value: "$2,450", change: "+15%", icon: DollarSign, color: "text-green-600" },
    { title: "Orders", value: "89", change: "+12", icon: ShoppingCart, color: "text-blue-600" },
    { title: "Products", value: "156", change: "3 low stock", icon: Package, color: "text-purple-600" },
    { title: "Customers", value: "432", change: "+8 today", icon: Users, color: "text-orange-600" }
  ];

  const recentSales = [
    { id: "#001", customer: "John Doe", amount: "$45.99", time: "2 min ago", status: "completed" },
    { id: "#002", customer: "Sarah Smith", amount: "$23.50", time: "15 min ago", status: "completed" },
    { id: "#003", customer: "Mike Johnson", amount: "$78.25", time: "1 hour ago", status: "completed" }
  ];

  const products = [
    { id: "1", name: "Coffee Beans (1kg)", sku: "CB001", price: "$24.99", stock: 45, category: "Beverages" },
    { id: "2", name: "Espresso Cup", sku: "EC001", price: "$8.99", stock: 23, category: "Accessories" },
    { id: "3", name: "Milk Frother", sku: "MF001", price: "$34.99", stock: 12, category: "Equipment" }
  ];

  const customers = [
    { id: "1", name: "John Doe", email: "john@example.com", phone: "+1234567890", orders: 15, totalSpent: "$450" },
    { id: "2", name: "Sarah Smith", email: "sarah@example.com", phone: "+1234567891", orders: 8, totalSpent: "$320" },
    { id: "3", name: "Mike Johnson", email: "mike@example.com", phone: "+1234567892", orders: 22, totalSpent: "$780" }
  ];

  const purchases = [
    { id: "P001", supplier: "Coffee Suppliers Inc", items: "Coffee Beans, Filters", amount: "$450", date: "2024-01-15", status: "received" },
    { id: "P002", supplier: "Equipment Co", items: "Espresso Machine", amount: "$1,200", date: "2024-01-12", status: "pending" }
  ];

  const ActionButton = ({ icon: Icon, children, onClick, variant = "outline" }: any) => (
    <Button variant={variant} size="sm" onClick={onClick} className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {children}
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">POS Management System</h1>
            <p className="text-muted-foreground">Complete business management solution</p>
            {tenantId && (
              <Badge variant="outline" className="mt-2">
                <Building2 className="h-3 w-3 mr-1" />
                Tenant Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary capitalize">
              {userRole || 'User'}
            </Badge>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Quick Sale
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-7 min-w-[700px]">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm">Products</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs sm:text-sm">Sales</TabsTrigger>
              <TabsTrigger value="customers" className="text-xs sm:text-sm">Customers</TabsTrigger>
              <TabsTrigger value="purchases" className="text-xs sm:text-sm">Purchases</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="accounting" className="text-xs sm:text-sm">Accounting</TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Latest transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentSales.map((sale, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <div>
                            <p className="font-medium">{sale.id}</p>
                            <p className="text-sm text-muted-foreground">{sale.customer}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{sale.amount}</p>
                          <p className="text-sm text-muted-foreground">{sale.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Frequently used features</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <ActionButton icon={ShoppingCart} onClick={() => setActiveTab('sales')}>
                      New Sale
                    </ActionButton>
                    <ActionButton icon={Package} onClick={() => setActiveTab('products')}>
                      Add Product
                    </ActionButton>
                    <ActionButton icon={UserPlus} onClick={() => setActiveTab('customers')}>
                      Add Customer
                    </ActionButton>
                    <ActionButton icon={BarChart3} onClick={() => setActiveTab('accounting')}>
                      View Reports
                    </ActionButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {tenantId ? (
              <ProductManagement />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
                  <p className="text-muted-foreground text-center">
                    Product management requires an active tenant. Please contact your administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sales Management</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Sales</span>
                      <span className="font-bold">$2,450</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transactions</span>
                      <span className="font-bold">89</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Sale</span>
                      <span className="font-bold">$27.53</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentSales.map((sale, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{sale.id} - {sale.customer}</p>
                          <p className="text-sm text-muted-foreground">{sale.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{sale.amount}</p>
                          <Badge variant="secondary">{sale.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Customer Management</h2>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="p-4 font-medium">Name</th>
                        <th className="p-4 font-medium">Contact</th>
                        <th className="p-4 font-medium">Orders</th>
                        <th className="p-4 font-medium">Total Spent</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => (
                        <tr key={customer.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{customer.name}</td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm">{customer.email}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            </div>
                          </td>
                          <td className="p-4">{customer.orders}</td>
                          <td className="p-4 font-medium">{customer.totalSpent}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Purchase Management</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase Order
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="p-4 font-medium">Order ID</th>
                        <th className="p-4 font-medium">Supplier</th>
                        <th className="p-4 font-medium">Items</th>
                        <th className="p-4 font-medium">Amount</th>
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((purchase) => (
                        <tr key={purchase.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{purchase.id}</td>
                          <td className="p-4">{purchase.supplier}</td>
                          <td className="p-4">{purchase.items}</td>
                          <td className="p-4 font-medium">{purchase.amount}</td>
                          <td className="p-4">{purchase.date}</td>
                          <td className="p-4">
                            <Badge variant={purchase.status === 'received' ? "secondary" : "outline"}>
                              {purchase.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Admin</span>
                      <Badge>2</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Manager</span>
                      <Badge>3</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cashier</span>
                      <Badge>8</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "John Admin", role: "Admin", status: "online", lastSeen: "Now" },
                      { name: "Sarah Manager", role: "Manager", status: "online", lastSeen: "5 min ago" },
                      { name: "Mike Cashier", role: "Cashier", status: "offline", lastSeen: "2 hours ago" }
                    ].map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.role}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.lastSeen}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Accounting Tab */}
          <TabsContent value="accounting" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Accounting & Reports</h2>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                  <CardDescription>This month's overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Revenue</span>
                      <span className="font-bold text-green-600">$45,230</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Expenses</span>
                      <span className="font-bold text-red-600">$12,450</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Net Profit</span>
                      <span className="font-bold">$32,780</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Profit Margin</span>
                      <span className="font-bold">72.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Reports</CardTitle>
                  <CardDescription>Generate common reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Sales Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="h-4 w-4 mr-2" />
                      Inventory Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calculator className="h-4 w-4 mr-2" />
                      Tax Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Profit & Loss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}