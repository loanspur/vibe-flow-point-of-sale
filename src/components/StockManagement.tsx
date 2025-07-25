import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  ArrowUpDown, 
  RotateCw, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Plus
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

  const stockMetrics = [
    {
      title: 'Total Products',
      value: '3',
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Low Stock Items',
      value: '0',
      icon: TrendingDown,
      color: 'bg-red-500'
    },
    {
      title: 'Adjustments Today',
      value: '0',
      icon: RotateCw,
      color: 'bg-yellow-500'
    },
    {
      title: 'Transfers Pending',
      value: '0',
      icon: ArrowUpDown,
      color: 'bg-purple-500'
    }
  ];

  const quickActions = [
    {
      title: 'Start Stock Taking',
      description: 'Begin physical count session',
      icon: ClipboardCheck,
      action: () => setActiveTab('stock-taking'),
      color: 'bg-green-500'
    },
    {
      title: 'Create Adjustment',
      description: 'Adjust stock quantities',
      icon: RotateCw,
      action: () => setActiveTab('adjustments'),
      color: 'bg-yellow-500'
    },
    {
      title: 'Transfer Stock',
      description: 'Move stock between locations',
      icon: ArrowUpDown,
      action: () => setActiveTab('transfers'),
      color: 'bg-purple-500'
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
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={action.action}
              >
                <div className="flex items-center gap-3">
                  <div className={`${action.color} p-2 rounded-full`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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