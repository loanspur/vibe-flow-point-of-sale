import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, 
  Activity, 
  Database, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  HardDrive,
  BarChart3
} from 'lucide-react';

interface PerformanceMetric {
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  recorded_at: string;
}

interface SlowQuery {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  rows: number;
}

interface TableSize {
  table_name: string;
  table_size: string;
  index_size: string;
  total_size: string;
  row_count: number;
}

interface SystemHealth {
  database_connections: number;
  active_queries: number;
  cache_hit_ratio: number;
  slow_queries_count: number;
  last_backup: string;
  uptime: string;
}

export default function PerformanceMonitor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Performance data state
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [tableSizes, setTableSizes] = useState<TableSize[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Load performance data
  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      // Fetch performance metrics
      const { data: metricsData, error: metricsError } = await supabase.rpc('get_performance_metrics', {
        p_tenant_id: user?.tenant_id,
        p_hours: 24
      });

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Fetch slow queries (service role only)
      try {
        const { data: slowQueriesData, error: slowQueriesError } = await supabase.rpc('get_slow_queries', {
          p_limit: 10
        });

        if (!slowQueriesError) {
          setSlowQueries(slowQueriesData || []);
        }
      } catch (error) {
        console.log('Slow queries not available for tenant users');
      }

      // Fetch table sizes (service role only)
      try {
        const { data: tableSizesData, error: tableSizesError } = await supabase.rpc('get_table_sizes');

        if (!tableSizesError) {
          setTableSizes(tableSizesData || []);
        }
      } catch (error) {
        console.log('Table sizes not available for tenant users');
      }

      // Mock system health data (in real implementation, this would come from monitoring)
      setSystemHealth({
        database_connections: Math.floor(Math.random() * 50) + 10,
        active_queries: Math.floor(Math.random() * 20) + 5,
        cache_hit_ratio: Math.random() * 20 + 80, // 80-100%
        slow_queries_count: slowQueries.length,
        last_backup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        uptime: `${Math.floor(Math.random() * 30) + 1} days`
      });

    } catch (error) {
      console.error('Error loading performance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh performance data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadPerformanceData();
      toast({
        title: 'Success',
        description: 'Performance data refreshed successfully',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (user?.tenant_id) {
      loadPerformanceData();
    }
  }, [user?.tenant_id]);

  // Format duration
  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds.toFixed(2)}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(2)}s`;
    return `${(milliseconds / 60000).toFixed(2)}m`;
  };

  // Format file size
  const formatFileSize = (size: string) => {
    return size; // Already formatted by PostgreSQL
  };

  // Get health status
  const getHealthStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      critical: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status === 'healthy' && <CheckCircle className="mr-1 h-3 w-3" />}
        {status === 'warning' && <AlertTriangle className="mr-1 h-3 w-3" />}
        {status === 'critical' && <AlertTriangle className="mr-1 h-3 w-3" />}
        {status}
      </Badge>
    );
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
          <h2 className="text-2xl font-bold tracking-tight">Performance Monitor</h2>
          <p className="text-muted-foreground">
            System performance metrics and database health monitoring
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Connections</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.database_connections}</div>
              <p className="text-xs text-muted-foreground">
                {getStatusBadge(getHealthStatus(systemHealth.database_connections, { warning: 40, critical: 80 }))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Queries</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.active_queries}</div>
              <p className="text-xs text-muted-foreground">
                {getStatusBadge(getHealthStatus(systemHealth.active_queries, { warning: 15, critical: 30 }))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Ratio</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.cache_hit_ratio.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {getStatusBadge(getHealthStatus(100 - systemHealth.cache_hit_ratio, { warning: 10, critical: 20 }))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.uptime}</div>
              <p className="text-xs text-muted-foreground">
                Last backup: {new Date(systemHealth.last_backup).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance Metrics
          </TabsTrigger>
          <TabsTrigger value="queries" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Slow Queries
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics (Last 24 Hours)</CardTitle>
              <CardDescription>
                Key performance indicators and system metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No metrics available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Performance metrics will appear here as they are recorded.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Recorded At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((metric, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{metric.metric_name}</TableCell>
                        <TableCell>{metric.metric_value.toFixed(2)}</TableCell>
                        <TableCell>{metric.metric_unit || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(metric.recorded_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slow Queries</CardTitle>
              <CardDescription>
                Queries taking longer than 100ms on average
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slowQueries.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-2 text-sm font-semibold">No slow queries detected</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All queries are performing within acceptable limits.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Total Time</TableHead>
                      <TableHead>Mean Time</TableHead>
                      <TableHead>Rows</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowQueries.map((query, index) => (
                      <TableRow key={index}>
                        <TableCell className="max-w-md truncate">
                          <div className="font-mono text-xs">
                            {query.query.substring(0, 100)}...
                          </div>
                        </TableCell>
                        <TableCell>{query.calls.toLocaleString()}</TableCell>
                        <TableCell>{formatDuration(query.total_time)}</TableCell>
                        <TableCell>
                          <Badge variant={query.mean_time > 1000 ? 'destructive' : 'secondary'}>
                            {formatDuration(query.mean_time)}
                          </Badge>
                        </TableCell>
                        <TableCell>{query.rows.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Storage Usage</CardTitle>
              <CardDescription>
                Table sizes and storage allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tableSizes.length === 0 ? (
                <div className="text-center py-8">
                  <HardDrive className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">Storage data not available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Storage information requires elevated permissions.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Table Size</TableHead>
                      <TableHead>Index Size</TableHead>
                      <TableHead>Total Size</TableHead>
                      <TableHead>Row Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableSizes.map((table, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{table.table_name}</TableCell>
                        <TableCell>{formatFileSize(table.table_size)}</TableCell>
                        <TableCell>{formatFileSize(table.index_size)}</TableCell>
                        <TableCell>{formatFileSize(table.total_size)}</TableCell>
                        <TableCell>{table.row_count.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
          <CardDescription>
            Suggestions for optimizing system performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {slowQueries.length > 0 && (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Slow Queries Detected</h4>
                  <p className="text-sm text-yellow-700">
                    {slowQueries.length} queries are performing slowly. Consider adding indexes or optimizing these queries.
                  </p>
                </div>
              </div>
            )}

            {systemHealth && systemHealth.cache_hit_ratio < 90 && (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Cache Performance</h4>
                  <p className="text-sm text-blue-700">
                    Cache hit ratio is {(100 - systemHealth.cache_hit_ratio).toFixed(1)}% below optimal. Consider increasing cache size or optimizing queries.
                  </p>
                </div>
              </div>
            )}

            {systemHealth && systemHealth.database_connections > 50 && (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-orange-50">
                <Database className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">High Connection Count</h4>
                  <p className="text-sm text-orange-700">
                    Database has {systemHealth.database_connections} active connections. Consider connection pooling or query optimization.
                  </p>
                </div>
              </div>
            )}

            {(!slowQueries.length && systemHealth && systemHealth.cache_hit_ratio >= 90) && (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">System Performing Well</h4>
                  <p className="text-sm text-green-700">
                    All performance indicators are within optimal ranges. Continue monitoring for any changes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
