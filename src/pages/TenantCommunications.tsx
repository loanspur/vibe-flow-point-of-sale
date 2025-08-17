import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { CommunicationSettings } from "@/components/CommunicationSettings";
import { WhatsAppTemplateManager } from "@/components/WhatsAppTemplateManager";
import { WhatsAppConfigManager } from "@/components/WhatsAppConfigManager";
import { WhatsAppTester } from "@/components/WhatsAppTester";
import WhatsAppMessageHistory from "@/components/WhatsAppMessageHistory";
import WhatsAppAutomationSettings from "@/components/WhatsAppAutomationSettings";
import WhatsAppBulkMessaging from "@/components/WhatsAppBulkMessaging";
import { Mail, Settings, MessageSquare, Phone, TestTube, History, Bot, Users } from "lucide-react";

const TenantCommunications = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Communications</h1>
        <p className="text-muted-foreground">
          Manage your tenant's email templates and communication settings
        </p>
      </div>

      <Tabs defaultValue="email-templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="email-templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="whatsapp-templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp Templates
          </TabsTrigger>
          <TabsTrigger value="whatsapp-config" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            WhatsApp Config
          </TabsTrigger>
          <TabsTrigger value="whatsapp-automation" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="whatsapp-bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Messaging
          </TabsTrigger>
          <TabsTrigger value="whatsapp-history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Message History
          </TabsTrigger>
          <TabsTrigger value="whatsapp-test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test WhatsApp
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email-templates">
          <Card>
            <CardContent>
              <EmailTemplateManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-templates">
          <Card>
            <CardContent>
              <WhatsAppTemplateManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-config">
          <Card>
            <CardContent>
              <WhatsAppConfigManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-automation">
          <Card>
            <CardContent>
              <WhatsAppAutomationSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-bulk">
          <Card>
            <CardContent>
              <WhatsAppBulkMessaging />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-history">
          <Card>
            <CardContent>
              <WhatsAppMessageHistory />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-test">
          <WhatsAppTester />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
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