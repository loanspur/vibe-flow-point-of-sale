import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { initializeDefaultChartOfAccounts } from "@/lib/default-accounts";
import { useApp } from "@/contexts/AppContext";
import { useOptimizedDashboard } from "@/hooks/useOptimizedDashboard";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  ArrowUpRight,
  Building2,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { CurrencyIcon } from "@/components/ui/currency-icon";
import { useAuth } from "@/contexts/AuthContext";
import dashboardImage from "@/assets/dashboard-preview.jpg";
import { useCashDrawer } from "@/hooks/useCashDrawer";
import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { tenantId } = useAuth();
  const { formatCurrency, tenantCurrency } = useApp();
  const { currentDrawer } = useCashDrawer();
  
  // Use optimized dashboard hook with auto-refresh
  const { data: dashboardData, loading, refresh, percentageChanges } = useOptimizedDashboard();

  // Preload dashboard image when component mounts
  useEffect(() => {
    const preloadImage = () => {
      const img = new Image();
      img.src = dashboardImage;
    };
    preloadImage();
  }, []);

  // Initialize accounting system only once
  useEffect(() => {
    if (tenantId) {
      initializeDefaultChartOfAccounts(tenantId).catch(error => {
        console.error('Error initializing accounting system:', error);
      });
    }
  }, [tenantId]);

  // Memoize display metrics calculation with performance indicators
  const displayMetrics = useMemo(() => {
    if (!dashboardData) {
      return [
        {
          title: "Today's Sales",
          value: "Loading...",
          change: "0%",
          icon: DollarSign,
          trend: "up",
          loading: true
        },
        {
          title: "Cash Balance",
          value: "Loading...",
          change: "0%",
          icon: Wallet,
          trend: "up",
          loading: true
        },
        {
          title: "Banked Today",
          value: "Loading...",
          change: "0%",
          icon: Building2,
          trend: "up",
          loading: true
        },
        {
          title: "Products Sold",
          value: "Loading...",
          change: "0%",
          icon: ShoppingBag,
          trend: "up",
          loading: true
        }
      ];
    }

    return [
      {
        title: "Today's Sales",
        value: formatCurrency(dashboardData.todayRevenue),
        change: percentageChanges?.dailyVsWeekly ? `${percentageChanges.dailyVsWeekly > 0 ? '+' : ''}${percentageChanges.dailyVsWeekly}%` : "0%",
        icon: () => <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-5 w-5 text-primary" />,
        trend: percentageChanges?.dailyVsWeekly >= 0 ? "up" : "down",
        loading: false
      },
      {
        title: "Cash Balance",
        value: formatCurrency(currentDrawer?.current_balance || 0),
        change: currentDrawer?.status === 'open' ? 'Open' : 'Closed',
        icon: Wallet,
        trend: "up",
        loading: false
      },
      {
        title: "Banked Today",
        value: formatCurrency(dashboardData.todayBankedAmount),
        change: "Bank Transfers",
        icon: Building2,
        trend: "up",
        loading: false
      },
      {
        title: "Products Sold",
        value: dashboardData.totalProductsSold.toString(),
        change: "Today",
        icon: ShoppingBag,
        trend: "up",
        loading: false,
        alert: dashboardData.lowStockItems > 0 ? `${dashboardData.lowStockItems} low stock` : undefined
      }
    ];
  }, [dashboardData, formatCurrency, currentDrawer, percentageChanges, tenantCurrency]);

  // Listen for dashboard refresh events and manual refresh
  useEffect(() => {
    const handleDashboardRefresh = () => {
      refresh();
    };

    window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    return () => window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
  }, [refresh]);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
              Powerful insights at
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> your fingertips</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Make data-driven decisions with real-time analytics, comprehensive reporting, and actionable business insights.
            <Badge variant="outline" className="ml-2">Auto-refreshes every 30s</Badge>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              {displayMetrics.map((metric, index) => (
                <Card key={index} className={`p-6 bg-card border-border hover:shadow-[var(--shadow-card)] transition-all duration-300 ${
                  metric.loading ? 'animate-pulse' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
                        {metric.alert && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {metric.alert}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-2xl font-bold text-foreground ${metric.loading ? 'bg-muted rounded h-8 w-20' : ''}`}>
                        {metric.loading ? '' : metric.value}
                      </p>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className={`h-4 w-4 ${
                          metric.trend === 'up' ? 'text-pos-success' : 'text-destructive'
                        }`} />
                        <span className={`text-sm font-medium ${
                          metric.trend === 'up' ? 'text-pos-success' : 'text-destructive'
                        }`}>
                          {metric.loading ? '' : metric.change}
                        </span>
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