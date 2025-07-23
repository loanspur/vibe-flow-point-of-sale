import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, 
  Activity, 
  HardDrive, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Settings,
  BarChart3,
  FileText,
  Search,
  Play,
  Trash2,
  Shield,
  Server,
  Zap,
  Eye,
  TrendingUp,
  Archive
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// Database metrics data
const databaseOverview = {
  status: "healthy",
  version: "PostgreSQL 15.4",
  uptime: "23 days, 14 hours",
  totalSize: "2.4 TB",
  connections: { active: 234, max: 500 },
  queries: { qps: 1247, avgTime: "45ms" },
  cache: { hitRate: 94.2, size: "1.2 GB" }
};

const connectionMetrics = [
  { time: "14:00", active: 180, idle: 45, waiting: 5 },
  { time: "14:15", active: 210, idle: 52, waiting: 8 },
  { time: "14:30", active: 234, idle: 38, waiting: 3 },
  { time: "14:45", active: 198, idle: 61, waiting: 12 },
  { time: "15:00", active: 225, idle: 48, waiting: 7 },
  { time: "15:15", active: 202, idle: 55, waiting: 4 }
];

const performanceMetrics = [
  { time: "14:00", queryTime: 42, bufferHit: 93.8, diskReads: 150 },
  { time: "14:15", queryTime: 45, bufferHit: 94.1, diskReads: 142 },
  { time: "14:30", queryTime: 48, bufferHit: 94.5, diskReads: 138 },
  { time: "14:45", queryTime: 44, bufferHit: 93.9, diskReads: 155 },
  { time: "15:00", queryTime: 46, bufferHit: 94.2, diskReads: 147 },
  { time: "15:15", queryTime: 43, bufferHit: 94.3, diskReads: 140 }
];

const tableStatistics = [
  { name: "sales", rows: "2,847,392", size: "524 MB", indices: 8, vacuumed: "2 hours ago" },
  { name: "products", rows: "45,829", size: "12 MB", indices: 5, vacuumed: "1 hour ago" },
  { name: "customers", rows: "128,473", size: "28 MB", indices: 6, vacuumed: "3 hours ago" },
  { name: "users", rows: "15,892", size: "4.2 MB", indices: 4, vacuumed: "30 min ago" },
  { name: "transactions", rows: "5,682,194", size: "1.2 GB", indices: 12, vacuumed: "4 hours ago" }
];

const slowQueries = [
  { query: "SELECT * FROM sales s JOIN customers c ON...", duration: "2.34s", calls: 142, timestamp: "15:42:33" },
  { query: "UPDATE products SET stock_quantity = ...", duration: "1.89s", calls: 89, timestamp: "15:38:15" },
  { query: "SELECT COUNT(*) FROM transactions WHERE...", duration: "1.56s", calls: 67, timestamp: "15:35:42" },
  { query: "DELETE FROM temp_data WHERE created_at < ...", duration: "1.23s", calls: 34, timestamp: "15:32:18" },
  { query: "INSERT INTO audit_log (user_id, action...", duration: "0.98s", calls: 256, timestamp: "15:28:55" }
];

const backupHistory = [
  { id: "backup_001", type: "Full", size: "2.4 TB", status: "completed", started: "2024-12-23 02:00:00", completed: "2024-12-23 03:45:00" },
  { id: "backup_002", type: "Incremental", size: "45 GB", status: "completed", started: "2024-12-22 02:00:00", completed: "2024-12-22 02:15:00" },
  { id: "backup_003", type: "Full", size: "2.3 TB", status: "completed", started: "2024-12-21 02:00:00", completed: "2024-12-21 03:42:00" },
  { id: "backup_004", type: "Incremental", size: "38 GB", status: "completed", started: "2024-12-20 02:00:00", completed: "2024-12-20 02:12:00" }
];

const databaseUsers = [
  { username: "supabase_admin", role: "superuser", connections: 12, lastActivity: "Active now" },
  { username: "authenticator", role: "authenticator", connections: 234, lastActivity: "Active now" },
  { username: "postgres", role: "superuser", connections: 0, lastActivity: "2 days ago" },
  { username: "supabase_auth_admin", role: "auth_admin", connections: 8, lastActivity: "5 min ago" },
  { username: "supabase_read_only", role: "readonly", connections: 15, lastActivity: "Active now" }
];

