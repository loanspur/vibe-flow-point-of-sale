import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Building2, 
  Settings, 
  DollarSign, 
  ShoppingCart,
  Package,
  TrendingUp,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TenantAdminDashboard() {
  const { user, tenantId } = useAuth();

  const businessStats = [
    {
      title: "Today's Sales",
      value: "$2,450",
      change: "+15% from yesterday",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Orders",
      value: "89",
      change: "+12 from yesterday", 
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Products",
      value: "156",
      change: "3 low stock items",
      icon: Package,
      color: "text-purple-600"
    },
    {
      title: "Team Members",
      value: "8",
      change: "2 online now",
      icon: Users,
      color: "text-orange-600"
    }
  ];

  const quickActions = [
    {
      title: "Process Sale",
      description: "Start a new transaction",
      icon: ShoppingCart,
      href: "/pos",
      color: "bg-green-50 text-green-600"
    },
    {
      title: "Manage Products", 
      description: "Add, edit, or view inventory",
      icon: Package,
      href: "/products",
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "View Reports",
      description: "Sales and business analytics",
      icon: BarChart3,
      href: "/reports",
      color: "bg-purple-50 text-purple-600"
    },
    {
      title: "Team Management",
      description: "Manage staff and permissions",
      icon: Users,
      href: "/team",
      color: "bg-orange-50 text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Business Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary">
              Tenant Admin
            </Badge>
            <Button asChild>
              <Link to="/pos">
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Sale
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {businessStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
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

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} to={action.href}>
                  <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
                    <CardHeader className="text-center">
                      <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mx-auto mb-3`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity and Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest sales activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: "#1234", customer: "John Doe", amount: "$45.99", time: "2 minutes ago", status: "completed" },
                  { id: "#1233", customer: "Sarah Smith", amount: "$23.50", time: "15 minutes ago", status: "completed" },
                  { id: "#1232", customer: "Mike Johnson", amount: "$78.25", time: "1 hour ago", status: "completed" },
                  { id: "#1231", customer: "Emily Davis", amount: "$156.00", time: "2 hours ago", status: "refunded" }
                ].map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{transaction.id}</p>
                        <p className="text-sm text-muted-foreground">{transaction.customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{transaction.amount}</p>
                      <p className="text-sm text-muted-foreground">{transaction.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Summary */}
          <Card>
            <CardHeader>
              <CardTitle>This Week's Performance</CardTitle>
              <CardDescription>Sales summary for the current week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Sales</span>
                  <span className="font-bold text-lg">$12,450</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transactions</span>
                  <span className="font-medium">423</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Order</span>
                  <span className="font-medium">$29.43</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Growth</span>
                  <Badge className="bg-green-100 text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}