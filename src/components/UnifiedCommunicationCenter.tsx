import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { CommunicationSettings } from "@/components/CommunicationSettings";
import { WhatsAppTemplateManager } from "@/components/WhatsAppTemplateManager";
import { WhatsAppConfigManager } from "@/components/WhatsAppConfigManager";
import { WhatsAppTester } from "@/components/WhatsAppTester";
import WhatsAppMessageHistory from "@/components/WhatsAppMessageHistory";
// WhatsAppAutomationSettings is now part of unified communication system
import WhatsAppBulkMessaging from "@/components/WhatsAppBulkMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Mail, 
  Settings, 
  MessageSquare, 
  Phone, 
  TestTube, 
  History, 
  Bot, 
  Users, 
  BarChart3,
  Bell,
  Send,
  Smartphone
} from "lucide-react";

interface UnifiedCommunicationCenterProps {
  userRole?: 'superadmin' | 'tenant_admin' | 'user';
}

const UnifiedCommunicationCenter = ({ userRole = 'user' }: UnifiedCommunicationCenterProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();

  // Mock communication stats - in real implementation, fetch from API
  const communicationStats = [
    {
      title: 'Emails Sent',
      value: '1,234',
      change: '+12%',
      icon: Mail,
      color: 'text-blue-600'
    },
    {
      title: 'WhatsApp Messages',
      value: '567',
      change: '+24%',
      icon: MessageSquare,
      color: 'text-green-600'
    },
    {
      title: 'SMS Sent',
      value: '89',
      change: '+5%',
      icon: Smartphone,
      color: 'text-purple-600'
    },
    {
      title: 'Active Templates',
      value: '12',
      change: '+2',
      icon: Bell,
      color: 'text-orange-600'
    }
  ];

  const recentActivity = [
    {
      type: 'email',
      title: 'Invoice notification sent',
      recipient: 'customer@example.com',
      status: 'delivered',
      time: '2 minutes ago',
      channel: 'email'
    },
    {
      type: 'whatsapp',
      title: 'Receipt confirmation sent',
      recipient: '+254712345678',
      status: 'delivered',
      time: '5 minutes ago',
      channel: 'whatsapp'
    },
    {
      type: 'sms',
      title: 'Payment reminder sent',
      recipient: '+254987654321',
      status: 'pending',
      time: '10 minutes ago',
      channel: 'sms'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {communicationStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Delivery Rate
                </span>
                <Badge variant="secondary">98.5%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp Delivery Rate
                </span>
                <Badge variant="secondary">96.2%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  SMS Delivery Rate
                </span>
                <Badge variant="secondary">94.8%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const ChannelIcon = activity.channel === 'email' ? Mail : 
                                  activity.channel === 'whatsapp' ? MessageSquare : Smartphone;
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.recipient}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          activity.status === 'delivered' ? 'default' :
                          activity.status === 'read' ? 'secondary' : 'outline'
                        }
                        className="mb-1"
                      >
                        {activity.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Determine available tabs based on user role - organized by communication type
  const getAvailableTabs = () => {
    const baseTabs = [
      { 
        value: 'overview', 
        label: 'Overview', 
        icon: BarChart3,
        group: 'main'
      },
      { 
        value: 'email-communications', 
        label: 'Email', 
        icon: Mail,
        group: 'channels' 
      },
      { 
        value: 'whatsapp-communications', 
        label: 'WhatsApp', 
        icon: MessageSquare,
        group: 'channels' 
      },
      { 
        value: 'sms-communications', 
        label: 'SMS', 
        icon: Smartphone,
        group: 'channels' 
      },
      { 
        value: 'automation-settings', 
        label: 'Automation', 
        icon: Bot,
        group: 'settings' 
      }
    ];

    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Communications Center</h1>
        <p className="text-muted-foreground">
          Manage all your communication channels through our organized 5-section interface
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="email-communications">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Communications
                </CardTitle>
                <CardDescription>
                  Manage email templates and email-specific settings
                </CardDescription>
              </CardHeader>
            </Card>

            <Tabs defaultValue="email-templates" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email-templates" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="email-settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email-templates">
                <Card>
                  <CardContent className="pt-6">
                    <EmailTemplateManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email-settings">
                <Card>
                  <CardContent className="pt-6">
                    <CommunicationSettings />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp-communications">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  WhatsApp Communications
                </CardTitle>
                <CardDescription>
                  Complete WhatsApp management - templates, configuration, testing, and history
                </CardDescription>
              </CardHeader>
            </Card>

            <Tabs defaultValue="whatsapp-templates" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="whatsapp-templates" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Templates</span>
                </TabsTrigger>
                {(userRole === 'superadmin' || userRole === 'tenant_admin') && (
                  <TabsTrigger value="whatsapp-config" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Config</span>
                  </TabsTrigger>
                )}
                {(userRole === 'superadmin' || userRole === 'tenant_admin') && (
                  <TabsTrigger value="whatsapp-bulk" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Bulk</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="whatsapp-history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
                {(userRole === 'superadmin' || userRole === 'tenant_admin') && (
                  <TabsTrigger value="whatsapp-test" className="flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    <span className="hidden sm:inline">Test</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="whatsapp-settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp-templates">
                <Card>
                  <CardContent className="pt-6">
                    <WhatsAppTemplateManager />
                  </CardContent>
                </Card>
              </TabsContent>

              {(userRole === 'superadmin' || userRole === 'tenant_admin') && (
                <TabsContent value="whatsapp-config">
                  <Card>
                    <CardHeader>
                      <CardTitle>WhatsApp API Configuration</CardTitle>
                      <CardDescription>
                        Configure your 360Messenger API credentials and phone numbers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <WhatsAppConfigManager />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {(userRole === 'superadmin' || userRole === 'tenant_admin') && (
                <TabsContent value="whatsapp-bulk">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bulk WhatsApp Messaging</CardTitle>
                      <CardDescription>
                        Send WhatsApp messages to multiple recipients at once
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <WhatsAppBulkMessaging />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="whatsapp-history">
                <Card>
                  <CardHeader>
                    <CardTitle>WhatsApp Message History</CardTitle>
                    <CardDescription>
                      View all WhatsApp messages sent and their delivery status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WhatsAppMessageHistory />
                  </CardContent>
                </Card>
              </TabsContent>

              {(userRole === 'superadmin' || userRole === 'tenant_admin') && (
                <TabsContent value="whatsapp-test">
                  <Card>
                    <CardHeader>
                      <CardTitle>Test WhatsApp Configuration</CardTitle>
                      <CardDescription>
                        Test your WhatsApp API setup and message delivery
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <WhatsAppTester />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="whatsapp-settings">
                <Card>
                  <CardHeader>
                    <CardTitle>WhatsApp Notification Settings</CardTitle>
                    <CardDescription>
                      Enable/disable WhatsApp notifications for different business events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CommunicationSettings />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="sms-communications">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  SMS Communications
                </CardTitle>
                <CardDescription>
                  Manage SMS settings and bulk messaging capabilities
                </CardDescription>
              </CardHeader>
            </Card>

            <Tabs defaultValue="sms-settings" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sms-settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  SMS Settings
                </TabsTrigger>
                <TabsTrigger value="sms-bulk" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Bulk SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sms-settings">
                <Card>
                  <CardContent className="pt-6">
                    <CommunicationSettings />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sms-bulk">
                <Card>
                  <CardHeader>
                    <CardTitle>Bulk SMS Messaging</CardTitle>
                    <CardDescription>
                      Send SMS messages to multiple recipients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Bulk SMS functionality coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="automation-settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Communication Automation & Settings
                </CardTitle>
                <CardDescription>
                  Configure automated notifications and global communication preferences
                </CardDescription>
              </CardHeader>
            </Card>

            <Tabs defaultValue="automation" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="automation" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Automation Rules
                </TabsTrigger>
                <TabsTrigger value="global-settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Global Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="automation">
                <Card>
                  <CardHeader>
                    <CardTitle>Communication Automation</CardTitle>
                    <CardDescription>
                      Set up automated messages for sales, receipts, invoices, and other business events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CommunicationSettings />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="global-settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Global Communication Settings</CardTitle>
                    <CardDescription>
                      Configure API keys, providers, and general communication preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CommunicationSettings />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedCommunicationCenter;