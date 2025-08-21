import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Plus, Edit, Trash2, Copy, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAvailableBusinessVariables, 
  previewTemplateWithBusinessData,
  populateTemplate 
} from '@/lib/whatsappTemplateUtils';

interface WhatsAppTemplate {
  id: string;
  name: string;
  template_type: string;
  subject?: string;
  message_body: string;
  variables: any;
  is_active: boolean;
  created_at: string;
}

const templateTypes = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'quote', label: 'Quote' },
  { value: 'general', label: 'General' },
  { value: 'reminder', label: 'Reminder' }
];

const defaultTemplates = {
  receipt: {
    subject: 'Receipt from {company_name}',
    body: `Hi {customer_name},

Thank you for your purchase! Here are your receipt details:

Receipt #: {receipt_number}
Date: {date}
Amount: {total_amount}

Items:
{item_list}

Payment Method: {payment_method}

Thank you for your business!

Best regards,
{company_name}
{company_phone}`
  },
  invoice: {
    subject: 'Invoice from {company_name}',
    body: `Dear {customer_name},

Please find your invoice details below:

Invoice #: {invoice_number}
Date: {date}
Due Date: {due_date}
Amount: {total_amount}

Items:
{item_list}

Payment Instructions:
{payment_instructions}

Thank you!

Best regards,
{company_name}
{company_phone}`
  },
  quote: {
    subject: 'Quote from {company_name}',
    body: `Dear {customer_name},

Thank you for your interest! Here's your quote:

Quote #: {quote_number}
Date: {date}
Valid Until: {valid_until}
Total: {total_amount}

Items:
{item_list}

Terms: {terms_conditions}

Please let us know if you have any questions.

Best regards,
{company_name}
{company_phone}`
  }
};

export const WhatsAppTemplateManager = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    template_type: 'general',
    subject: '',
    message_body: '',
    variables: [] as string[]
  });
  const { tenantId, user } = useAuth();
  const availableVariables = getAvailableBusinessVariables();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const processedTemplates = (data || []).map(template => ({
        ...template,
        variables: Array.isArray(template.variables) ? template.variables : []
      }));
      setTemplates(processedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load WhatsApp templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const handleSave = async () => {
    try {
      const variables = extractVariables(formData.message_body);
      
      const templateData = {
        tenant_id: tenantId,
        name: formData.name,
        template_type: formData.template_type,
        subject: formData.subject,
        message_body: formData.message_body,
        variables,
        created_by: user?.id,
        is_active: true
      };

      if (selectedTemplate) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert(templateData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `WhatsApp template ${selectedTemplate ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      setSelectedTemplate(null);
      setFormData({ name: '', template_type: 'general', subject: '', message_body: '', variables: [] });
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (template: WhatsAppTemplate) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      subject: template.subject || '',
      message_body: template.message_body,
      variables: template.variables
    });
    setIsDialogOpen(true);
  };

  const handleCreateFromDefault = (type: keyof typeof defaultTemplates) => {
    const defaultTemplate = defaultTemplates[type];
    setFormData({
      name: `Default ${type.charAt(0).toUpperCase() + type.slice(1)} Template`,
      template_type: type as any,
      subject: defaultTemplate.subject,
      message_body: defaultTemplate.body,
      variables: extractVariables(defaultTemplate.body)
    });
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const handlePreview = async () => {
    if (!tenantId || !formData.message_body) return;
    
    try {
      const preview = await previewTemplateWithBusinessData(
        formData.message_body,
        tenantId
      );
      setPreviewText(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Error",
        description: "Failed to generate preview",
        variant: "destructive",
      });
    }
  };

  const insertVariable = (variableKey: string) => {
    const textarea = document.getElementById('message') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.message_body;
    const variable = `{${variableKey}}`;
    
    const newText = text.substring(0, start) + variable + text.substring(end);
    setFormData(prev => ({ ...prev, message_body: newText }));

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  if (loading) {
    return <div className="p-4">Loading WhatsApp templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Message Templates
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage professionally designed templates for receipts, invoices, and quotes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? 'Edit Template' : 'Create WhatsApp Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                  <Label htmlFor="type">Template Type</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, template_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Message subject"
                />
              </div>

              <div>
                <Label htmlFor="message">Message Body</Label>
                <Textarea
                  id="message"
                  value={formData.message_body}
                  onChange={(e) => setFormData(prev => ({ ...prev, message_body: e.target.value }))}
                  placeholder="Enter your message template. Use {variable_name} for dynamic content."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use curly braces for variables: {'{customer_name}'}, {'{total_amount}'}, etc.
                </p>
              </div>

              {extractVariables(formData.message_body).length > 0 && (
                <div>
                  <Label>Detected Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {extractVariables(formData.message_body).map((variable) => (
                      <Badge key={variable} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Variables */}
              <div>
                <Label>Available Variables</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Click to insert into your template
                </p>
                <div className="space-y-3">
                  {['Business', 'Location', 'Transaction'].map((category) => (
                    <div key={category}>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{category}</p>
                      <div className="flex flex-wrap gap-1">
                        {availableVariables
                          .filter(v => v.category === category)
                          .map((variable) => (
                            <Button
                              key={variable.key}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => insertVariable(variable.key)}
                            >
                              {variable.label}
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateFromDefault('receipt')}
                  >
                    Use Receipt Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateFromDefault('invoice')}
                  >
                    Use Invoice Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateFromDefault('quote')}
                  >
                    Use Quote Template
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePreview}
                    disabled={!formData.message_body}
                  >
                    Preview with Business Data
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {selectedTemplate ? 'Update' : 'Create'} Template
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {templateTypes.find(t => t.value === template.template_type)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((variable) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.variables.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No templates created yet. Create your first WhatsApp template to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview with Business Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Preview</Label>
              <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                <pre className="whitespace-pre-wrap text-sm">{previewText}</pre>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowPreview(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};