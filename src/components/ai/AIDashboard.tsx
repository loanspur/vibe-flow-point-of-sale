import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  Package,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Zap,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area } from 'recharts';

interface AIInsight {
  id: string;
  insight_type: 'trend' | 'anomaly' | 'recommendation' | 'forecast' | 'pattern';
  insight_title: string;
  insight_description: string;
  insight_data: any;
  confidence_level: 'low' | 'medium' | 'high';
  is_actionable: boolean;
  action_taken: boolean;
  created_at: string;
}

interface AIRecommendation {
  id: string;
  recommendation_type: 'product' | 'pricing' | 'inventory' | 'marketing' | 'customer';
  target_entity_type: string;
  target_entity_id: string;
  recommendation_title: string;
  recommendation_description: string;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  is_implemented: boolean;
  created_at: string;
}

interface AIForecast {
  forecast_date: string;
  forecast_value: number;
  confidence_lower: number;
  confidence_upper: number;
  model_confidence: number;
}

interface CustomerSegment {
  segment_name: string;
  segment_description: string;
  customer_count: number;
  avg_order_value: number;
  total_revenue: number;
  segment_score: number;
}

interface AIAnomaly {
  anomaly_type: string;
  entity_type: string;
  entity_id: string;
  anomaly_score: number;
  anomaly_description: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AIDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forecastPeriod, setForecastPeriod] = useState('monthly');
  const [forecastPeriods, setForecastPeriods] = useState(12);
  
  // AI data state
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [salesForecast, setSalesForecast] = useState<AIForecast[]>([]);
  const [demandForecast, setDemandForecast] = useState<any[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [anomalies, setAnomalies] = useState<AIAnomaly[]>([]);

  // Load AI data
  const loadAIData = async () => {
    setIsLoading(true);
    try {
      // Load AI insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (insightsError) throw insightsError;
      setInsights(insightsData || []);

      // Load AI recommendations
      const { data: recommendationsData, error: recommendationsError } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recommendationsError) throw recommendationsError;
      setRecommendations(recommendationsData || []);

      // Load sales forecast
      const { data: salesForecastData, error: salesForecastError } = await supabase.rpc('generate_sales_forecast', {
        p_tenant_id: user?.tenant_id,
        p_forecast_period: forecastPeriod,
        p_periods_ahead: forecastPeriods
      });

      if (salesForecastError) throw salesForecastError;
      setSalesForecast(salesForecastData || []);

      // Load demand forecast
      const { data: demandForecastData, error: demandForecastError } = await supabase.rpc('generate_demand_forecast', {
        p_tenant_id: user?.tenant_id,
        p_forecast_period: forecastPeriod,
        p_periods_ahead: forecastPeriods
      });

      if (demandForecastError) throw demandForecastError;
      setDemandForecast(demandForecastData || []);

      // Load customer segments
      const { data: segmentsData, error: segmentsError } = await supabase.rpc('generate_customer_segments', {
        p_tenant_id: user?.tenant_id
      });

      if (segmentsError) throw segmentsError;
      setCustomerSegments(segmentsData || []);

      // Load anomalies
      const { data: anomaliesData, error: anomaliesError } = await supabase.rpc('detect_anomalies', {
        p_tenant_id: user?.tenant_id,
        p_anomaly_type: 'sales'
      });

      if (anomaliesError) throw anomaliesError;
      setAnomalies(anomaliesData || []);

    } catch (error) {
      console.error('Error loading AI data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI insights',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh AI data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAIData();
      toast({
        title: 'Success',
        description: 'AI insights refreshed successfully',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data on component mount and when forecast parameters change
  useEffect(() => {
    if (user?.tenant_id) {
      loadAIData();
    }
  }, [user?.tenant_id, forecastPeriod, forecastPeriods]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  // Get insight icon
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return TrendingUp;
      case 'anomaly':
        return AlertTriangle;
      case 'recommendation':
        return Lightbulb;
      case 'forecast':
        return Target;
      case 'pattern':
        return Activity;
      default:
        return Brain;
    }
  };

  // Get recommendation icon
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'product':
        return Package;
      case 'pricing':
        return DollarSign;
      case 'inventory':
        return Package;
      case 'marketing':
        return Target;
      case 'customer':
        return Users;
      default:
        return Lightbulb;
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      critical: 'destructive',
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'default'}>
        {severity}
      </Badge>
    );
  };

  // Get confidence badge
  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'default',
    } as const;

    return (
      <Badge variant={variants[confidence as keyof typeof variants] || 'default'}>
        {confidence} confidence
      </Badge>
    );
  };

  // Prepare chart data for sales forecast
  const salesForecastChartData = useMemo(() => {
    return salesForecast.map(forecast => ({
      date: new Date(forecast.forecast_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      forecast: forecast.forecast_value,
      lower: forecast.confidence_lower,
      upper: forecast.confidence_upper,
    }));
  }, [salesForecast]);

  // Prepare chart data for customer segments
  const customerSegmentsChartData = useMemo(() => {
    return customerSegments.map(segment => ({
      name: segment.segment_name,
      value: segment.customer_count,
      revenue: segment.total_revenue,
    }));
  }, [customerSegments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI-Powered Insights</h2>
          <p className="text-muted-foreground">
            Intelligent analytics, predictions, and recommendations powered by AI
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh AI
        </Button>
      </div>

      {/* AI Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">
              {insights.filter(i => !i.action_taken).length} actionable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              {recommendations.filter(r => !r.is_implemented).length} pending
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
              {formatNumber(customerSegments.reduce((sum, s) => sum + s.customer_count, 0))} customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalies.length}</div>
            <p className="text-xs text-muted-foreground">
              {anomalies.filter(a => a.severity_level === 'critical').length} critical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="forecasts" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Forecasts
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Segments
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomalies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>
                Intelligent analysis of your business data and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No insights available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI insights will be generated automatically based on your data.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight) => {
                    const Icon = getInsightIcon(insight.insight_type);
                    return (
                      <div key={insight.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{insight.insight_title}</h4>
                            {getConfidenceBadge(insight.confidence_level)}
                            {insight.is_actionable && (
                              <Badge variant="outline">Actionable</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {insight.insight_description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{new Date(insight.created_at).toLocaleDateString()}</span>
                            {insight.action_taken && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Action taken
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>
                Intelligent suggestions to optimize your business operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No recommendations available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI recommendations will be generated based on your business data.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((recommendation) => {
                    const Icon = getRecommendationIcon(recommendation.recommendation_type);
                    return (
                      <div key={recommendation.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{recommendation.recommendation_title}</h4>
                            {getSeverityBadge(recommendation.priority_level)}
                            {recommendation.is_implemented && (
                              <Badge variant="outline">Implemented</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {recommendation.recommendation_description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{new Date(recommendation.created_at).toLocaleDateString()}</span>
                            <span className="capitalize">{recommendation.recommendation_type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Sales Forecast</CardTitle>
                  <CardDescription>
                    Predictive analytics for future sales performance
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={forecastPeriods.toString()} onValueChange={(value) => setForecastPeriods(parseInt(value))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 periods</SelectItem>
                      <SelectItem value="12">12 periods</SelectItem>
                      <SelectItem value="24">24 periods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {salesForecast.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No forecast data available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sales forecasts will be generated based on historical data.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={salesForecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Forecast']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="forecast" 
                      stroke="#0088FE" 
                      fill="#0088FE" 
                      fillOpacity={0.3}
                      name="Forecast"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="upper" 
                      stroke="#00C49F" 
                      fill="#00C49F" 
                      fillOpacity={0.1}
                      name="Confidence Upper"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lower" 
                      stroke="#FFBB28" 
                      fill="#FFBB28" 
                      fillOpacity={0.1}
                      name="Confidence Lower"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Segmentation</CardTitle>
              <CardDescription>
                AI-powered customer segments based on behavior and value
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerSegments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No segments available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Customer segments will be generated based on purchase behavior.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={customerSegmentsChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {customerSegmentsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatNumber(value), 'Customers']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {customerSegments.map((segment, index) => (
                      <div key={segment.segment_name} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{segment.segment_name}</h4>
                          <Badge variant="outline">{(segment.segment_score * 100).toFixed(0)}%</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {segment.segment_description}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customers:</span>
                            <span className="ml-1 font-medium">{formatNumber(segment.customer_count)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Order:</span>
                            <span className="ml-1 font-medium">{formatCurrency(segment.avg_order_value)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Total Revenue:</span>
                            <span className="ml-1 font-medium">{formatCurrency(segment.total_revenue)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Detection</CardTitle>
              <CardDescription>
                AI-detected unusual patterns and potential issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              {anomalies.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-2 text-sm font-semibold">No anomalies detected</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All systems are operating within normal parameters.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalies.map((anomaly, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{anomaly.anomaly_type} Anomaly</h4>
                          {getSeverityBadge(anomaly.severity_level)}
                          <Badge variant="outline">{(anomaly.anomaly_score * 100).toFixed(0)}% confidence</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {anomaly.anomaly_description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
