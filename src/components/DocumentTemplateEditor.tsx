import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Eye, Save, RotateCcw, Info, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  template_type: 'receipt' | 'invoice' | 'quote' | 'delivery_note';
}

interface DocumentTemplateEditorProps {
  tenantId: string;
}

const TEMPLATE_VARIABLES = {
  receipt: [
    '{{company_name}}', '{{company_address}}', '{{company_phone}}', '{{company_email}}',
    '{{receipt_number}}', '{{date}}', '{{time}}', '{{cashier_name}}',
    '{{customer_name}}', '{{customer_phone}}', '{{customer_email}}',
    '{{items}}', '{{subtotal}}', '{{tax_amount}}', '{{discount_amount}}', '{{total_amount}}',
    '{{payment_method}}', '{{amount_paid}}', '{{change_amount}}',
    '{{receipt_header}}', '{{receipt_footer}}'
  ],
  invoice: [
    '{{company_name}}', '{{company_address}}', '{{company_phone}}', '{{company_email}}',
    '{{company_logo}}', '{{invoice_number}}', '{{invoice_date}}', '{{due_date}}',
    '{{customer_name}}', '{{customer_address}}', '{{customer_phone}}', '{{customer_email}}',
    '{{items}}', '{{subtotal}}', '{{tax_amount}}', '{{discount_amount}}', '{{total_amount}}',
    '{{terms_conditions}}', '{{notes}}'
  ],
  quote: [
    '{{company_name}}', '{{company_address}}', '{{company_phone}}', '{{company_email}}',
    '{{company_logo}}', '{{quote_number}}', '{{quote_date}}', '{{valid_until}}',
    '{{customer_name}}', '{{customer_address}}', '{{customer_phone}}', '{{customer_email}}',
    '{{items}}', '{{subtotal}}', '{{tax_amount}}', '{{discount_amount}}', '{{total_amount}}',
    '{{terms_conditions}}', '{{notes}}'
  ],
  delivery_note: [
    '{{company_name}}', '{{company_address}}', '{{company_phone}}', '{{company_email}}',
    '{{delivery_note_number}}', '{{delivery_date}}', '{{delivery_address}}',
    '{{customer_name}}', '{{customer_phone}}', '{{customer_email}}',
    '{{items}}', '{{driver_name}}', '{{vehicle_number}}', '{{notes}}'
  ]
};

const DEFAULT_TEMPLATES = {
  receipt: `{{receipt_header}}

{{company_name}}
{{company_address}}
Tel: {{company_phone}}
Email: {{company_email}}

================================
        RECEIPT
================================

Receipt No: {{receipt_number}}
Date: {{date}} {{time}}
Cashier: {{cashier_name}}

Customer: {{customer_name}}
Phone: {{customer_phone}}

================================
ITEMS
================================
{{items}}
================================

Subtotal:       {{subtotal}}
Tax:           {{tax_amount}}
Discount:      {{discount_amount}}
--------------------------------
TOTAL:         {{total_amount}}
================================

Payment: {{payment_method}}
Paid:    {{amount_paid}}
Change:  {{change_amount}}

{{receipt_footer}}

Thank you for your business!
`,
  invoice: `{{company_logo}}

{{company_name}}
{{company_address}}
Tel: {{company_phone}}
Email: {{company_email}}

INVOICE

Invoice No: {{invoice_number}}
Date: {{invoice_date}}
Due Date: {{due_date}}

Bill To:
{{customer_name}}
{{customer_address}}
Tel: {{customer_phone}}
Email: {{customer_email}}

Items:
{{items}}

Subtotal: {{subtotal}}
Tax: {{tax_amount}}
Discount: {{discount_amount}}
Total: {{total_amount}}

{{terms_conditions}}

{{notes}}
`,
  quote: `{{company_logo}}

{{company_name}}
{{company_address}}
Tel: {{company_phone}}
Email: {{company_email}}

QUOTATION

Quote No: {{quote_number}}
Date: {{quote_date}}
Valid Until: {{valid_until}}

Quote For:
{{customer_name}}
{{customer_address}}
Tel: {{customer_phone}}
Email: {{customer_email}}

Items:
{{items}}

Subtotal: {{subtotal}}
Tax: {{tax_amount}}
Discount: {{discount_amount}}
Total: {{total_amount}}

{{terms_conditions}}

{{notes}}
`,
  delivery_note: `{{company_name}}
{{company_address}}
Tel: {{company_phone}}
Email: {{company_email}}

DELIVERY NOTE

Delivery Note No: {{delivery_note_number}}
Date: {{delivery_date}}

Deliver To:
{{delivery_address}}

Customer:
{{customer_name}}
Tel: {{customer_phone}}
Email: {{customer_email}}

Items:
{{items}}

Driver: {{driver_name}}
Vehicle: {{vehicle_number}}

{{notes}}
`
};

