import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { initializeDefaultChartOfAccounts } from "@/lib/default-accounts";
import { useApp } from "@/contexts/AppContext";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { verifyAccountingIntegration, syncExistingTransactions } from "@/lib/accounting-verification";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users,
  ArrowUpRight,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import dashboardImage from "@/assets/dashboard-preview.jpg";

const Dashboard = () => {
  const { tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const [initialMetrics] = useState([
    {
      title: "Today's Sales",
      value: "0",
      change: "0%",
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Transactions",
      value: "0",
      change: "0%",
      icon: Activity,
      trend: "up"
    },
    {
      title: "Products Sold",
      value: "0",
      change: "0%",
      icon: ShoppingBag,
      trend: "up"
    },
    {
      title: "Customers",
      value: "0",
      change: "0%",
      icon: Users,
      trend: "up"
    }
  ]);

  // Initialize accounting system only once
  useEffect(() => {
    if (tenantId) {
      initializeDefaultChartOfAccounts(tenantId).catch(error => {
        console.error('Error initializing accounting system:', error);
      });
    }
  }, [tenantId]);


  // Optimized data fetching with caching
  const { data: dashboardData, loading } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: null, error: null };
      
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all data in parallel for better performance
      const [todaySalesResponse, customersResponse, saleItemsResponse] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount, created_at')
          .eq('tenant_id', tenantId)
          .gte('created_at', today),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabase
          .from('sale_items')
          .select('quantity, sales!inner(created_at, tenant_id)')
          .eq('sales.tenant_id', tenantId)
          .gte('sales.created_at', today)
      ]);

      if (todaySalesResponse.error) throw todaySalesResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (saleItemsResponse.error) throw saleItemsResponse.error;

      const todayRevenue = todaySalesResponse.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const todayTransactions = todaySalesResponse.data?.length || 0;
      const totalProductsSold = saleItemsResponse.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalCustomers = customersResponse.count || 0;

      return {
        data: {
          todayRevenue,
          todayTransactions,
          totalProductsSold,
          totalCustomers
        },
        error: null
      };
    },
    [tenantId],
    {
      enabled: !!tenantId,
      staleTime: 2 * 60 * 1000, // 2 minutes cache
      cacheKey: `dashboard-metrics-${tenantId}`
    }
  );

  // Memoize display metrics calculation
  const displayMetrics = useMemo(() => {
    if (!dashboardData) {
      return initialMetrics;
    }

    return [
      {
        title: "Today's Sales",
        value: formatCurrency(dashboardData.todayRevenue),
        change: "0%",
        icon: DollarSign,
        trend: "up"
      },
      {
        title: "Transactions",
        value: dashboardData.todayTransactions.toString(),
        change: "0%",
        icon: Activity,
        trend: "up"
      },
      {
        title: "Products Sold",
        value: dashboardData.totalProductsSold.toString(),
        change: "0%",
        icon: ShoppingBag,
        trend: "up"
      },
      {
        title: "Customers",
        value: dashboardData.totalCustomers.toString(),
        change: "0%",
        icon: Users,
        trend: "up"
      }
    ];
  }, [dashboardData, formatCurrency, initialMetrics]);

  // Initialize accounting system only once
  useEffect(() => {
    if (tenantId) {
      initializeDefaultChartOfAccounts(tenantId).catch(error => {
        console.error('Error initializing accounting system:', error);
      });
    }
  }, [tenantId]);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Powerful insights at
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> your fingertips</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Make data-driven decisions with real-time analytics, comprehensive reporting, and actionable business insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              {displayMetrics.map((metric, index) => (
                <Card key={index} className="p-6 bg-card border-border hover:shadow-[var(--shadow-card)] transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
                      <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4 text-pos-success" />
                        <span className="text-sm text-pos-success font-medium">{metric.change}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <metric.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start">
                    New Sale
                  </Button>
                  <Button variant="outline" className="justify-start">
                    Add Product
                  </Button>
                  <Button variant="outline" className="justify-start">
                    View Reports
                  </Button>
                  <Button variant="outline" className="justify-start">
                    Manage Staff
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="relative">
            <div className="relative z-10">
              <img 
                src={dashboardImage} 
                alt="vibePOS Dashboard Analytics" 
                className="w-full h-auto rounded-2xl shadow-[var(--shadow-elegant)] border border-border"
              />
            </div>
            <div className="absolute -top-4 -right-4 -bottom-4 -left-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;