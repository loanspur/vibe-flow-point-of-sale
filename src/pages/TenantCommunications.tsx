import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { NotificationCenter } from "@/components/NotificationCenter";
import { CommunicationSettings } from "@/components/CommunicationSettings";
import { Mail, Bell, Settings } from "lucide-react";

const TenantCommunications = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Communications</h1>
        <p className="text-muted-foreground">
          Manage your tenant's email templates, notifications, and communication settings
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Create and manage email templates for your business communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailTemplateManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Center</CardTitle>
              <CardDescription>
                View and manage notifications for your tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationCenter />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
              <CardDescription>
                Configure email, SMS, and WhatsApp settings for your tenant
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

export default TenantCommunications;