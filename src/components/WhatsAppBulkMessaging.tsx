import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCommunication } from '@/hooks/useUnifiedCommunication';
import { format } from 'date-fns';
import { 
  Send, 
  Users, 
  MessageCircle, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  Filter,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  message_body: string;
  variables: string[];
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  scheduled_for?: string;
  started_at?: string;
  completed_at?: string;
}

const WhatsAppBulkMessaging: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const { sendWhatsApp } = useUnifiedCommunication();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, phone, email, company')
        .not('phone', 'is', null)
        .order('name');

      if (contactsError) throw contactsError;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('whatsapp_templates')
        .select('id, name, type, message_body, variables')
        .eq('is_active', true)
        .order('name');

      if (templatesError) throw templatesError;

      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('whatsapp_bulk_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      setContacts((contactsData as any) || []);
      setTemplates((templatesData as any) || []);
      setCampaigns((campaignsData as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelection = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  const selectAllContacts = () => {
    const filteredContactIds = getFilteredContacts().map(c => c.id);
    setSelectedContacts(filteredContactIds);
  };

  const clearSelection = () => {
    setSelectedContacts([]);
  };

  const getFilteredContacts = () => {
    let filtered = contacts;
    
    if (filterType === 'customers') {
      filtered = contacts.filter(c => c.company);
    } else if (filterType === 'suppliers') {
      // Add supplier filtering logic if needed
      filtered = contacts;
    }
    
    return filtered;
  };

  const createCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a campaign name",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one contact",
        variant: "destructive",
      });
      return;
    }

    const messageContent = selectedTemplate ? 
      templates.find(t => t.id === selectedTemplate)?.message_body || '' :
      customMessage;

    if (!messageContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message or select a template",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);

      // Create campaign
      const campaignData: any = {
        name: campaignName,
        template_id: selectedTemplate || null,
        target_contacts: selectedContacts,
        message_content: messageContent,
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduled_for: scheduledFor || null,
        total_recipients: selectedContacts.length,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('whatsapp_bulk_campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create campaign messages
      const campaignMessages = selectedContacts.map(contactId => {
        const contact = contacts.find(c => c.id === contactId);
        return {
          campaign_id: campaign.id,
          contact_id: contactId,
          phone_number: contact?.phone || '',
          contact_name: contact?.name,
          message_content: messageContent,
          status: 'pending'
        };
      });

      const { error: messagesError } = await supabase
        .from('whatsapp_bulk_campaign_messages')
        .insert(campaignMessages);

      if (messagesError) throw messagesError;

      toast({
        title: "Success",
        description: `Campaign "${campaignName}" created successfully`,
      });

      // Reset form
      setCampaignName('');
      setSelectedTemplate('');
      setCustomMessage('');
      setScheduledFor('');
      setSelectedContacts([]);
      setShowCreateDialog(false);
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
      console.error('Error creating campaign:', error);
    } finally {
      setSending(false);
    }
  };

  const startCampaign = async (campaignId: string) => {
    try {
      setSending(true);

      // Update campaign status
      await supabase
        .from('whatsapp_bulk_campaigns')
        .update({ 
          status: 'sending',
          started_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      // Get campaign messages
      const { data: messages, error } = await supabase
        .from('whatsapp_bulk_campaign_messages')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

      if (error) throw error;

      // Send messages
      let sentCount = 0;
      let failedCount = 0;

      for (const message of messages || []) {
        try {
          await sendWhatsApp(
            message.phone_number,
            message.message_content,
            {
              recipientName: message.contact_name
            }
          );

          await supabase
            .from('whatsapp_bulk_campaign_messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', message.id);

          sentCount++;
        } catch (error) {
          await supabase
            .from('whatsapp_bulk_campaign_messages')
            .update({ 
              status: 'failed',
              error_message: (error as any).message
            })
            .eq('id', message.id);

          failedCount++;
        }

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update campaign with final status
      await supabase
        .from('whatsapp_bulk_campaigns')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq('id', campaignId);

      toast({
        title: "Campaign Completed",
        description: `Sent ${sentCount} messages, ${failedCount} failed`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start campaign",
        variant: "destructive",
      });
      console.error('Error starting campaign:', error);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'outline' as const, icon: Clock },
      scheduled: { label: 'Scheduled', variant: 'outline' as const, icon: Calendar },
      sending: { label: 'Sending', variant: 'default' as const, icon: Send },
      completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
      failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Bulk WhatsApp Messaging</h2>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Bulk Messaging Campaign</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Campaign Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Enter campaign name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-for">Schedule For (Optional)</Label>
                    <Input
                      id="scheduled-for"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                    />
                  </div>
                </div>

                {/* Contact Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Select Contacts ({selectedContacts.length} selected)</Label>
                    <div className="flex gap-2">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="customers">Customers</SelectItem>
                          <SelectItem value="suppliers">Suppliers</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={selectAllContacts}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {getFilteredContacts().map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-2 p-3 border-b last:border-b-0">
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) => handleContactSelection(contact.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                          {contact.company && (
                            <p className="text-xs text-muted-foreground">{contact.company}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Content */}
                <div className="space-y-4">
                  <Label>Message Content</Label>
                  <Tabs defaultValue="custom">
                    <TabsList>
                      <TabsTrigger value="custom">Custom Message</TabsTrigger>
                      <TabsTrigger value="template">Use Template</TabsTrigger>
                    </TabsList>
                    <TabsContent value="custom" className="space-y-2">
                      <Textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Enter your message here..."
                        rows={4}
                      />
                    </TabsContent>
                    <TabsContent value="template" className="space-y-2">
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {template.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            {templates.find(t => t.id === selectedTemplate)?.message_body}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createCampaign} disabled={sending}>
                    {sending ? "Creating..." : "Create Campaign"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Campaigns List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Campaign History</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No campaigns created yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.scheduled_for && (
                          <p className="text-xs text-muted-foreground">
                            Scheduled: {format(new Date(campaign.scheduled_for), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{campaign.total_recipients}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      {campaign.status === 'completed' || campaign.status === 'sending' ? (
                        <div className="space-y-1">
                          <Progress 
                            value={(campaign.sent_count / campaign.total_recipients) * 100} 
                            className="w-20"
                          />
                          <p className="text-xs text-muted-foreground">
                            {campaign.sent_count}/{campaign.total_recipients}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => startCampaign(campaign.id)}
                          disabled={sending}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Start
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default WhatsAppBulkMessaging;