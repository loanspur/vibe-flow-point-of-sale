import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
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
  Activity,
  Crown
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const { user, userRole } = useAuth();

  const adminStats = [
    {
      title: "Total Tenants",
      value: "24",
      change: "+3 this month",
      icon: Building2,
      color: "text-blue-600"
    },
    {
      title: "Active Users",
      value: "1,247",
      change: "+12% this month", 
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Monthly Revenue",
      value: "$18,950",
      change: "+8.2% from last month",
      icon: DollarSign,
      color: "text-purple-600"
    },
    {
      title: "System Health",
      value: "99.9%",
      change: "Uptime this month",
      icon: Activity,
      color: "text-emerald-600"
    }
  ];

  const quickActions = [
    {
      title: "Manage Tenants",
      description: "View and manage all tenant accounts",
      icon: Building2,
      href: "/tenants",
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "User Management", 
      description: "Manage users across all tenants",
      icon: Users,
      href: "/users",
      color: "bg-green-50 text-green-600"
    },
    {
      title: "System Analytics",
      description: "View platform-wide analytics",
      icon: BarChart3,
      href: "/analytics",
      color: "bg-purple-50 text-purple-600"
    },
    {
      title: "Settings",
      description: "Configure system settings",
      icon: Settings,
      href: "/settings",
      color: "bg-orange-50 text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Badge variant="outline" className="text-yellow-600 border-yellow-200">
            <Crown className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminStats.map((stat, index) => {
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

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Platform Activity</CardTitle>
              <CardDescription>Latest actions across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "New tenant signup", tenant: "Sunrise Coffee Co", time: "2 minutes ago", type: "success" },
                  { action: "Payment processed", tenant: "TechFlow Solutions", time: "15 minutes ago", type: "success" },
                  { action: "Trial started", tenant: "Urban Style Boutique", time: "1 hour ago", type: "info" },
                  { action: "Support ticket", tenant: "Mountain View Deli", time: "2 hours ago", type: "warning" }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'success' ? 'bg-green-500' :
                        activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{activity.tenant}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}