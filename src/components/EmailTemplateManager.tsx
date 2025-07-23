import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Mail, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EmailTemplate {
  id: string;
  name: string;
  type: 'system' | 'user_invitation' | 'password_reset' | 'account_verification' | 'payment_reminder' | 'order_confirmation' | 'subscription_update' | 'security_alert' | 'marketing' | 'announcement';
  subject: string;
  html_content: string;
  text_content?: string;
  variables: any;
  is_system_template: boolean;
  is_active: boolean;
}

const notificationTypes = [
  { value: 'system', label: 'System' },
  { value: 'user_invitation', label: 'User Invitation' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'account_verification', label: 'Account Verification' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'order_confirmation', label: 'Order Confirmation' },
  { value: 'subscription_update', label: 'Subscription Update' },
  { value: 'security_alert', label: 'Security Alert' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'announcement', label: 'Announcement' }
];

export const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    subject: '',
    html_content: '',
    text_content: '',
    variables: '{}'
  });

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = () => {
    setIsCreateMode(true);
    setSelectedTemplate(null);
    setFormData({
      name: '',
      type: '',
      subject: '',
      html_content: '',
      text_content: '',
      variables: '{}'
    });
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setIsCreateMode(false);
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || '',
      variables: JSON.stringify(template.variables, null, 2)
    });
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      let variables = {};
      try {
        variables = JSON.parse(formData.variables);
      } catch {
        toast({
          title: "Error",
          description: "Invalid JSON in variables field",
          variant: "destructive",
        });
        return;
      }

      const templateData = {
        name: formData.name,
        type: formData.type as any,
        subject: formData.subject,
        html_content: formData.html_content,
        text_content: formData.text_content || null,
        variables,
        tenant_id: tenantId,
        is_system_template: false,
        is_active: true
      };

      if (isCreateMode) {
        const { error } = await supabase
          .from('email_templates')
          .insert(templateData);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Email template created successfully",
        });
      } else {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', selectedTemplate?.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Email template updated successfully",
        });
      }

      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Email template deleted successfully",
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete email template",
        variant: "destructive",
      });
    }
  };

  const renderPreview = (template: EmailTemplate) => {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Subject</Label>
          <div className="p-2 bg-muted rounded border">{template.subject}</div>
        </div>
        <div>
          <Label className="text-sm font-medium">HTML Content</Label>
          <div 
            className="p-4 bg-white border rounded max-h-96 overflow-auto"
            dangerouslySetInnerHTML={{ __html: template.html_content }}
          />
        </div>
        {template.text_content && (
          <div>
            <Label className="text-sm font-medium">Text Content</Label>
            <div className="p-2 bg-muted rounded border whitespace-pre-wrap">
              {template.text_content}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-4">Loading email templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">
            Manage email templates for automated communications
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Preview: {template.name}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]">
                        {renderPreview(template)}
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  
                  {!template.is_system_template && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="capitalize">
                  {template.type.replace('_', ' ')}
                </Badge>
                {template.is_system_template && (
                  <Badge variant="outline">System</Badge>
                )}
                {!template.is_active && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.subject}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {isCreateMode ? 'Create Email Template' : 'Edit Email Template'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject (use {{variable}} for dynamic content)"
                />
              </div>

              <Tabs defaultValue="html" className="w-full">
                <TabsList>
                  <TabsTrigger value="html">
                    <Code className="h-4 w-4 mr-2" />
                    HTML Content
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <Mail className="h-4 w-4 mr-2" />
                    Text Content
                  </TabsTrigger>
                  <TabsTrigger value="variables">Variables</TabsTrigger>
                </TabsList>
                
                <TabsContent value="html">
                  <div>
                    <Label htmlFor="html_content">HTML Content</Label>
                    <Textarea
                      id="html_content"
                      value={formData.html_content}
                      onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
                      placeholder="Enter HTML email content"
                      className="min-h-96 font-mono text-sm"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="text">
                  <div>
                    <Label htmlFor="text_content">Text Content (Optional)</Label>
                    <Textarea
                      id="text_content"
                      value={formData.text_content}
                      onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                      placeholder="Enter plain text email content"
                      className="min-h-48"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="variables">
                  <div>
                    <Label htmlFor="variables">Variables (JSON)</Label>
                    <Textarea
                      id="variables"
                      value={formData.variables}
                      onChange={(e) => setFormData(prev => ({ ...prev, variables: e.target.value }))}
                      placeholder='{"variable_name": "description"}'
                      className="min-h-32 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Define variables that can be used in the template with {"{{variable_name}}"} syntax
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {isCreateMode ? 'Create Template' : 'Update Template'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};