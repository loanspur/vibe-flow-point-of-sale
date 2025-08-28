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
import { CashDrawerCorrection } from "./CashDrawerCorrection";
import { LowStockAlert } from "./LowStockAlert";
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
          title: "Total Sales",
          value: "Loading...",
          change: "Loading...",
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
        },
        {
          title: "Purchases",
          value: "Loading...",
          change: "0%",
          icon: DollarSign,
          trend: "up",
          loading: true
        }
      ];
    }

    return [
      {
        title: "Total Sales",
        value: formatCurrency(dashboardData.totalRevenue),
        change: `Today: ${formatCurrency(dashboardData.todayRevenue)}`,
        icon: () => <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-5 w-5 text-primary" />,
        trend: "up",
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
        loading: false
      },
      {
        title: "Purchases",
        value: formatCurrency(dashboardData.todayPurchases),
        change: "Today",
        icon: () => <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-5 w-5 text-destructive" />,
        trend: "up",
        loading: false,
        clickable: true,
        onClick: () => window.open('/admin/purchases', '_blank')
      }
    ];
  }, [dashboardData, formatCurrency, currentDrawer, percentageChanges, tenantCurrency]);

  // Listen for dashboard refresh events and manual refresh
  useEffect(() => {
    // DISABLED: Window event listeners to prevent refresh triggers
    // const handleDashboardRefresh = () => {
    //   refresh();
    // };

    // window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    // return () => window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
  }, [refresh]);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Mobile-first header */}
        <div className="text-center space-y-4 mb-8 sm:mb-12 lg:mb-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <h2 className="text-responsive-2xl font-bold text-foreground text-center">
              Powerful insights at
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> your fingertips</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="flex items-center gap-2 touch-target"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-responsive-base text-muted-foreground max-w-3xl mx-auto">
              Make data-driven decisions with real-time analytics, comprehensive reporting, and actionable business insights.
            </p>
            <Badge variant="outline" className="mx-auto">Auto-refreshes every 30s</Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
            {/* Mobile-optimized metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayMetrics.slice(0, 5).map((metric, index) => (
                <Card key={index} className={`mobile-card hover:shadow-[var(--shadow-card)] transition-all duration-300 ${
                  metric.loading ? 'animate-pulse' : ''
                } ${metric.clickable ? 'cursor-pointer hover:scale-105' : ''}`}
                onClick={metric.onClick}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{metric.title}</p>
                      <p className={`text-lg sm:text-xl lg:text-2xl font-bold text-foreground ${metric.loading ? 'bg-muted rounded h-6 sm:h-8 w-16 sm:w-20' : ''}`}>
                        {metric.loading ? '' : metric.value}
                      </p>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className={`h-3 w-3 sm:h-4 sm:w-4 ${
                          metric.trend === 'up' ? 'text-pos-success' : 'text-destructive'
                        }`} />
                        <span className={`text-xs sm:text-sm font-medium ${
                          metric.trend === 'up' ? 'text-pos-success' : 'text-destructive'
                        } truncate`}>
                          {metric.loading ? '' : metric.change}
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                      <metric.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Mobile-optimized alerts */}
            <div className="space-y-4">
              <LowStockAlert />
              <CashDrawerCorrection />
            </div>

            {/* Mobile-optimized quick actions */}
            <Card className="mobile-card bg-gradient-to-br from-card to-card/50 border-border">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-responsive-lg font-semibold text-foreground">Quick Actions</h3>
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start touch-target text-responsive-sm">
                    New Sale
                  </Button>
                  <Button variant="outline" className="justify-start touch-target text-responsive-sm">
                    Add Product
                  </Button>
                  <Button variant="outline" className="justify-start touch-target text-responsive-sm">
                    View Reports
                  </Button>
                  <Button variant="outline" className="justify-start touch-target text-responsive-sm">
                    Manage Staff
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Mobile-optimized image section */}
          <div className="relative order-1 lg:order-2">
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