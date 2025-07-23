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
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  FileText, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Settings,
  Search,
  Filter,
  Bell,
  Key,
  Database,
  Globe,
  Server,
  UserCheck,
  Activity,
  Zap,
  Archive,
  TrendingUp,
  TrendingDown,
  BarChart3
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";

// Security overview metrics
const securityOverview = {
  overallScore: 87,
  activeThreats: 3,
  resolvedIncidents: 24,
  complianceScore: 94,
  lastAudit: "2024-12-20",
  certifications: ["SOC 2", "ISO 27001", "GDPR", "HIPAA"]
};

// Security incidents data
const securityIncidents = [
  { 
    id: "INC-001", 
    type: "Suspicious Login", 
    severity: "medium", 
    status: "investigating", 
    timestamp: "2024-12-23 15:42:33",
    user: "admin@example.com",
    ip: "192.168.1.100",
    description: "Multiple failed login attempts from unusual location"
  },
  { 
    id: "INC-002", 
    type: "Data Access Anomaly", 
    severity: "high", 
    status: "resolved", 
    timestamp: "2024-12-23 14:28:15",
    user: "user@example.com",
    ip: "10.0.0.45",
    description: "Unusual data access pattern detected"
  },
  { 
    id: "INC-003", 
    type: "Privilege Escalation", 
    severity: "critical", 
    status: "blocked", 
    timestamp: "2024-12-23 13:15:22",
    user: "test@example.com",
    ip: "203.45.67.89",
    description: "Attempted unauthorized privilege escalation"
  }
];

// Compliance metrics
const complianceData = [
  { framework: "GDPR", score: 96, lastAudit: "2024-12-15", status: "compliant", violations: 0 },
  { framework: "SOC 2", score: 94, lastAudit: "2024-12-10", status: "compliant", violations: 0 },
  { framework: "ISO 27001", score: 89, lastAudit: "2024-12-05", status: "compliant", violations: 2 },
  { framework: "HIPAA", score: 92, lastAudit: "2024-12-01", status: "compliant", violations: 1 }
];

// Access control data
const accessControlMetrics = [
  { metric: "Multi-Factor Auth", enabled: 1247, total: 1311, percentage: 95 },
  { metric: "Strong Passwords", compliant: 1189, total: 1311, percentage: 91 },
  { metric: "Active Sessions", current: 234, limit: 500, percentage: 47 },
  { metric: "Admin Accounts", active: 12, total: 15, percentage: 80 }
];

// Vulnerability assessment data
const vulnerabilityData = [
  { severity: "Critical", count: 2, color: "#ef4444" },
  { severity: "High", count: 8, color: "#f97316" },
  { severity: "Medium", count: 23, color: "#eab308" },
  { severity: "Low", count: 45, color: "#22c55e" }
];

// Security trends
const securityTrends = [
  { date: "Dec 17", incidents: 5, blocked: 12, resolved: 8 },
  { date: "Dec 18", incidents: 3, blocked: 15, resolved: 6 },
  { date: "Dec 19", incidents: 7, blocked: 18, resolved: 9 },
  { date: "Dec 20", incidents: 4, blocked: 22, resolved: 7 },
  { date: "Dec 21", incidents: 6, blocked: 19, resolved: 11 },
  { date: "Dec 22", incidents: 2, blocked: 25, resolved: 8 },
  { date: "Dec 23", incidents: 3, blocked: 20, resolved: 5 }
];

// Audit logs
const auditLogs = [
  { timestamp: "2024-12-23 15:45:12", user: "admin@vibepos.com", action: "USER_ROLE_CHANGED", resource: "user_123", details: "Changed role from user to admin", ip: "192.168.1.10" },
  { timestamp: "2024-12-23 15:42:33", user: "manager@vibepos.com", action: "DATA_EXPORT", resource: "sales_report", details: "Exported sales data for Q4 2024", ip: "10.0.0.25" },
  { timestamp: "2024-12-23 15:38:15", user: "admin@vibepos.com", action: "PERMISSION_GRANTED", resource: "database_access", details: "Granted database read access to analyst", ip: "192.168.1.10" },
  { timestamp: "2024-12-23 15:35:42", user: "security@vibepos.com", action: "SECURITY_POLICY_UPDATED", resource: "password_policy", details: "Updated minimum password length to 12 characters", ip: "172.16.0.5" },
  { timestamp: "2024-12-23 15:32:18", user: "admin@vibepos.com", action: "USER_ACCOUNT_LOCKED", resource: "user_456", details: "Account locked due to multiple failed login attempts", ip: "192.168.1.10" }
];

