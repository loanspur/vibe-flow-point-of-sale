import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
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
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function SuperAdminDashboard() {
  const { user, userRole } = useAuth();
  const { formatCurrency } = useApp();
  // Use base currency for all superadmin views
  const formatBaseCurrency = (amount: number) => formatCurrency(amount);
  const [dashboardData, setDashboardData] = useState({
    totalTenants: 0,
    activeUsers: 0,
    monthlyRevenue: 0,
    systemHealth: 99.9
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString();

        const [
          tenantsCountResponse,
          activeUsersCountResponse,
          paymentsResponse,
          activityResponse,
          versionResponse
        ] = await Promise.all([
          // Total active/trial tenants (count only)
          supabase
            .from('tenants')
            .select('id', { count: 'exact', head: true })
            .in('status', ['active', 'trial']),

          // Active users across all tenants (count only)
          supabase
            .from('tenant_users')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_active', true),

          // Completed payments this month
          supabase
            .from('payment_history')
            .select('amount, paid_at, created_at')
            .eq('payment_status', 'completed')
            .or(`paid_at.gte.${monthStart},and(paid_at.is.null,created_at.gte.${monthStart})`),

          // Recent activity logs
          supabase
            .from('user_activity_logs')
            .select('action_type, details, created_at, tenant_id')
            .order('created_at', { ascending: false })
            .limit(10),

          // Current application version to infer system health
          supabase.rpc('get_current_application_version')
        ]);

        const monthlyRevenue = paymentsResponse.error
          ? 0
          : (paymentsResponse.data || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

        const isStable = Array.isArray(versionResponse.data)
          ? versionResponse.data[0]?.is_stable !== false
          : true;

        setDashboardData({
          totalTenants: tenantsCountResponse.count || 0,
          activeUsers: activeUsersCountResponse.count || 0,
          monthlyRevenue,
          systemHealth: isStable ? 99.9 : 99.0
        });

        if (!activityResponse.error && activityResponse.data) {
          setRecentActivity(activityResponse.data as any);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  const adminStats = [
    {
      title: "Total Tenants",
      value: loading ? "..." : dashboardData.totalTenants.toString(),
      change: "+3 this month",
      icon: Building2,
      color: "text-blue-600",
      href: "/superadmin/tenants"
    },
    {
      title: "Active Users",
      value: loading ? "..." : dashboardData.activeUsers.toLocaleString(),
      change: "+12% this month", 
      icon: Users,
      color: "text-green-600",
      href: "/superadmin/users"
    },
    {
      title: "Monthly Revenue",
      value: loading ? "..." : formatBaseCurrency(dashboardData.monthlyRevenue),
      change: "+8.2% from last month",
      icon: () => <CurrencyIcon currency="KES" className="h-4 w-4" />,
      color: "text-purple-600",
      href: "/superadmin/revenue"
    },
    {
      title: "System Health",
      value: `${dashboardData.systemHealth}%`,
      change: "Uptime this month",
      icon: Activity,
      color: "text-emerald-600",
      href: "/superadmin/system"
    }
  ];

  const quickActions = [
    {
      title: "Manage Tenants",
      description: "View and manage all tenant accounts",
      icon: Building2,
      href: "/superadmin/tenants",
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "User Management", 
      description: "Manage users across all tenants",
      icon: Users,
      href: "/superadmin/users",
      color: "bg-green-50 text-green-600"
    },
    {
      title: "System Analytics",
      description: "View platform-wide analytics",
      icon: BarChart3,
      href: "/superadmin/analytics",
      color: "bg-purple-50 text-purple-600"
    },
    {
      title: "Settings",
      description: "Configure system settings",
      icon: Settings,
      href: "/superadmin/settings",
      color: "bg-orange-50 text-orange-600"
    }
  ];

  return (
    <div className="p-6 space-y-6">
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
              <Link to={stat.href || '#'} className="block">
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    {stat.title === "Monthly Revenue" ? (
                      <CurrencyIcon currency="KES" className={`h-4 w-4 ${stat.color}`} />
                    ) : (
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </CardContent>
                </Card>
              </Link>
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
                {loading ? (
                  <p className="text-muted-foreground">Loading recent activity...</p>
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity: any, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.action_type === 'login' ? 'bg-green-500' :
                          activity.action_type === 'create' ? 'bg-blue-500' :
                          activity.action_type === 'update' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`} />
                        <div>
                          <p className="font-medium">{activity.action_type}</p>
                          <p className="text-sm text-muted-foreground">Tenant: {activity.tenant_id}</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No recent activity found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}