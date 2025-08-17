import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Send, FileText, Eye, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmailService } from '@/hooks/useEmailService';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  discount_amount: number | null;
  tax_amount: number | null;
  status: string;
  valid_until: string | null;
  created_at: string;
  contact_id?: string;
  contacts?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  notes?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: any;
}

interface QuoteEmailDialogProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onEmailSent: () => void;
}

export const QuoteEmailDialog = ({ quote, isOpen, onClose, onEmailSent }: QuoteEmailDialogProps) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: '',
    useTemplate: true
  });
  const [previewContent, setPreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  const { toast } = useToast();
  const { sendTemplateEmail, sendEmail } = useEmailService();
  const { tenantCurrency } = useApp();

  // Load email templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .in('type', ['order_confirmation', 'payment_reminder'])
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setTemplates(data || []);

        // Auto-select quote template if available
        const quoteTemplate = data?.find(t => t.name.toLowerCase().includes('quote'));
        if (quoteTemplate) {
          setSelectedTemplate(quoteTemplate);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({
          title: "Warning",
          description: "Could not load email templates. You can still send custom emails.",
          variant: "destructive",
        });
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Update email data when quote changes
  useEffect(() => {
    if (quote && isOpen) {
      setEmailData(prev => ({
        ...prev,
        to: quote.contacts?.email || '',
        subject: selectedTemplate?.subject || `Quote ${quote.quote_number} from ${getCompanyName()}`,
        message: selectedTemplate?.html_content || getDefaultEmailContent()
      }));
    }
  }, [quote, selectedTemplate, isOpen]);

  // Generate preview when template or quote changes
  useEffect(() => {
    if (selectedTemplate && quote) {
      generatePreview();
    }
  }, [selectedTemplate, quote]);

  const getCompanyName = () => {
    // This would typically come from business settings
    return 'Your Company';
  };

  const getDefaultEmailContent = () => {
    if (!quote) return '';
    
    return `
Dear ${quote.contacts?.name || 'Valued Customer'},

Thank you for your interest in our products/services. Please find your quote details below:

Quote Number: ${quote.quote_number}
Quote Date: ${format(new Date(quote.created_at), 'MMM dd, yyyy')}
Valid Until: ${quote.valid_until ? format(new Date(quote.valid_until), 'MMM dd, yyyy') : 'N/A'}
Total Amount: ${tenantCurrency} ${quote.total_amount.toFixed(2)}

If you have any questions about this quote, please feel free to contact us. We look forward to hearing from you.

Best regards,
${getCompanyName()} Team
    `.trim();
  };

  const generateQuoteVariables = () => {
    if (!quote) return {};

    return {
      customer_name: quote.contacts?.name || 'Valued Customer',
      quote_number: quote.quote_number,
      quote_date: format(new Date(quote.created_at), 'MMM dd, yyyy'),
      valid_until: quote.valid_until ? format(new Date(quote.valid_until), 'MMM dd, yyyy') : 'N/A',
      total_amount: `${tenantCurrency} ${quote.total_amount.toFixed(2)}`,
      quote_url: `${window.location.origin}/quotes/${quote.id}`,
      company_name: getCompanyName(),
      support_url: `${window.location.origin}/support`
    };
  };

  const generatePreview = () => {
    if (!selectedTemplate || !quote) return;

    const variables = generateQuoteVariables();
    let preview = selectedTemplate.html_content;

    // Replace variables in preview
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      preview = preview.replace(new RegExp(placeholder, 'g'), String(value));
    });

    setPreviewContent(preview);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    
    if (template && quote) {
      const variables = generateQuoteVariables();
      let processedSubject = template.subject;
      
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value));
      });

      setEmailData(prev => ({
        ...prev,
        subject: processedSubject,
        message: template.html_content
      }));
    }
  };

  const handleSendEmail = async () => {
    if (!quote || !emailData.to) {
      toast({
        title: "Error",
        description: "Please ensure the customer email is provided",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (emailData.useTemplate && selectedTemplate) {
        // Send using template
        await sendTemplateEmail(
          selectedTemplate.id,
          emailData.to,
          generateQuoteVariables(),
          {
            priority: 'medium'
          }
        );
      } else {
        // Send custom email
        await sendEmail({
          to: emailData.to,
          toName: quote.contacts?.name,
          subject: emailData.subject,
          htmlContent: emailData.message.replace(/\n/g, '<br>'),
          textContent: emailData.message,
          priority: 'medium'
        });
      }

      // Update quote status to 'sent' if it's currently 'draft'
      if (quote.status === 'draft') {
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'sent' })
          .eq('id', quote.id);

        if (error) {
          console.error('Error updating quote status:', error);
        }
      }

      toast({
        title: "Email Sent",
        description: "Quote email has been sent successfully",
      });

      onEmailSent();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Quote Email - {quote.quote_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="email"
                    value={emailData.to}
                    onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="Customer email address"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useTemplate"
                      checked={emailData.useTemplate}
                      onChange={(e) => setEmailData(prev => ({ ...prev, useTemplate: e.target.checked }))}
                    />
                    <Label htmlFor="useTemplate">Use Email Template</Label>
                  </div>
                </div>

                {emailData.useTemplate && (
                  <div>
                    <Label htmlFor="template">Email Template</Label>
                    {loadingTemplates ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 animate-spin" />
                        Loading templates...
                      </div>
                    ) : (
                      <Select onValueChange={handleTemplateChange} value={selectedTemplate?.id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {template.name}
                                <Badge variant="outline" className="text-xs">
                                  {template.type.replace('_', ' ')}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {!emailData.useTemplate && (
                  <>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={emailData.subject}
                        onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Email subject"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={emailData.message}
                        onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Email content"
                        className="min-h-[200px]"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quote Summary & Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quote Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quote #:</span>
                  <span className="font-medium">{quote.quote_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{quote.contacts?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{tenantCurrency} {quote.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={quote.status === 'draft' ? 'outline' : 'default'}>
                    {quote.status.toUpperCase()}
                  </Badge>
                </div>
                {quote.valid_until && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid Until:</span>
                    <span className="font-medium">
                      {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {emailData.useTemplate && selectedTemplate && previewContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Email Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] border rounded p-3">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewContent }}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {!emailData.to && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Customer email is required to send the quote</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={isLoading || !emailData.to}
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Quote
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};