import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Bell, Settings, Users, MessageSquare, Edit, Eye, Send, Calendar, FileText } from "lucide-react";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { toast } from "@/hooks/use-toast";

const SuperAdminCommunications = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [broadcasts] = useState([
    {
      id: "1",
      title: "Q4 Platform Updates & New Features",
      description: "Exciting new features including advanced reporting, mobile app improvements, and enhanced security",
      status: "delivered",
      reach: 2387,
      deliveryRate: 95,
      sentDate: "2 days ago",
      type: "feature"
    },
    {
      id: "2", 
      title: "Scheduled Maintenance Window - December 15th",
      description: "System maintenance scheduled for December 15th, 2:00 AM - 4:00 AM UTC",
      status: "scheduled",
      scheduledFor: "tomorrow",
      type: "maintenance"
    },
    {
      id: "3",
      title: "Holiday Season Performance Tips", 
      description: "Best practices for managing high-volume sales during the holiday season",
      status: "delivered",
      reach: 2401,
      deliveryRate: 97,
      sentDate: "1 week ago",
      type: "tips"
    },
    {
      id: "4",
      title: "Security Enhancement Notification",
      description: "Important security updates have been deployed to protect your data", 
      status: "delivered",
      reach: 2398,
      deliveryRate: 98,
      sentDate: "2 weeks ago",
      type: "security"
    },
    {
      id: "5",
      title: "Year-End Billing Update",
      description: "Important changes to billing cycles and subscription management",
      status: "draft",
      lastEdited: "3 hours ago",
      type: "billing"
    }
  ]);

  const filteredBroadcasts = broadcasts.filter(broadcast => {
    if (activeFilter === "all") return true;
    return broadcast.status === activeFilter;
  });

  const handleCreateBroadcast = () => {
    setShowCreateDialog(true);
  };

  const handleUseTemplate = (templateType: string) => {
    setSelectedTemplate(templateType);
    setShowCreateDialog(true);
  };

  const handleViewBroadcast = (broadcastId: string) => {
    console.log("Viewing broadcast:", broadcastId);
    // Here you would implement view functionality
  };

  const handleEditBroadcast = (broadcastId: string) => {
    console.log("Editing broadcast:", broadcastId);
    // Here you would implement edit functionality
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Delivered</Badge>;
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Scheduled</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Platform Communications</h1>
        <p className="text-muted-foreground">
          Manage platform-wide communications, notifications, and messaging
        </p>
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Platform Emails
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            System Notifications
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Broadcasts
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Global Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <EmailTemplateManager isSystemAdmin={true} />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Notifications</CardTitle>
                <CardDescription>
                  Monitor and manage platform-wide notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-destructive rounded-full"></div>
                      <h3 className="font-semibold text-destructive">Critical Alerts</h3>
                    </div>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-sm text-muted-foreground">Security & System</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                      <h3 className="font-semibold text-orange-600">Warnings</h3>
                    </div>
                    <p className="text-2xl font-bold">7</p>
                    <p className="text-sm text-muted-foreground">Performance & Usage</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <h3 className="font-semibold text-green-600">Active</h3>
                    </div>
                    <p className="text-2xl font-bold">24</p>
                    <p className="text-sm text-muted-foreground">Normal Operations</p>
                  </Card>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20 bg-destructive/5">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-destructive rounded-full"></div>
                      <div>
                        <h3 className="font-medium text-destructive">Failed Login Attempts Spike</h3>
                        <p className="text-sm text-muted-foreground">Multiple failed login attempts detected across 5 tenants</p>
                        <p className="text-xs text-muted-foreground">2 minutes ago</p>
                      </div>
                    </div>
                    <Badge variant="destructive">Critical</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20 bg-destructive/5">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-destructive rounded-full"></div>
                      <div>
                        <h3 className="font-medium text-destructive">Database Connection Issues</h3>
                        <p className="text-sm text-muted-foreground">Intermittent connection timeouts in us-east-1</p>
                        <p className="text-xs text-muted-foreground">15 minutes ago</p>
                      </div>
                    </div>
                    <Badge variant="destructive">Critical</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                      <div>
                        <h3 className="font-medium text-orange-700">High Memory Usage</h3>
                        <p className="text-sm text-muted-foreground">Server memory usage at 85% capacity</p>
                        <p className="text-xs text-muted-foreground">1 hour ago</p>
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">Warning</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <div>
                        <h3 className="font-medium">System Backup Completed</h3>
                        <p className="text-sm text-muted-foreground">Daily backup successfully completed</p>
                        <p className="text-xs text-muted-foreground">3 hours ago</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Info</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <h3 className="font-medium">New Tenant Registration</h3>
                        <p className="text-sm text-muted-foreground">TechCorp Solutions signed up for Pro plan</p>
                        <p className="text-xs text-muted-foreground">6 hours ago</p>
                      </div>
                    </div>
                    <Badge variant="outline">Activity</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Templates</CardTitle>
                <CardDescription>
                  Pre-configured notification templates for common alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Security Alert Template</h3>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Subject:</strong> Security Alert: Unusual Activity Detected
                    </p>
                    <div className="text-sm bg-muted p-3 rounded">
                      <p><strong>Alert:</strong> We've detected unusual activity on your account.</p>
                      <p><strong>Action Required:</strong> Please review your recent login activity.</p>
                      <p><strong>Location:</strong> {`{{location}}`}</p>
                      <p><strong>Time:</strong> {`{{timestamp}}`}</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Template
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">System Maintenance Template</h3>
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">Warning</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Subject:</strong> Scheduled Maintenance Notification
                    </p>
                    <div className="text-sm bg-muted p-3 rounded">
                      <p><strong>Notice:</strong> Scheduled maintenance on {`{{date}}`}</p>
                      <p><strong>Duration:</strong> {`{{duration}}`}</p>
                      <p><strong>Affected Services:</strong> {`{{services}}`}</p>
                      <p><strong>Expected Impact:</strong> {`{{impact}}`}</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Template
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Welcome Notification Template</h3>
                      <Badge variant="secondary">Info</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Subject:</strong> Welcome to VibePOS Platform
                    </p>
                    <div className="text-sm bg-muted p-3 rounded">
                      <p><strong>Welcome</strong> {`{{tenant_name}}`}!</p>
                      <p>Your account has been successfully created.</p>
                      <p><strong>Plan:</strong> {`{{plan_name}}`}</p>
                      <p><strong>Next Steps:</strong> Complete your setup wizard</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Template
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Payment Failure Template</h3>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Subject:</strong> Payment Failed - Action Required
                    </p>
                    <div className="text-sm bg-muted p-3 rounded">
                      <p><strong>Payment Failed:</strong> Your payment of {`{{amount}}`} was declined.</p>
                      <p><strong>Reason:</strong> {`{{failure_reason}}`}</p>
                      <p><strong>Action:</strong> Update your payment method</p>
                      <p><strong>Service Suspension:</strong> In {`{{days_until_suspension}}`} days</p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="broadcast">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Broadcast Messages</CardTitle>
                <CardDescription>
                  Send platform-wide announcements to all tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <h3 className="font-semibold text-green-600">Delivered</h3>
                    </div>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <h3 className="font-semibold text-blue-600">Scheduled</h3>
                    </div>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                      <h3 className="font-semibold text-orange-600">Draft</h3>
                    </div>
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-sm text-muted-foreground">Saved drafts</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                      <h3 className="font-semibold text-purple-600">Reach</h3>
                    </div>
                    <p className="text-2xl font-bold">2.4k</p>
                    <p className="text-sm text-muted-foreground">Total tenants</p>
                  </Card>
                </div>

                <div className="flex justify-between items-center">
                  <Button onClick={handleCreateBroadcast} className="bg-primary hover:bg-primary/90">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Create New Broadcast
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant={activeFilter === "all" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveFilter("all")}
                    >
                      All
                    </Button>
                    <Button 
                      variant={activeFilter === "delivered" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveFilter("delivered")}
                    >
                      Delivered
                    </Button>
                    <Button 
                      variant={activeFilter === "scheduled" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveFilter("scheduled")}
                    >
                      Scheduled
                    </Button>
                    <Button 
                      variant={activeFilter === "draft" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveFilter("draft")}
                    >
                      Drafts
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {filteredBroadcasts.map((broadcast) => (
                    <div 
                      key={broadcast.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        broadcast.status === 'delivered' ? 'bg-green-50 border-green-200' :
                        broadcast.status === 'scheduled' ? 'bg-blue-50 border-blue-200' :
                        broadcast.status === 'draft' ? 'bg-orange-50 border-orange-200' :
                        ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${
                          broadcast.status === 'delivered' ? 'bg-green-500' :
                          broadcast.status === 'scheduled' ? 'bg-blue-500' :
                          broadcast.status === 'draft' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1">
                          <h3 className="font-medium">{broadcast.title}</h3>
                          <p className="text-sm text-muted-foreground">{broadcast.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {broadcast.status === 'delivered' && (
                              <>
                                <span>📧 {broadcast.reach} tenants reached</span>
                                <span>📱 {broadcast.deliveryRate}% delivery rate</span>
                                <span>🕒 Sent {broadcast.sentDate}</span>
                              </>
                            )}
                            {broadcast.status === 'scheduled' && (
                              <>
                                <span>📅 Scheduled for {broadcast.scheduledFor}</span>
                                <span>🎯 All active tenants</span>
                                <span>⏰ 2:00 AM UTC</span>
                              </>
                            )}
                            {broadcast.status === 'draft' && (
                              <>
                                <span>📝 Draft saved</span>
                                <span>🎯 2,400 tenants targeted</span>
                                <span>🕒 Last edited {broadcast.lastEdited}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(broadcast.status)}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => broadcast.status === 'draft' ? handleEditBroadcast(broadcast.id) : handleViewBroadcast(broadcast.id)}
                        >
                          {broadcast.status === 'draft' ? (
                            <>
                              <Edit className="h-4 w-4 mr-1" />
                              Continue
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </>
                          )}
                        </Button>
                        {broadcast.status === 'scheduled' && (
                          <Button variant="outline" size="sm" onClick={() => handleEditBroadcast(broadcast.id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {filteredBroadcasts.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No broadcasts found for this filter.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Broadcast Templates</CardTitle>
                <CardDescription>
                  Pre-built templates for common platform announcements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Feature Release Announcement</h3>
                      <Badge variant="outline">Template</Badge>
                    </div>
                    <div className="text-sm bg-muted p-3 rounded mb-3">
                      <p><strong>Subject:</strong> Exciting New Features Now Available!</p>
                      <p className="mt-2"><strong>Content:</strong></p>
                      <p className="mt-1">Dear {`{{tenant_name}}`},</p>
                      <p>We're thrilled to announce {`{{feature_count}}`} new features that will enhance your VibePOS experience:</p>
                      <p>• {`{{feature_list}}`}</p>
                      <p>These updates are now live in your account. Learn more at {`{{documentation_link}}`}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleUseTemplate("feature")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Maintenance Notification</h3>
                      <Badge variant="outline">Template</Badge>
                    </div>
                    <div className="text-sm bg-muted p-3 rounded mb-3">
                      <p><strong>Subject:</strong> Scheduled Maintenance - {`{{date}}`}</p>
                      <p className="mt-2"><strong>Content:</strong></p>
                      <p className="mt-1">Dear {`{{tenant_name}}`},</p>
                      <p>We'll be performing scheduled maintenance on {`{{date}}`} from {`{{start_time}}`} to {`{{end_time}}`} {`{{timezone}}`}.</p>
                      <p><strong>Expected Impact:</strong> {`{{impact_description}}`}</p>
                      <p>We apologize for any inconvenience.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleUseTemplate("maintenance")}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Security Update Notice</h3>
                      <Badge variant="outline">Template</Badge>
                    </div>
                    <div className="text-sm bg-muted p-3 rounded mb-3">
                      <p><strong>Subject:</strong> Important Security Enhancement</p>
                      <p className="mt-2"><strong>Content:</strong></p>
                      <p className="mt-1">Dear {`{{tenant_name}}`},</p>
                      <p>We've enhanced our security measures with {`{{security_features}}`}.</p>
                      <p><strong>What's Changed:</strong> {`{{changes_list}}`}</p>
                      <p><strong>Action Required:</strong> {`{{action_required}}`}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleUseTemplate("security")}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Holiday Season Tips</h3>
                      <Badge variant="outline">Template</Badge>
                    </div>
                    <div className="text-sm bg-muted p-3 rounded mb-3">
                      <p><strong>Subject:</strong> Maximize Your Holiday Sales Success</p>
                      <p className="mt-2"><strong>Content:</strong></p>
                      <p className="mt-1">Dear {`{{tenant_name}}`},</p>
                      <p>The holiday season is here! Maximize your sales with these tips:</p>
                      <p>• {`{{tip_1}}`}</p>
                      <p>• {`{{tip_2}}`}</p>
                      <p>• {`{{tip_3}}`}</p>
                      <p>Visit our resource center for more: {`{{resource_link}}`}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleUseTemplate("tips")}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Create Broadcast Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? `Create Broadcast - ${selectedTemplate} Template` : 'Create New Broadcast'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Broadcast Title</Label>
                <Input 
                  id="title" 
                  placeholder="Enter broadcast title"
                  defaultValue={selectedTemplate ? getTemplateTitle(selectedTemplate) : ""}
                />
              </div>
              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input 
                  id="subject" 
                  placeholder="Enter email subject"
                  defaultValue={selectedTemplate ? getTemplateSubject(selectedTemplate) : ""}
                />
              </div>
              <div>
                <Label htmlFor="content">Message Content</Label>
                <Textarea 
                  id="content" 
                  placeholder="Enter your message content..."
                  className="min-h-32"
                  defaultValue={selectedTemplate ? getTemplateContent(selectedTemplate) : ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target">Target Audience</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Active Tenants</SelectItem>
                      <SelectItem value="trial">Trial Users</SelectItem>
                      <SelectItem value="paid">Paid Subscribers</SelectItem>
                      <SelectItem value="new">New Signups (Last 30 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Save as Draft
                </Button>
                <Button variant="outline" onClick={() => {
                  toast({
                    title: "Broadcast Scheduled",
                    description: "Your broadcast has been scheduled for delivery.",
                  });
                  setShowCreateDialog(false);
                }}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
                <Button onClick={() => {
                  toast({
                    title: "Broadcast Sent",
                    description: "Your broadcast has been sent to all targeted tenants.",
                  });
                  setShowCreateDialog(false);
                }}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Global Communication Settings</CardTitle>
              <CardDescription>
                Configure platform-wide communication preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Default From Address</h3>
                  <p className="text-sm text-muted-foreground">Platform email sender address</p>
                </div>
                <Badge variant="secondary">noreply@platform.com</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">SMS Provider</h3>
                  <p className="text-sm text-muted-foreground">Global SMS service provider</p>
                </div>
                <Badge variant="outline">Twilio</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Email Delivery Rate</h3>
                  <p className="text-sm text-muted-foreground">System email throughput limit</p>
                </div>
                <Badge variant="secondary">1000/hour</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  function getTemplateTitle(template: string) {
    switch (template) {
      case "feature": return "Feature Release Announcement";
      case "maintenance": return "Scheduled Maintenance Notification";
      case "security": return "Security Update Notice";
      case "tips": return "Holiday Season Performance Tips";
      default: return "";
    }
  }

  function getTemplateSubject(template: string) {
    switch (template) {
      case "feature": return "Exciting New Features Now Available!";
      case "maintenance": return "Scheduled Maintenance - {{date}}";
      case "security": return "Important Security Enhancement";
      case "tips": return "Maximize Your Holiday Sales Success";
      default: return "";
    }
  }

  function getTemplateContent(template: string) {
    switch (template) {
      case "feature": 
        return `Dear {{tenant_name}},

We're thrilled to announce {{feature_count}} new features that will enhance your VibePOS experience:

• {{feature_list}}

These updates are now live in your account. Learn more at {{documentation_link}}

Best regards,
The VibePOS Team`;
      case "maintenance":
        return `Dear {{tenant_name}},

We'll be performing scheduled maintenance on {{date}} from {{start_time}} to {{end_time}} {{timezone}}.

Expected Impact: {{impact_description}}

We apologize for any inconvenience and appreciate your understanding.

Best regards,
The VibePOS Team`;
      case "security":
        return `Dear {{tenant_name}},

We've enhanced our security measures with {{security_features}}.

What's Changed: {{changes_list}}
Action Required: {{action_required}}

Your data security is our top priority.

Best regards,
The VibePOS Team`;
      case "tips":
        return `Dear {{tenant_name}},

The holiday season is here! Maximize your sales with these tips:

• {{tip_1}}
• {{tip_2}}  
• {{tip_3}}

Visit our resource center for more: {{resource_link}}

Happy Holidays!
The VibePOS Team`;
      default: return "";
    }
  }
};

export default SuperAdminCommunications;