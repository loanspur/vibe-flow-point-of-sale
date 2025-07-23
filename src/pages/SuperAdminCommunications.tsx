import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Bell, Settings, Users, MessageSquare } from "lucide-react";
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
          <Card>
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>
                Monitor and manage platform-wide notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Security Alerts</h3>
                  <p className="text-sm text-muted-foreground">Critical security notifications</p>
                </div>
                <Badge variant="destructive">3 Active</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">System Health</h3>
                  <p className="text-sm text-muted-foreground">Performance and uptime alerts</p>
                </div>
                <Badge variant="secondary">All Clear</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Tenant Alerts</h3>
                  <p className="text-sm text-muted-foreground">Tenant-specific issues</p>
                </div>
                <Badge variant="outline">2 Pending</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Messages</CardTitle>
              <CardDescription>
                Send platform-wide announcements to all tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Create New Broadcast
              </Button>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Feature Update Announcement</h3>
                    <p className="text-sm text-muted-foreground">New POS features available</p>
                    <p className="text-xs text-muted-foreground">Sent 2 days ago</p>
                  </div>
                  <Badge variant="secondary">Delivered</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Maintenance Schedule</h3>
                    <p className="text-sm text-muted-foreground">Scheduled maintenance notification</p>
                    <p className="text-xs text-muted-foreground">Scheduled for tomorrow</p>
                  </div>
                  <Badge variant="outline">Scheduled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
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