export const DocumentTemplateEditor: React.FC<DocumentTemplateEditorProps> = ({ tenantId }) => {
  const [templates, setTemplates] = useState<Record<string, DocumentTemplate>>({});
  const [activeTemplate, setActiveTemplate] = useState<'receipt' | 'invoice' | 'quote' | 'delivery_note'>('receipt');
  const [previewMode, setPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, [tenantId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('receipt_template, invoice_template, quote_template, delivery_note_template, receipt_header, receipt_footer')
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      // Initialize templates with stored content or defaults
      const loadedTemplates: Record<string, DocumentTemplate> = {};
      
      ['receipt', 'invoice', 'quote', 'delivery_note'].forEach((type) => {
        const templateType = type as keyof typeof DEFAULT_TEMPLATES;
        loadedTemplates[type] = {
          id: `${type}_template`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Template`,
          content: data?.[`${type}_template` as keyof typeof data] || DEFAULT_TEMPLATES[templateType],
          variables: TEMPLATE_VARIABLES[templateType],
          template_type: templateType
        };
      });

      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveTemplate = async (templateType: string, content: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .update({ [`${templateType}_template`]: content })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setTemplates(prev => ({
        ...prev,
        [templateType]: {
          ...prev[templateType],
          content
        }
      }));

      toast({
        title: "Template Saved",
        description: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetTemplate = (templateType: string) => {
    const defaultContent = DEFAULT_TEMPLATES[templateType as keyof typeof DEFAULT_TEMPLATES];
    setTemplates(prev => ({
      ...prev,
      [templateType]: {
        ...prev[templateType],
        content: defaultContent
      }
    }));
  };

  const insertVariable = (variable: string) => {
    const template = templates[activeTemplate];
    if (!template) return;

    const textarea = document.querySelector(`textarea[data-template="${activeTemplate}"]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = template.content;
    const newContent = content.substring(0, start) + variable + content.substring(end);
    
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: {
        ...prev[activeTemplate],
        content: newContent
      }
    }));

    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      textarea.focus();
    }, 0);
  };

  const getPreviewContent = (content: string) => {
    // Replace variables with sample data for preview
    const sampleData: Record<string, string> = {
      '{{company_name}}': 'Sample Company Ltd.',
      '{{company_address}}': '123 Business Street, City, State 12345',
      '{{company_phone}}': '+1 (555) 123-4567',
      '{{company_email}}': 'info@samplecompany.com',
      '{{receipt_number}}': 'RCP-2024-001',
      '{{invoice_number}}': 'INV-2024-001',
      '{{quote_number}}': 'QT-2024-001',
      '{{delivery_note_number}}': 'DN-2024-001',
      '{{date}}': new Date().toLocaleDateString(),
      '{{time}}': new Date().toLocaleTimeString(),
      '{{customer_name}}': 'John Doe',
      '{{customer_phone}}': '+1 (555) 987-6543',
      '{{customer_email}}': 'john.doe@email.com',
      '{{cashier_name}}': 'Jane Smith',
      '{{items}}': 'Product A x2     $20.00\nProduct B x1     $15.00',
      '{{subtotal}}': '$35.00',
      '{{tax_amount}}': '$3.50',
      '{{total_amount}}': '$38.50',
      '{{receipt_header}}': 'Welcome to our store!',
      '{{receipt_footer}}': 'Thank you for shopping with us!'
    };

    let preview = content;
    Object.entries(sampleData).forEach(([variable, value]) => {
      preview = preview.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return preview;
  };

  const currentTemplate = templates[activeTemplate];

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-5 w-5 text-primary" />
          Document Template Editor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTemplate} onValueChange={(value) => setActiveTemplate(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="receipt">Receipt</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="quote">Quote</TabsTrigger>
            <TabsTrigger value="delivery_note">Delivery Note</TabsTrigger>
          </TabsList>

          {(['receipt', 'invoice', 'quote', 'delivery_note'] as const).map((templateType) => (
            <TabsContent key={templateType} value={templateType} className="space-y-4">
              {currentTemplate && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">
                      {currentTemplate.name}
                    </Label>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Template Preview</DialogTitle>
                          </DialogHeader>
                          <div className="bg-muted p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {getPreviewContent(currentTemplate.content)}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetTemplate(templateType)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveTemplate(templateType, currentTemplate.content)}
                        disabled={isLoading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3">
                      <Label>Template Content</Label>
                      <Textarea
                        data-template={templateType}
                        value={currentTemplate.content}
                        onChange={(e) => setTemplates(prev => ({
                          ...prev,
                          [templateType]: {
                            ...prev[templateType],
                            content: e.target.value
                          }
                        }))}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="Enter your template content..."
                      />
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Available Variables
                      </Label>
                      <div className="mt-2 space-y-2 max-h-[400px] overflow-y-auto">
                        {currentTemplate.variables.map((variable) => (
                          <Badge
                            key={variable}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground w-full justify-start text-xs"
                            onClick={() => insertVariable(variable)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Tips:</strong>
                      <br />
                      • Click on any variable to insert it at your cursor position
                      • Use the Preview button to see how your template will look with sample data
                      • Variables will be automatically replaced with actual data when documents are generated
                      • You can use HTML formatting for advanced styling in some templates
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};