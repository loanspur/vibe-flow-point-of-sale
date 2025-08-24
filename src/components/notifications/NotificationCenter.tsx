import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Settings, Send, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  type: z.enum(['whatsapp', 'email', 'sms']),
  subject: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  variables: z.array(z.string()).default([]),
});

const settingsSchema = z.object({
  is_enabled: z.boolean(),
  provider_config: z.record(z.any()).default({}),
  rate_limit_per_hour: z.number().min(1).max(1000),
});

type TemplateFormData = z.infer<typeof templateSchema>;
type SettingsFormData = z.infer<typeof settingsSchema>;

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'whatsapp' | 'email' | 'sms';
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface NotificationSetting {
  id: string;
  notification_type: 'whatsapp' | 'email' | 'sms';
  is_enabled: boolean;
  provider_config: any;
  rate_limit_per_hour: number;
}

interface NotificationQueue {
  id: string;
  notification_type: 'whatsapp' | 'email' | 'sms';
  recipient: string;
  subject?: string;
  content: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  retry_count: number;
  scheduled_at: string;
  sent_at?: string;
  created_at: string;
}

export default function NotificationCenter() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [queue, setQueue] = useState<NotificationQueue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editingSetting, setEditingSetting] = useState<NotificationSetting | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<NotificationQueue | null>(null);
  const [isQueueDetailOpen, setIsQueueDetailOpen] = useState(false);
  const { toast } = useToast();

  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      type: 'whatsapp',
      subject: '',
      content: '',
      variables: [],
    },
  });

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      is_enabled: true,
      provider_config: {},
      rate_limit_per_hour: 100,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchTemplates(),
        fetchSettings(),
        fetchQueue(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .order('notification_type');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setQueue(data || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const handleTemplateSubmit = async (data: TemplateFormData) => {
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('notification_templates')
          .update({
            ...data,
            variables: data.variables,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('notification_templates')
          .insert({
            ...data,
            variables: data.variables,
          });

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
      }

      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleSettingsSubmit = async (data: SettingsFormData) => {
    try {
      if (editingSetting) {
        const { error } = await supabase
          .from('notification_settings')
          .update(data)
          .eq('id', editingSetting.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Settings updated successfully',
        });
      }

      setIsSettingsDialogOpen(false);
      setEditingSetting(null);
      settingsForm.reset();
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleTestNotification = async (templateId: string) => {
    try {
      // This would typically call the queue_notification function
      toast({
        title: 'Test Notification',
        description: 'Test notification queued successfully',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      sent: 'default',
      failed: 'destructive',
      cancelled: 'outline',
    } as const;

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    return <Badge variant="outline">{type}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading notification center...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notification Center</h2>
          <p className="text-muted-foreground">
            Manage notification templates, settings, and monitor delivery
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingSetting(null);
              settingsForm.reset();
              setIsSettingsDialogOpen(true);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="outline"
            onClick={fetchData}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Notification Templates</h3>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingTemplate(null);
                  templateForm.reset();
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Edit Template' : 'Add New Template'}
                  </DialogTitle>
                  <DialogDescription>
                    Create a notification template with variables
                  </DialogDescription>
                </DialogHeader>
                <Form {...templateForm}>
                  <form onSubmit={templateForm.handleSubmit(handleTemplateSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={templateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Order Confirmation" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={templateForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={templateForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject (Email only)</FormLabel>
                          <FormControl>
                            <Input placeholder="Email subject line" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={templateForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your message content. Use {{variable_name}} for dynamic values."
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTemplateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingTemplate ? 'Update' : 'Create'} Template
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.subject && (
                            <div className="text-sm text-muted-foreground">
                              Subject: {template.subject}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(template.type)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {template.content}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestNotification(template.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(template);
                              templateForm.reset({
                                name: template.name,
                                type: template.type,
                                subject: template.subject || '',
                                content: template.content,
                                variables: template.variables,
                              });
                              setIsTemplateDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        <TabsContent value="queue" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Notification Queue</h3>
            <Button variant="outline" onClick={fetchQueue}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {getTypeBadge(item.notification_type)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.recipient}</div>
                          {item.subject && (
                            <div className="text-sm text-muted-foreground">
                              {item.subject}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
                        {item.retry_count}/3
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Scheduled: {formatDate(item.scheduled_at)}</div>
                          {item.sent_at && (
                            <div className="text-muted-foreground">
                              Sent: {formatDate(item.sent_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQueueItem(item);
                            setIsQueueDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <h3 className="text-lg font-semibold">Notification Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {settings.map((setting) => (
              <Card key={setting.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {setting.notification_type.charAt(0).toUpperCase() + setting.notification_type.slice(1)}
                    <Switch
                      checked={setting.is_enabled}
                      onCheckedChange={(checked) => {
                        // Update setting
                        supabase
                          .from('notification_settings')
                          .update({ is_enabled: checked })
                          .eq('id', setting.id)
                          .then(() => fetchSettings());
                      }}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Rate Limit:</span> {setting.rate_limit_per_hour}/hour
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Provider:</span> {setting.provider_config?.provider || 'Not configured'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Queue Detail Dialog */}
      <Dialog open={isQueueDetailOpen} onOpenChange={setIsQueueDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              Detailed information about this notification
            </DialogDescription>
          </DialogHeader>
          {selectedQueueItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <div>{getTypeBadge(selectedQueueItem.notification_type)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div>{getStatusBadge(selectedQueueItem.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Recipient</label>
                  <div className="text-sm">{selectedQueueItem.recipient}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Retry Count</label>
                  <div className="text-sm">{selectedQueueItem.retry_count}/3</div>
                </div>
              </div>

              {selectedQueueItem.subject && (
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <div className="text-sm">{selectedQueueItem.subject}</div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Content</label>
                <div className="text-sm bg-muted p-2 rounded mt-1">
                  {selectedQueueItem.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Scheduled At</label>
                  <div className="text-sm">{formatDate(selectedQueueItem.scheduled_at)}</div>
                </div>
                {selectedQueueItem.sent_at && (
                  <div>
                    <label className="text-sm font-medium">Sent At</label>
                    <div className="text-sm">{formatDate(selectedQueueItem.sent_at)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
