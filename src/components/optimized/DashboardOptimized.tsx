import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { initializeDefaultChartOfAccounts } from "@/lib/default-accounts";
import { useApp } from "@/contexts/AppContext";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users,
  ArrowUpRight,
  Activity
} from "lucide-react";
import { CurrencyIcon } from "@/components/ui/currency-icon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import dashboardImage from "@/assets/dashboard-preview.jpg";
import { useCashDrawer } from "@/hooks/useCashDrawer";
import { Wallet } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
}

// Memoized metric card component
const MetricCard = React.memo<MetricCardProps>(({ title, value, change, icon: Icon, onClick }) => (
  <Card className="p-6 bg-card border-border hover:shadow-[var(--shadow-card)] transition-all duration-300 cursor-pointer" onClick={onClick}>
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <div className="flex items-center gap-1">
          <ArrowUpRight className="h-4 w-4 text-pos-success" />
          <span className="text-sm text-pos-success font-medium">{change}</span>
        </div>
      </div>
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  </Card>
));

// Memoized metrics grid component
const MetricsGrid = React.memo<{ metrics: any[] }>(({ metrics }) => (
  <div className="grid grid-cols-2 gap-4">
    {metrics.map((metric, index) => (
      <MetricCard
        key={index}
        title={metric.title}
        value={metric.value}
        change={metric.change}
        icon={metric.icon}
      />
    ))}
  </div>
));

// Memoized quick actions component
const QuickActionsCard = React.memo(() => {
  const quickActions = useMemo(() => [
    { label: 'New Sale', action: () => console.log('New Sale') },
    { label: 'Add Product', action: () => console.log('Add Product') },
    { label: 'View Reports', action: () => console.log('View Reports') },
    { label: 'Manage Staff', action: () => console.log('Manage Staff') }
  ], []);

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Button 
              key={index}
              variant="outline" 
              className="justify-start"
              onClick={action.action}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
});

export const DashboardOptimized = React.memo(() => {
  const { tenantId } = useAuth();
  const { formatCurrency, tenantCurrency } = useApp();
  const { currentDrawer } = useCashDrawer();
  
  // Preload dashboard image when component mounts
  useEffect(() => {
    const preloadImage = () => {
      const img = new Image();
      img.src = dashboardImage;
    };
    preloadImage();
  }, []);
  
  const initialMetrics = useMemo(() => [
    {
      title: "Today's Sales",
      value: "0",
      change: "0%",
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Cash Balance",
      value: "0",
      change: "0%",
      icon: Wallet,
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
  ], []);

  // Initialize accounting system only once
  useEffect(() => {
    if (tenantId) {
      initializeDefaultChartOfAccounts(tenantId).catch(error => {
        console.error('Error initializing accounting system:', error);
      });
    }
  }, [tenantId]);

  // Optimized data fetching with caching and minimal fields
  const { data: dashboardData, loading } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: null, error: null };
      
      const today = new Date().toISOString().split('T')[0];
      
      // Optimized parallel queries with only needed fields
      const [todaySalesResponse, customersResponse, saleItemsResponse] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', today),
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabase
          .from('sale_items')
          .select('quantity, sales!inner(tenant_id)')
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
      staleTime: 3 * 60 * 1000, // 3 minutes cache for dashboard
      cacheKey: `dashboard-metrics-${tenantId}-${new Date().toISOString().split('T')[0]}`
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
        icon: () => <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-5 w-5 text-primary" />,
        trend: "up"
      },
      {
        title: "Cash Balance",
        value: formatCurrency(currentDrawer?.current_balance || 0),
        change: currentDrawer?.status === 'open' ? 'Open' : 'Closed',
        icon: Wallet,
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
  }, [dashboardData, formatCurrency, tenantCurrency, initialMetrics, currentDrawer]);

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
            <MetricsGrid metrics={displayMetrics} />
            <QuickActionsCard />
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
});

export default DashboardOptimized;