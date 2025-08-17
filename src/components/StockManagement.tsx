import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  ArrowUpDown, 
  RotateCw, 
  Package, 
  TrendingDown
} from 'lucide-react';

// Lazy load components for better performance
const StockOverview = lazy(() => import('./stock/StockOverview').then(module => ({ default: module.StockOverview })));
const StockTaking = lazy(() => import('./stock/StockTaking').then(module => ({ default: module.StockTaking })));
const StockAdjustments = lazy(() => import('./stock/StockAdjustments').then(module => ({ default: module.StockAdjustments })));
const StockTransfers = lazy(() => import('./stock/StockTransfers').then(module => ({ default: module.StockTransfers })));

interface StockManagementProps {
  className?: string;
}

export const StockManagement: React.FC<StockManagementProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location.search]);

  const stockMetrics = [
    {
      title: 'Total Products',
      icon: Package,
      color: 'bg-primary',
      to: '/admin/products'
    },
    {
      title: 'Low Stock Items', 
      icon: TrendingDown,
      color: 'bg-destructive',
      to: '/admin/products?filter=low-stock'
    },
    {
      title: 'Adjustments Today',
      icon: RotateCw,
      color: 'bg-warning',
      to: '/admin/stock?tab=adjustments'
    },
    {
      title: 'Transfers Pending',
      icon: ArrowUpDown,
      color: 'bg-secondary',
      to: '/admin/stock?tab=transfers'
    }
  ];


  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground">
            Manage inventory levels, stock taking, adjustments, and transfers
          </p>
        </div>
      </div>

      {/* Simplified Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stockMetrics.map((metric, index) => (
          <Link 
            key={index}
            to={metric.to} 
            className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg transition-transform hover:scale-[1.02]"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </p>
                  </div>
                  <div className={`${metric.color} p-3 rounded-full`}>
                    <metric.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Tabs with Lazy Loading */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock-taking">Stock Taking</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <Suspense fallback={<LoadingSpinner />}>
          <TabsContent value="overview" className="space-y-4">
            {activeTab === 'overview' && <StockOverview />}
          </TabsContent>

          <TabsContent value="stock-taking" className="space-y-4">
            {activeTab === 'stock-taking' && <StockTaking />}
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            {activeTab === 'adjustments' && <StockAdjustments />}
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            {activeTab === 'transfers' && <StockTransfers />}
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};