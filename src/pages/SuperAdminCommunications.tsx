import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Bell, Settings, Users, MessageSquare, Edit } from "lucide-react";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";

const SuperAdminCommunications = () => {
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
                  <Button className="bg-primary hover:bg-primary/90">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Create New Broadcast
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">All</Button>
                    <Button variant="outline" size="sm">Delivered</Button>
                    <Button variant="outline" size="sm">Scheduled</Button>
                    <Button variant="outline" size="sm">Drafts</Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="font-medium">Q4 Platform Updates & New Features</h3>
                        <p className="text-sm text-muted-foreground">
                          Exciting new features including advanced reporting, mobile app improvements, and enhanced security
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>📧 2,387 tenants reached</span>
                          <span>📱 95% delivery rate</span>
                          <span>🕒 Sent 2 days ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                        Delivered
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="font-medium">Scheduled Maintenance Window - December 15th</h3>
                        <p className="text-sm text-muted-foreground">
                          System maintenance scheduled for December 15th, 2:00 AM - 4:00 AM UTC
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>📅 Scheduled for tomorrow</span>
                          <span>🎯 All active tenants</span>
                          <span>⏰ 2:00 AM UTC</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                        Scheduled
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="font-medium">Holiday Season Performance Tips</h3>
                        <p className="text-sm text-muted-foreground">
                          Best practices for managing high-volume sales during the holiday season
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>📧 2,401 tenants reached</span>
                          <span>📱 97% delivery rate</span>
                          <span>🕒 Sent 1 week ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Delivered</Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="font-medium">Security Enhancement Notification</h3>
                        <p className="text-sm text-muted-foreground">
                          Important security updates have been deployed to protect your data
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>📧 2,398 tenants reached</span>
                          <span>📱 98% delivery rate</span>
                          <span>🕒 Sent 2 weeks ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Delivered</Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                      <div className="flex-1">
                        <h3 className="font-medium">Year-End Billing Update</h3>
                        <p className="text-sm text-muted-foreground">
                          Important changes to billing cycles and subscription management
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>📝 Draft saved</span>
                          <span>🎯 2,400 tenants targeted</span>
                          <span>🕒 Last edited 3 hours ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                        Draft
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Continue
                      </Button>
                    </div>
                  </div>
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
                    <Button variant="outline" size="sm" className="w-full">
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
                    <Button variant="outline" size="sm" className="w-full">
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
                    <Button variant="outline" size="sm" className="w-full">
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
                    <Button variant="outline" size="sm" className="w-full">
                      Use Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
};

export default SuperAdminCommunications;