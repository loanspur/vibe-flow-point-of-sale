import React, { useState } from 'react';
import { Mail, MessageSquare, Bell, Users, Settings, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailTemplateManager } from '@/components/EmailTemplateManager';
import { NotificationCenter } from '@/components/NotificationCenter';
import { CommunicationSettings } from '@/components/CommunicationSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const Communications = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const communicationStats = [
    {
      title: 'Emails Sent',
      value: '1,234',
      change: '+12%',
      icon: Mail,
      color: 'text-blue-600'
    },
    {
      title: 'Notifications',
      value: '567',
      change: '+8%',
      icon: Bell,
      color: 'text-green-600'
    },
    {
      title: 'Active Templates',
      value: '12',
      change: '+2',
      icon: MessageSquare,
      color: 'text-purple-600'
    },
    {
      title: 'Delivery Rate',
      value: '98.5%',
      change: '+0.3%',
      icon: BarChart3,
      color: 'text-orange-600'
    }
  ];

  const recentActivity = [
    {
      type: 'email',
      title: 'Welcome email sent to new user',
      recipient: 'john.doe@example.com',
      status: 'delivered',
      time: '2 minutes ago'
    },
    {
      type: 'notification',
      title: 'Order confirmation notification',
      recipient: 'jane.smith@example.com',
      status: 'read',
      time: '5 minutes ago'
    },
    {
      type: 'email',
      title: 'Password reset email',
      recipient: 'user@example.com',
      status: 'pending',
      time: '10 minutes ago'
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
              Email Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Delivery Rate</span>
                <Badge variant="secondary">98.5%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Open Rate</span>
                <Badge variant="secondary">24.3%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Click Rate</span>
                <Badge variant="secondary">4.2%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Bounce Rate</span>
                <Badge variant="outline">1.5%</Badge>
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
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.recipient}</p>
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-muted-foreground">
            Manage email templates, notifications, and communication settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplateManager />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Notification management interface coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <CommunicationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Communications;