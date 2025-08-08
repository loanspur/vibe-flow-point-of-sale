import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowUpDown, 
  RotateCw, 
  Package, 
  TrendingDown
} from 'lucide-react';
import { StockTaking } from './stock/StockTaking';
import { StockAdjustments } from './stock/StockAdjustments';
import { StockTransfers } from './stock/StockTransfers';
import { StockOverview } from './stock/StockOverview';

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
      value: '3',
      icon: Package,
      color: 'bg-blue-500',
      to: '/admin/products'
    },
    {
      title: 'Low Stock Items',
      value: '0',
      icon: TrendingDown,
      color: 'bg-red-500',
      to: '/admin/products?filter=low-stock'
    },
    {
      title: 'Adjustments Today',
      value: '0',
      icon: RotateCw,
      color: 'bg-yellow-500',
      to: '/admin/stock?tab=adjustments'
    },
    {
      title: 'Transfers Pending',
      value: '0',
      icon: ArrowUpDown,
      color: 'bg-purple-500',
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stockMetrics.map((metric, index) => (
          <Link to={metric.to} className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg">
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold">{metric.value}</p>
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


      {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stock-taking">Stock Taking</TabsTrigger>
            <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <StockOverview />
        </TabsContent>

        <TabsContent value="stock-taking" className="space-y-4">
          <StockTaking />
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <StockAdjustments />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <StockTransfers />
        </TabsContent>
      </Tabs>
    </div>
  );
};