export default function SuperAdminDatabase() {
  const [selectedQuery, setSelectedQuery] = useState("");
  const [queryResult, setQueryResult] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { toast } = useToast();

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastUpdated(new Date());
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleExecuteQuery = () => {
    if (!selectedQuery.trim()) {
      toast({
        title: "No Query",
        description: "Please enter a query to execute.",
        variant: "destructive"
      });
      return;
    }

    // Simulate query execution
    setQueryResult("Query executed successfully. 5 rows returned.");
    toast({
      title: "Query Executed",
      description: "Query completed successfully.",
    });
  };

  const handleBackup = (type: string) => {
    toast({
      title: "Backup Started",
      description: `${type} backup has been initiated.`,
    });
  };

  const handleVacuum = (table: string) => {
    toast({
      title: "Vacuum Started",
      description: `Vacuum operation started for table: ${table}`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case "critical":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Database Administration</h1>
          <p className="text-muted-foreground">Monitor and manage database infrastructure</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLastUpdated(new Date())}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Status</CardTitle>
            <Database className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">{databaseOverview.version}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{databaseOverview.connections.active}</div>
            <p className="text-xs text-muted-foreground">
              of {databaseOverview.connections.max} max
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Query Performance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{databaseOverview.queries.avgTime}</div>
            <p className="text-xs text-muted-foreground">
              {databaseOverview.queries.qps} queries/sec
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{databaseOverview.totalSize}</div>
            <p className="text-xs text-green-600">Cache hit: {databaseOverview.cache.hitRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Connection Pool Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  active: { label: "Active", color: "#22c55e" },
                  idle: { label: "Idle", color: "#3b82f6" },
                  waiting: { label: "Waiting", color: "#ef4444" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={connectionMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="active" stroke="#22c55e" strokeWidth={2} />
                      <Line type="monotone" dataKey="idle" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="waiting" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Version</span>
                  <span className="font-medium">{databaseOverview.version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Uptime</span>
                  <span className="font-medium">{databaseOverview.uptime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Size</span>
                  <span className="font-medium">{databaseOverview.totalSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cache Size</span>
                  <span className="font-medium">{databaseOverview.cache.size}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Cache Hit Rate</span>
                    <span className="font-medium">{databaseOverview.cache.hitRate}%</span>
                  </div>
                  <Progress value={databaseOverview.cache.hitRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Query Performance Metrics
              </CardTitle>
              <CardDescription>Average query time, buffer hit ratio, and disk reads</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                queryTime: { label: "Query Time (ms)", color: "#ef4444" },
                bufferHit: { label: "Buffer Hit %", color: "#22c55e" },
                diskReads: { label: "Disk Reads", color: "#3b82f6" }
              }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line yAxisId="left" type="monotone" dataKey="queryTime" stroke="#ef4444" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="bufferHit" stroke="#22c55e" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="diskReads" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slow Queries</CardTitle>
              <CardDescription>Queries taking longer than 500ms</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowQueries.map((query, index) => (
                    <TableRow key={index}>
                      <TableCell className="max-w-md">
                        <div className="truncate font-mono text-sm">{query.query}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{query.duration}</Badge>
                      </TableCell>
                      <TableCell>{query.calls}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{query.timestamp}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Table Statistics
              </CardTitle>
              <CardDescription>Table sizes, row counts, and maintenance status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Name</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Indices</TableHead>
                    <TableHead>Last Vacuum</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableStatistics.map((table, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{table.name}</TableCell>
                      <TableCell>{table.rows}</TableCell>
                      <TableCell>{table.size}</TableCell>
                      <TableCell>{table.indices}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{table.vacuumed}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleVacuum(table.name)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queries Tab */}
        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Query Console
              </CardTitle>
              <CardDescription>Execute SQL queries and view results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SQL Query</label>
                <Textarea
                  placeholder="SELECT * FROM users LIMIT 10;"
                  value={selectedQuery}
                  onChange={(e) => setSelectedQuery(e.target.value)}
                  className="font-mono text-sm min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExecuteQuery}>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Query
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
              {queryResult && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Results</label>
                  <div className="p-3 bg-muted rounded-md font-mono text-sm">
                    {queryResult}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Only execute queries you understand. Destructive operations can permanently damage data.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button onClick={() => handleBackup("Full")}>
              <Archive className="h-4 w-4 mr-2" />
              Full Backup
            </Button>
            <Button variant="outline" onClick={() => handleBackup("Incremental")}>
              <Archive className="h-4 w-4 mr-2" />
              Incremental Backup
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Restore
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>Recent database backups and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Backup ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupHistory.map((backup, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{backup.id}</TableCell>
                      <TableCell>{backup.type}</TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{backup.started}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{backup.completed}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Database Users
              </CardTitle>
              <CardDescription>Manage database users and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Active Connections</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databaseUsers.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.connections}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.lastActivity}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Shield className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Maintenance</CardTitle>
                <CardDescription>Routine maintenance operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  VACUUM All Tables
                </Button>
                <Button className="w-full" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  ANALYZE Statistics
                </Button>
                <Button className="w-full" variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  REINDEX Database
                </Button>
                <Button className="w-full" variant="outline">
                  <Archive className="h-4 w-4 mr-2" />
                  Clean Up Logs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>PostgreSQL Version</span>
                  <span className="font-medium">15.4</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Shared Buffers</span>
                  <span className="font-medium">1 GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Work Memory</span>
                  <span className="font-medium">256 MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>WAL Buffers</span>
                  <span className="font-medium">64 MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Max Connections</span>
                  <span className="font-medium">500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Checkpoint Segments</span>
                  <span className="font-medium">64</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}