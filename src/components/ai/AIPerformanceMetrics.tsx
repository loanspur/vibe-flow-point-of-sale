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
  TrendingUp, 
  TrendingDown, 
  Activity,
  Brain,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Zap,
  Gauge,
  Cpu,
  Database,
  Network,
  HardDrive,
  MemoryStick,
  Users
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area } from 'recharts';

interface PerformanceMetric {
  id: string;
  metric_name: string;
  metric_type: 'accuracy' | 'latency' | 'throughput' | 'error_rate' | 'resource_usage' | 'custom';
  metric_value: number;
  metric_unit: string;
  target_value: number;
  threshold_warning: number;
  threshold_critical: number;
  model_id: string | null;
  tenant_id: string;
  created_at: string;
}

interface AIModel {
  id: string;
  model_name: string;
  model_type: 'forecast' | 'classification' | 'regression' | 'clustering' | 'custom';
  model_version: string;
  accuracy_score: number;
  latency_ms: number;
  throughput_rps: number;
  error_rate: number;
  is_active: boolean;
  last_trained: string;
  training_samples: number;
  created_at: string;
}

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_throughput: number;
  active_connections: number;
  response_time_ms: number;
  error_rate: number;
  uptime_hours: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AIPerformanceMetrics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  
  // Data state
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    network_throughput: 0,
    active_connections: 0,
    response_time_ms: 0,
    error_rate: 0,
    uptime_hours: 0
  });

  // Load performance data
  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      // Load AI models
      const { data: modelsData, error: modelsError } = await supabase
        .from('ai_models')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });

      if (modelsError) throw modelsError;
      setModels(modelsData || []);

      // Load performance metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('ai_performance_metrics')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Simulate system metrics (in real implementation, this would come from monitoring system)
      setSystemMetrics({
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        network_throughput: Math.random() * 1000,
        active_connections: Math.floor(Math.random() * 100),
        response_time_ms: Math.random() * 500,
        error_rate: Math.random() * 5,
        uptime_hours: Math.random() * 720 // 30 days max
      });

    } catch (error) {
      console.error('Error loading performance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance metrics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadPerformanceData();
      toast({
        title: 'Success',
        description: 'Performance metrics refreshed successfully',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    if (user?.tenant_id) {
      loadPerformanceData();
    }
  }, [user?.tenant_id, timeRange, selectedModel]);

  // Filter metrics based on selected model
  const filteredMetrics = useMemo(() => {
    if (selectedModel === 'all') return metrics;
    return metrics.filter(metric => metric.model_id === selectedModel);
  }, [metrics, selectedModel]);

  // Prepare chart data for accuracy trends
  const accuracyChartData = useMemo(() => {
    const modelMetrics = models.map(model => ({
      name: model.model_name,
      accuracy: model.accuracy_score * 100,
      latency: model.latency_ms,
      throughput: model.throughput_rps,
      errorRate: model.error_rate * 100
    }));
    return modelMetrics;
  }, [models]);

  // Prepare chart data for system performance
  const systemChartData = useMemo(() => {
    return [
      { name: 'CPU', value: systemMetrics.cpu_usage, color: '#0088FE' },
      { name: 'Memory', value: systemMetrics.memory_usage, color: '#00C49F' },
      { name: 'Disk', value: systemMetrics.disk_usage, color: '#FFBB28' },
      { name: 'Network', value: systemMetrics.network_throughput / 10, color: '#FF8042' }
    ];
  }, [systemMetrics]);

  // Get metric status
  const getMetricStatus = (metric: PerformanceMetric) => {
    if (metric.metric_value >= metric.threshold_critical) {
      return { status: 'critical', color: 'destructive' as const };
    } else if (metric.metric_value >= metric.threshold_warning) {
      return { status: 'warning', color: 'default' as const };
    } else {
      return { status: 'healthy', color: 'secondary' as const };
    }
  };

  // Get system status
  const getSystemStatus = (value: number, threshold: number = 80) => {
    if (value >= threshold) {
      return { status: 'critical', color: 'destructive' as const };
    } else if (value >= threshold * 0.7) {
      return { status: 'warning', color: 'default' as const };
    } else {
      return { status: 'healthy', color: 'secondary' as const };
    }
  };

  // Format number
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${formatNumber(value * 100)}%`;
  };

  // Format time
  const formatTime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours.toFixed(0)}h`;
  };

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
          <h2 className="text-2xl font-bold tracking-tight">AI Performance Metrics</h2>
          <p className="text-muted-foreground">
            Monitor AI model performance and system health metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(systemMetrics.cpu_usage)}%</div>
            <div className="flex items-center gap-2">
              <Badge variant={getSystemStatus(systemMetrics.cpu_usage).color}>
                {getSystemStatus(systemMetrics.cpu_usage).status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(systemMetrics.memory_usage)}%</div>
            <div className="flex items-center gap-2">
              <Badge variant={getSystemStatus(systemMetrics.memory_usage).color}>
                {getSystemStatus(systemMetrics.memory_usage).status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(systemMetrics.response_time_ms)}ms</div>
            <div className="flex items-center gap-2">
              <Badge variant={getSystemStatus(systemMetrics.response_time_ms, 300).color}>
                {getSystemStatus(systemMetrics.response_time_ms, 300).status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(systemMetrics.error_rate)}%</div>
            <div className="flex items-center gap-2">
              <Badge variant={getSystemStatus(systemMetrics.error_rate, 2).color}>
                {getSystemStatus(systemMetrics.error_rate, 2).status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Performance Tabs */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Models
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance Metrics
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Model Performance</CardTitle>
                  <CardDescription>
                    Accuracy, latency, and throughput metrics for AI models
                  </CardDescription>
                </div>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {models.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.model_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No AI models available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI models will appear here once they are configured.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Model Performance Chart */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accuracyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="accuracy" fill="#0088FE" name="Accuracy (%)" />
                        <Bar dataKey="throughput" fill="#00C49F" name="Throughput (RPS)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Model Details */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {models.map((model) => (
                      <Card key={model.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{model.model_name}</CardTitle>
                            <Badge variant={model.is_active ? 'default' : 'secondary'}>
                              {model.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <CardDescription>v{model.model_version}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Accuracy:</span>
                              <span className="ml-1 font-medium">{formatPercentage(model.accuracy_score)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Latency:</span>
                              <span className="ml-1 font-medium">{formatNumber(model.latency_ms)}ms</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Throughput:</span>
                              <span className="ml-1 font-medium">{formatNumber(model.throughput_rps)} RPS</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Error Rate:</span>
                              <span className="ml-1 font-medium">{formatPercentage(model.error_rate)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last trained: {new Date(model.last_trained).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics History</CardTitle>
              <CardDescription>
                Detailed performance metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMetrics.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No metrics available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Performance metrics will be collected automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMetrics.map((metric) => {
                    const status = getMetricStatus(metric);
                    return (
                      <div key={metric.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-medium">{metric.metric_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {metric.metric_value} {metric.metric_unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.color}>
                            {status.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(metric.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Overview</CardTitle>
              <CardDescription>
                Real-time system resource utilization and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* System Resources Chart */}
                <div>
                  <h4 className="font-medium mb-4">Resource Utilization</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={systemChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatNumber(value)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {systemChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${formatNumber(value)}%`, 'Usage']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* System Details */}
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Disk Usage</p>
                          <p className="text-sm text-muted-foreground">Storage utilization</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(systemMetrics.disk_usage)}%</p>
                        <Badge variant={getSystemStatus(systemMetrics.disk_usage).color}>
                          {getSystemStatus(systemMetrics.disk_usage).status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Network className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Network Throughput</p>
                          <p className="text-sm text-muted-foreground">Data transfer rate</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(systemMetrics.network_throughput)} MB/s</p>
                        <Badge variant="secondary">Normal</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Active Connections</p>
                          <p className="text-sm text-muted-foreground">Current users</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{systemMetrics.active_connections}</p>
                        <Badge variant="secondary">Connected</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">System Uptime</p>
                          <p className="text-sm text-muted-foreground">Time since last restart</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatTime(systemMetrics.uptime_hours)}</p>
                        <Badge variant="secondary">Stable</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