export default function SuperAdminSecurity() {
  const [selectedIncident, setSelectedIncident] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="destructive" className="bg-orange-500">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
      case "compliant":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "investigating":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Eye className="h-3 w-3 mr-1" />Investigating</Badge>;
      case "blocked":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleIncidentAction = (incidentId: string, action: string) => {
    toast({
      title: "Action Executed",
      description: `${action} applied to incident ${incidentId}`,
    });
  };

  const handleComplianceAudit = (framework: string) => {
    toast({
      title: "Audit Initiated",
      description: `Compliance audit started for ${framework}`,
    });
  };

  const filteredIncidents = securityIncidents.filter(incident => {
    const matchesSearch = incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Security & Compliance</h1>
          <p className="text-muted-foreground">Monitor security posture and regulatory compliance</p>
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

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{securityOverview.overallScore}%</div>
            <Progress value={securityOverview.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{securityOverview.activeThreats}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityOverview.complianceScore}%</div>
            <p className="text-xs text-green-600">All frameworks compliant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Audit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityOverview.lastAudit}</div>
            <p className="text-xs text-muted-foreground">SOC 2 Type II</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* Security Incidents */}
        <TabsContent value="incidents" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Security Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  incidents: { label: "Incidents", color: "#ef4444" },
                  blocked: { label: "Blocked", color: "#22c55e" },
                  resolved: { label: "Resolved", color: "#3b82f6" }
                }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={securityTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="blocked" stroke="#22c55e" strokeWidth={2} />
                      <Line type="monotone" dataKey="resolved" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>High Priority:</strong> Multiple failed login attempts detected from IP 192.168.1.100
                  </AlertDescription>
                </Alert>
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Bell className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <strong>Medium Priority:</strong> Unusual data access pattern detected for user@example.com
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>Active and recent security incidents requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.map((incident, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{incident.id}</TableCell>
                      <TableCell>{incident.type}</TableCell>
                      <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                      <TableCell className="font-medium">{incident.user}</TableCell>
                      <TableCell className="font-mono text-sm">{incident.ip}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{incident.timestamp}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleIncidentAction(incident.id, "Investigate")}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleIncidentAction(incident.id, "Block")}>
                            <Lock className="h-3 w-3" />
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

        {/* Compliance Management */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Compliance Frameworks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceData.map((framework, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{framework.framework}</div>
                        <div className="text-sm text-muted-foreground">Last audit: {framework.lastAudit}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{framework.score}%</div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(framework.status)}
                          <Button variant="ghost" size="sm" onClick={() => handleComplianceAudit(framework.framework)}>
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {securityOverview.certifications.map((cert, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{cert}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Certificates
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Access Control */}
        <TabsContent value="access" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Access Control Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accessControlMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{metric.metric}</span>
                      <span className="text-sm text-muted-foreground">
                        {metric.enabled || metric.compliant || metric.current || metric.active}/
                        {metric.total || metric.limit} ({metric.percentage}%)
                      </span>
                    </div>
                    <Progress value={metric.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permission Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Role-Based Access Control</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Single Sign-On (SSO)</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>API Key Management</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Secured</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Session Management</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Manage Permissions
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vulnerabilities */}
        <TabsContent value="vulnerabilities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Vulnerability Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{
                  critical: { label: "Critical", color: "#ef4444" },
                  high: { label: "High", color: "#f97316" },
                  medium: { label: "Medium", color: "#eab308" },
                  low: { label: "Low", color: "#22c55e" }
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={vulnerabilityData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="count"
                        label={({ severity, count }) => `${severity}: ${count}`}
                      >
                        {vulnerabilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical:</strong> Update database to latest security patch
                  </AlertDescription>
                </Alert>
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <strong>High:</strong> Enable additional firewall rules for API endpoints
                  </AlertDescription>
                </Alert>
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Bell className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <strong>Medium:</strong> Review and update SSL certificates
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>Comprehensive log of all administrative actions and security events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="Search audit logs..." className="flex-1" />
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.resource}</TableCell>
                      <TableCell className="max-w-md truncate">{log.details}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Policies */}
        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Security Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Password Policy</div>
                    <div className="text-sm text-muted-foreground">Minimum 12 characters, complexity required</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Session Timeout</div>
                    <div className="text-sm text-muted-foreground">30 minutes of inactivity</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">API Rate Limiting</div>
                    <div className="text-sm text-muted-foreground">1000 requests per hour</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Overall Risk Level</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
                  </div>
                  <Progress value={35} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Data Breach Risk</span>
                    <span className="text-sm font-medium">Low</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Insider Threat Risk</span>
                    <span className="text-sm font-medium">Medium</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>External Attack Risk</span>
                    <span className="text-sm font-medium">Medium</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Compliance Risk</span>
                    <span className="text-sm font-medium">Low</span>
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