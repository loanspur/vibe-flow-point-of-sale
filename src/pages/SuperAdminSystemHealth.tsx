import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Server, 
  Database, 
  Activity, 
  Shield, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  Lock,
  Eye,
  Download,
  Settings
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";

// System health data
const systemServices = [
  { name: "API Gateway", status: "operational", uptime: "99.98%", responseTime: "125ms", lastCheck: "2 min ago" },
  { name: "Authentication Service", status: "operational", uptime: "99.95%", responseTime: "89ms", lastCheck: "1 min ago" },
  { name: "Database Primary", status: "operational", uptime: "99.99%", responseTime: "45ms", lastCheck: "30s ago" },
  { name: "Database Replica", status: "operational", uptime: "99.97%", responseTime: "52ms", lastCheck: "45s ago" },
  { name: "Storage Service", status: "operational", uptime: "99.96%", responseTime: "178ms", lastCheck: "1 min ago" },
  { name: "CDN", status: "operational", uptime: "99.94%", responseTime: "234ms", lastCheck: "2 min ago" },
  { name: "Email Service", status: "degraded", uptime: "98.45%", responseTime: "2.1s", lastCheck: "3 min ago" },
  { name: "Backup Service", status: "operational", uptime: "99.89%", responseTime: "345ms", lastCheck: "5 min ago" }
];

const performanceMetrics = [
  { time: "14:00", cpu: 45, memory: 68, disk: 32, network: 25 },
  { time: "14:15", cpu: 52, memory: 71, disk: 34, network: 28 },
  { time: "14:30", cpu: 48, memory: 69, disk: 35, network: 22 },
  { time: "14:45", cpu: 55, memory: 73, disk: 36, network: 31 },
  { time: "15:00", cpu: 49, memory: 70, disk: 33, network: 26 },
  { time: "15:15", cpu: 46, memory: 67, disk: 31, network: 24 }
];

const errorLogs = [
  { timestamp: "2024-12-23 15:42:33", level: "ERROR", service: "API Gateway", message: "Rate limit exceeded for IP 192.168.1.100", count: 3 },
  { timestamp: "2024-12-23 15:38:15", level: "WARN", service: "Database", message: "Slow query detected: SELECT * FROM large_table", count: 1 },
  { timestamp: "2024-12-23 15:35:42", level: "ERROR", service: "Email Service", message: "SMTP connection timeout", count: 12 },
  { timestamp: "2024-12-23 15:32:18", level: "WARN", service: "Storage", message: "Disk usage above 80% threshold", count: 1 },
  { timestamp: "2024-12-23 15:28:55", level: "ERROR", service: "Auth Service", message: "Failed login attempt from suspicious IP", count: 8 }
];

const securityMetrics = [
  { metric: "Failed Login Attempts", value: "127", trend: "up", color: "red" },
  { metric: "Blocked IPs", value: "23", trend: "stable", color: "orange" },
  { metric: "SSL Certificates", value: "Valid", trend: "stable", color: "green" },
  { metric: "DDoS Attacks Blocked", value: "5", trend: "down", color: "green" },
  { metric: "Malware Scans", value: "Clean", trend: "stable", color: "green" },
  { metric: "Data Breaches", value: "0", trend: "stable", color: "green" }
];

const databaseMetrics = [
  { metric: "Active Connections", value: "234/500", usage: 47 },
  { metric: "Query Performance", value: "45ms avg", usage: 18 },
  { metric: "Cache Hit Rate", value: "94.2%", usage: 94 },
  { metric: "Storage Used", value: "2.4TB/5TB", usage: 48 },
  { metric: "Backup Status", value: "Complete", usage: 100 },
  { metric: "Replication Lag", value: "12ms", usage: 5 }
];

