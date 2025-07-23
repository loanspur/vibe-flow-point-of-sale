import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowUpRight,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function TenantAdminDashboard() {
  const { user } = useAuth();

  const businessStats = [
    {
      title: "Today's Revenue",
      value: "$2,450",
      change: "+15%",
      changeType: "positive",
      icon: DollarSign,
      description: "vs yesterday",
      trend: [2100, 2200, 2300, 2450]
    },
    {
      title: "Total Orders",
      value: "89",
      change: "+12",
      changeType: "positive", 
      icon: ShoppingCart,
      description: "orders today",
      trend: [77, 82, 85, 89]
    },
    {
      title: "Active Products",
      value: "156",
      change: "3 low stock",
      changeType: "warning",
      icon: Package,
      description: "need attention",
      trend: [160, 158, 157, 156]
    },
    {
      title: "Team Members",
      value: "8",
      change: "2 online",
      changeType: "neutral",
      icon: Users,
      description: "currently active",
      trend: [8, 8, 8, 8]
    }
  ];

  const quickActions = [
    {
      title: "New Sale",
      description: "Process a transaction",
      icon: ShoppingCart,
      href: "/pos",
      color: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
      iconColor: "text-green-600",
      primary: true
    },
    {
      title: "Add Product", 
      description: "Expand your inventory",
      icon: Package,
      href: "/admin/products",
      color: "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      title: "View Reports",
      description: "Business analytics",
      icon: BarChart3,
      href: "/admin/reports",
      color: "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200",
      iconColor: "text-purple-600"
    },
    {
      title: "Manage Team",
      description: "Staff & permissions",
      icon: Users,
      href: "/admin/team",
      color: "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200",
      iconColor: "text-orange-600"
    }
  ];

  const recentActivity = [
    {
      id: "#1234",
      type: "sale",
      customer: "John Doe",
      amount: "$45.99",
      time: "2 minutes ago",
      status: "completed",
      description: "Coffee & pastry"
    },
    {
      id: "#1233",
      type: "sale", 
      customer: "Sarah Smith",
      amount: "$23.50",
      time: "15 minutes ago",
      status: "completed",
      description: "Breakfast combo"
    },
    {
      id: "#1232",
      type: "return",
      customer: "Mike Johnson",
      amount: "-$12.00",
      time: "1 hour ago",
      status: "refunded",
      description: "Product return"
    },
    {
      id: "#1231",
      type: "sale",
      customer: "Emily Davis",
      amount: "$156.00",
      time: "2 hours ago",
      status: "completed",
      description: "Bulk order"
    }
  ];

  const alerts = [
    {
      type: "warning",
      message: "3 products are running low on stock",
      action: "View inventory",
      time: "5 min ago"
    },
    {
      type: "info", 
      message: "Weekly sales report is ready",
      action: "View report",
      time: "1 hour ago"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {getTimeBasedGreeting()}, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your business today.
        </p>
      </div>
        {/* Alerts Bar */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">{alert.message}</span>
                  <span className="text-xs text-orange-600">• {alert.time}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-orange-700 hover:text-orange-900">
                  {alert.action}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {businessStats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.changeType === 'positive';
            const isWarning = stat.changeType === 'warning';
            
            return (
              <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isWarning ? 'bg-orange-100' : isPositive ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      isWarning ? 'text-orange-600' : isPositive ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isPositive && <ArrowUpRight className="h-3 w-3 text-green-600" />}
                      {isWarning && <AlertTriangle className="h-3 w-3 text-orange-600" />}
                      <span className={`text-xs font-medium ${
                        isWarning ? 'text-orange-600' : isPositive ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} to={action.href}>
                  <Card className={`${action.color} hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group ${action.primary ? 'ring-2 ring-green-200' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`h-5 w-5 ${action.iconColor}`} />
                        </div>
                        {action.primary && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold">{action.title}</CardTitle>
                      <CardDescription className="text-sm">{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Activity and Performance */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest business transactions</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-500' : 
                          activity.status === 'refunded' ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{activity.id}</p>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.customer}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${activity.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                          {activity.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>This Week's Performance</CardTitle>
              <CardDescription>Sales summary and key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-900">$12,450</p>
                  </div>
                  <div className="text-right">
                    <TrendingUp className="h-6 w-6 text-green-600 mb-1" />
                    <Badge className="bg-green-100 text-green-700">+12%</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <span className="font-semibold">423</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Order Value</span>
                    <span className="font-semibold">$29.43</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Customer Satisfaction</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}