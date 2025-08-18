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
import WhatsAppAutomationSettings from "@/components/WhatsAppAutomationSettings";
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

  // Determine available tabs based on user role
  const getAvailableTabs = () => {
    const baseTabs = [
      { value: 'overview', label: 'Overview', icon: BarChart3 },
      { value: 'email-templates', label: 'Email Templates', icon: Mail },
      { value: 'whatsapp-templates', label: 'WhatsApp Templates', icon: MessageSquare },
      { value: 'whatsapp-automation', label: 'Automation', icon: Bot },
      { value: 'whatsapp-history', label: 'Message History', icon: History },
      { value: 'settings', label: 'Settings', icon: Settings }
    ];

    const adminTabs = [
      { value: 'whatsapp-config', label: 'WhatsApp Config', icon: Phone },
      { value: 'whatsapp-bulk', label: 'Bulk Messaging', icon: Users },
      { value: 'whatsapp-test', label: 'Test WhatsApp', icon: TestTube }
    ];

    if (userRole === 'superadmin' || userRole === 'tenant_admin') {
      return [...baseTabs.slice(0, 3), ...adminTabs, ...baseTabs.slice(3)];
    }

    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Unified Communications</h1>
        <p className="text-muted-foreground">
          Manage all your communication channels from one unified interface
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(availableTabs.length, 8)}, 1fr)` }}>
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

        <TabsContent value="email-templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Create and manage email templates for automated communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailTemplateManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-templates">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Templates</CardTitle>
              <CardDescription>
                Create and manage WhatsApp message templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppTemplateManager />
            </CardContent>
          </Card>
        </TabsContent>

        {(userRole === 'superadmin' || userRole === 'tenant_admin') && (
          <>
            <TabsContent value="whatsapp-config">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Configuration</CardTitle>
                  <CardDescription>
                    Configure WhatsApp API settings and phone numbers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WhatsAppConfigManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp-bulk">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Messaging</CardTitle>
                  <CardDescription>
                    Send messages to multiple recipients at once
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WhatsAppBulkMessaging />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp-test">
              <Card>
                <CardHeader>
                  <CardTitle>Test WhatsApp</CardTitle>
                  <CardDescription>
                    Test your WhatsApp configuration and templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WhatsAppTester />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        <TabsContent value="whatsapp-automation">
          <Card>
            <CardHeader>
              <CardTitle>Communication Automation</CardTitle>
              <CardDescription>
                Configure automated messages for business events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppAutomationSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-history">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
              <CardDescription>
                View history of all sent communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppMessageHistory />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
              <CardDescription>
                Configure global communication preferences and API settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommunicationSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedCommunicationCenter;