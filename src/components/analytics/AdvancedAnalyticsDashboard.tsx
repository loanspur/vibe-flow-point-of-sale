import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AdvancedAnalyticsEngine, CustomerSegment, PredictiveInsight, AnomalyDetection, BusinessMetric, CustomerBehavior } from '@/lib/ai/AdvancedAnalyticsEngine';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Zap,
  Eye,
  Clock,
  CheckCircle,
  DollarSign,
  ShoppingCart,
  Package,
  Activity,
  Gauge,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AdvancedAnalyticsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  
  // Analytics data state
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetric[]>([]);
  const [customerBehaviors, setCustomerBehaviors] = useState<CustomerBehavior[]>([]);

  const analyticsEngine = AdvancedAnalyticsEngine.getInstance();

  // Load analytics data
  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Load customer segments
      const segments = await analyticsEngine.generateCustomerSegments(user?.tenant_id || '');
      setCustomerSegments(segments);

      // Load predictive insights
      const insights = await analyticsEngine.generateSalesForecast(user?.tenant_id || '', 30);
      setPredictiveInsights(insights);

      // Load anomalies
      const detectedAnomalies = await analyticsEngine.detectAnomalies(user?.tenant_id || '');
      setAnomalies(detectedAnomalies);

      // Load business metrics
      const metrics = await analyticsEngine.generateBusinessMetrics(user?.tenant_id || '');
      setBusinessMetrics(metrics);

      // Load customer behaviors
      const behaviors = await analyticsEngine.analyzeCustomerBehavior(user?.tenant_id || '');
      setCustomerBehaviors(behaviors);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh analytics data
  const refreshAnalytics = async () => {
    setIsRefreshing(true);
    try {
      await loadAnalyticsData();
      toast({
        title: 'Success',
        description: 'Analytics data refreshed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [user?.tenant_id]);

  // Format numbers
  const formatNumber = (value: number, type: 'currency' | 'percentage' | 'number' = 'number') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    } else if (type === 'percentage') {
      return `${value.toFixed(1)}%`;
    } else {
      return new Intl.NumberFormat('en-US').format(value);
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  // Customer segments chart data
  const segmentsChartData = customerSegments.map(segment => ({
    name: segment.segment_name,
    customers: segment.customer_count,
    revenue: segment.total_revenue,
    avgOrder: segment.avg_order_value
  }));

  // Predictive insights chart data
  const insightsChartData = predictiveInsights.map(insight => ({
    name: insight.insight_type.replace('_', ' '),
    value: insight.predicted_value,
    confidence: insight.confidence_level * 100
  }));

  // Anomalies by type
  const anomaliesByType = anomalies.reduce((acc, anomaly) => {
    acc[anomaly.anomaly_type] = (acc[anomaly.anomaly_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const anomaliesChartData = Object.entries(anomaliesByType).map(([type, count]) => ({
    name: type.replace('_', ' '),
    count
  }));

  // Customer behavior insights
  const highValueCustomers = customerBehaviors.filter(c => c.lifetime_value > 1000).length;
  const atRiskCustomers = customerBehaviors.filter(c => c.churn_risk > 0.7).length;
  const avgLifetimeValue = customerBehaviors.length > 0 
    ? customerBehaviors.reduce((sum, c) => sum + c.lifetime_value, 0) / customerBehaviors.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights and business intelligence
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refreshAnalytics} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(businessMetrics.find(m => m.metric_name === 'Monthly Sales')?.metric_value || 0, 'currency')}
            </div>
            <p className="text-xs text-muted-foreground">
              {businessMetrics.find(m => m.metric_name === 'Monthly Sales')?.change_percentage > 0 ? '+' : ''}
              {formatNumber(businessMetrics.find(m => m.metric_name === 'Monthly Sales')?.change_percentage || 0, 'percentage')} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Segments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerSegments.length}</div>
            <p className="text-xs text-muted-foreground">
              {customerSegments.reduce((sum, s) => sum + s.customer_count, 0)} total customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalies.filter(a => !a.resolved).length}</div>
            <p className="text-xs text-muted-foreground">
              {anomalies.filter(a => a.severity === 'critical').length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(avgLifetimeValue, 'currency')}</div>
            <p className="text-xs text-muted-foreground">
              {highValueCustomers} high-value customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="segments">Customer Segments</TabsTrigger>
          <TabsTrigger value="predictions">Predictive Insights</TabsTrigger>
          <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="behavior">Customer Behavior</TabsTrigger>
        </TabsList>

        {/* Customer Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Customer Segments Overview</CardTitle>
                <CardDescription>
                  RFM-based customer segmentation analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={segmentsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="customers" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Segment Details</CardTitle>
                <CardDescription>
                  Revenue and performance by segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerSegments.map((segment) => (
                    <div key={segment.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{segment.segment_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {segment.customer_count} customers
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(segment.total_revenue, 'currency')}</p>
                        <p className="text-sm text-muted-foreground">
                          Avg: {formatNumber(segment.avg_order_value, 'currency')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Predictive Insights Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Sales Forecast</CardTitle>
                <CardDescription>
                  AI-powered sales predictions for the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={insightsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Predictive Insights</CardTitle>
                <CardDescription>
                  AI-generated business recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {predictiveInsights.map((insight) => (
                    <div key={insight.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{insight.insight_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(insight.confidence_level * 100, 'percentage')} confidence
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{insight.recommendation}</p>
                      <p className="text-xs text-muted-foreground">
                        Time horizon: {insight.time_horizon}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Anomaly Detection Tab */}
        <TabsContent value="anomalies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Anomaly Distribution</CardTitle>
                <CardDescription>
                  Detected anomalies by type and severity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={anomaliesChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {anomaliesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Active Anomalies</CardTitle>
                <CardDescription>
                  Recent anomaly detections requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {anomalies.filter(a => !a.resolved).slice(0, 5).map((anomaly) => (
                    <div key={anomaly.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={getSeverityColor(anomaly.severity)}>
                          {anomaly.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(anomaly.detected_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{anomaly.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {anomaly.anomaly_score.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Behavior Tab */}
        <TabsContent value="behavior" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Customer Behavior Analysis</CardTitle>
                <CardDescription>
                  Purchase patterns and customer lifecycle insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">High-Value Customers</span>
                      <span className="text-2xl font-bold text-green-600">{highValueCustomers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">At-Risk Customers</span>
                      <span className="text-2xl font-bold text-red-600">{atRiskCustomers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Purchase Frequency</span>
                      <span className="text-2xl font-bold">
                        {customerBehaviors.length > 0 
                          ? (customerBehaviors.reduce((sum, c) => sum + c.purchase_frequency, 0) / customerBehaviors.length).toFixed(1)
                          : '0'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Order Value</span>
                      <span className="text-2xl font-bold">
                        {customerBehaviors.length > 0 
                          ? formatNumber(customerBehaviors.reduce((sum, c) => sum + c.avg_order_value, 0) / customerBehaviors.length, 'currency')
                          : formatNumber(0, 'currency')
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Customers</span>
                      <span className="text-2xl font-bold">{customerBehaviors.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Churn Risk</span>
                      <span className="text-2xl font-bold">
                        {customerBehaviors.length > 0 
                          ? formatNumber(customerBehaviors.reduce((sum, c) => sum + c.churn_risk, 0) / customerBehaviors.length * 100, 'percentage')
                          : '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Behavior Insights</CardTitle>
                <CardDescription>
                  Key customer behavior patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Payment Preferences</h4>
                    <div className="space-y-2">
                      {Object.entries(
                        customerBehaviors.reduce((acc, c) => {
                          acc[c.preferred_payment_method] = (acc[c.preferred_payment_method] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([method, count]) => (
                        <div key={method} className="flex justify-between text-sm">
                          <span>{method}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Shopping Times</h4>
                    <div className="space-y-2">
                      {Object.entries(
                        customerBehaviors.reduce((acc, c) => {
                          acc[c.preferred_time] = (acc[c.preferred_time] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([time, count]) => (
                        <div key={time} className="flex justify-between text-sm">
                          <span>{time}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