export default function SuperAdminSystemHealth() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { toast } = useToast();

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastUpdated(new Date());
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Operational</Badge>;
      case "degraded":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>;
      case "down":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Down</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLogLevelBadge = (level: string) => {
    switch (level) {
      case "ERROR":
        return <Badge variant="destructive">ERROR</Badge>;
      case "WARN":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">WARN</Badge>;
      case "INFO":
        return <Badge variant="default">INFO</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const handleRefresh = () => {
    setLastUpdated(new Date());
    toast({
      title: "System Health Refreshed",
      description: "Latest metrics have been retrieved.",
    });
  };

  const handleExportReport = () => {
    toast({
      title: "Health Report Export",
      description: "System health report export has been initiated.",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Monitor platform infrastructure and performance</p>
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
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operational</div>
            <p className="text-xs text-muted-foreground">All systems running normally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.97%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-yellow-600">Email service degraded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">125ms</div>
            <p className="text-xs text-green-600">+12ms from baseline</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Services Status */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Status
              </CardTitle>
              <CardDescription>Real-time status of all platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Last Check</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemServices.map((service, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{getStatusBadge(service.status)}</TableCell>
                      <TableCell>{service.uptime}</TableCell>
                      <TableCell>{service.responseTime}</TableCell>
                      <TableCell className="text-muted-foreground">{service.lastCheck}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-3 w-3" />
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

        {/* Performance Metrics */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Performance
                </CardTitle>
                <CardDescription>CPU, Memory, Disk, and Network usage</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  cpu: { label: "CPU", color: "#ef4444" },
                  memory: { label: "Memory", color: "#f59e0b" },
                  disk: { label: "Disk", color: "#10b981" },
                  network: { label: "Network", color: "#3b82f6" }
                }}>
                  <LineChart data={performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="memory" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="disk" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="network" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      CPU Usage
                    </span>
                    <span className="font-medium">46%</span>
                  </div>
                  <Progress value={46} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <MemoryStick className="h-4 w-4" />
                      Memory Usage
                    </span>
                    <span className="font-medium">67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Disk Usage
                    </span>
                    <span className="font-medium">31%</span>
                  </div>
                  <Progress value={31} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Network I/O
                    </span>
                    <span className="font-medium">24%</span>
                  </div>
                  <Progress value={24} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Database Health */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {databaseMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{metric.metric}</span>
                      <span className="text-sm text-muted-foreground">{metric.value}</span>
                    </div>
                    <Progress value={metric.usage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Primary Database</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Read Replica</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Connection Pool</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Backup Service</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Running</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Last Backup</span>
                  <span className="text-sm text-muted-foreground">2 hours ago</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Data Integrity</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Metrics */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center gap-1">
                    {metric.trend === "up" ? (
                      <TrendingUp className={`h-3 w-3 ${metric.color === 'red' ? 'text-red-600' : 'text-green-600'}`} />
                    ) : metric.trend === "down" ? (
                      <TrendingDown className="h-3 w-3 text-green-600" />
                    ) : (
                      <div className="h-3 w-3" />
                    )}
                    <p className={`text-xs ${
                      metric.color === 'green' ? 'text-green-600' : 
                      metric.color === 'red' ? 'text-red-600' : 
                      'text-yellow-600'
                    }`}>
                      {metric.trend === "stable" ? "Stable" : 
                       metric.trend === "up" ? "Increasing" : "Decreasing"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Firewall Status</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>DDoS Protection</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>WAF Rules</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Updated</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Rate Limiting</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>SSL/TLS</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Valid</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Vulnerability Scan</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Clean</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Access Control</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Enforced</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Audit Logging</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Alerts */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Email Service Degraded</strong><br />
                    SMTP response times are elevated. Investigating...
                  </AlertDescription>
                </Alert>
                
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <strong>High CPU Usage</strong><br />
                    API server CPU usage above 80% for 5 minutes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monitoring Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Health Check Interval</span>
                  <span className="text-sm text-muted-foreground">30 seconds</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Alert Threshold</span>
                  <span className="text-sm text-muted-foreground">3 failures</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Notification Channels</span>
                  <span className="text-sm text-muted-foreground">Email, Slack</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Retention Period</span>
                  <span className="text-sm text-muted-foreground">90 days</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Error Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Error Logs</CardTitle>
              <CardDescription>Latest system errors and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorLogs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                      <TableCell>{getLogLevelBadge(log.level)}</TableCell>
                      <TableCell>{log.service}</TableCell>
                      <TableCell className="max-w-md truncate">{log.message}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}