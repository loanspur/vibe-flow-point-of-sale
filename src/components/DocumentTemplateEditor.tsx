import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Eye, Save, RotateCcw, Info, Plus, Split, Maximize2, Minimize2, Copy, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            {{company_name}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{company_address}}
{{company_phone}}          {{company_email}}

┌─────────────────────────────────────────┐
│                RECEIPT                  │
│              #{{receipt_number}}        │
└─────────────────────────────────────────┘
Date: {{date}}              Time: {{time}}
Cashier: {{cashier_name}}

Customer: {{customer_name}}
Phone: {{customer_phone}}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃               ITEMS                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
{{items}}

Subtotal:      {{subtotal}}    Tax: {{tax_amount}}
Discount:    {{discount_amount}}   TOTAL: {{total_amount}}

Payment: {{payment_method}}    Paid: {{amount_paid}}
Change: {{change_amount}}

{{receipt_footer}}

Thank you for choosing us!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by VibePOS | 0727638940
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
  invoice: `{{company_logo}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
             {{company_name}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{company_address}}
{{company_phone}}          {{company_email}}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                INVOICE                 ┃
┃              #{{invoice_number}}       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
Invoice Date: {{invoice_date}}      Due: {{due_date}}

┌──── BILL TO ────┐     ┌──── FROM ────┐
│ {{customer_name}}       │ {{company_name}}      │
│ {{customer_address}}    │ {{company_address}}   │
│ {{customer_phone}}      │ {{company_phone}}     │
│ {{customer_email}}      │ {{company_email}}     │
└─────────────────┘     └─────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                ITEMS                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
{{items}}

Subtotal: {{subtotal}}    Discount: {{discount_amount}}
Tax: {{tax_amount}}       TOTAL: {{total_amount}}

Terms: {{terms_conditions}}
Notes: {{notes}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by VibePOS | 0727638940
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
  quote: `{{company_logo}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
             {{company_name}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{company_address}}
{{company_phone}}          {{company_email}}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃               QUOTATION                ┃
┃              #{{quote_number}}         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
Quote Date: {{quote_date}}    Valid Until: {{valid_until}}

┌──── QUOTE FOR ────┐     ┌──── FROM ────┐
│ {{customer_name}}       │ {{company_name}}      │
│ {{customer_address}}    │ {{company_address}}   │
│ {{customer_phone}}      │ {{company_phone}}     │
│ {{customer_email}}      │ {{company_email}}     │
└───────────────────┘     └─────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                ITEMS                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
{{items}}

Subtotal: {{subtotal}}    Discount: {{discount_amount}}
Tax: {{tax_amount}}       TOTAL: {{total_amount}}

Terms: {{terms_conditions}}
Notes: {{notes}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by VibePOS | 0727638940
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
  delivery_note: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            {{company_name}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{company_address}}
{{company_phone}}          {{company_email}}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃             DELIVERY NOTE             ┃
┃           #{{delivery_note_number}}   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
Date: {{delivery_date}}

┌─── DELIVER TO ───┐     ┌─── CUSTOMER ───┐
│ {{delivery_address}}   │ {{customer_name}}     │
│                        │ {{customer_phone}}    │
│                        │ {{customer_email}}    │
└──────────────────┘     └───────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃               ITEMS                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
{{items}}

Driver: {{driver_name}}    Vehicle: {{vehicle_number}}

Notes: {{notes}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by VibePOS | 0727638940
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
};

const SAMPLE_DATA: Record<string, string> = {
  '{{company_name}}': 'Sample Company Ltd.',
  '{{company_address}}': '123 Business Street, City, State 12345',
  '{{company_phone}}': '+1 (555) 123-4567',
  '{{company_email}}': 'info@samplecompany.com',
  '{{company_logo}}': '[COMPANY LOGO]',
  '{{receipt_number}}': 'RCP-2024-001',
  '{{invoice_number}}': 'INV-2024-001',
  '{{quote_number}}': 'QT-2024-001',
  '{{delivery_note_number}}': 'DN-2024-001',
  '{{date}}': new Date().toLocaleDateString(),
  '{{time}}': new Date().toLocaleTimeString(),
  '{{invoice_date}}': new Date().toLocaleDateString(),
  '{{due_date}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  '{{quote_date}}': new Date().toLocaleDateString(),
  '{{valid_until}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  '{{delivery_date}}': new Date().toLocaleDateString(),
  '{{customer_name}}': 'John Doe',
  '{{customer_address}}': '456 Customer Avenue, Customer City, CS 67890',
  '{{customer_phone}}': '+1 (555) 987-6543',
  '{{customer_email}}': 'john.doe@email.com',
  '{{delivery_address}}': '456 Customer Avenue, Customer City, CS 67890',
  '{{cashier_name}}': 'Jane Smith',
  '{{driver_name}}': 'Mike Wilson',
  '{{vehicle_number}}': 'ABC-123',
  '{{items}}': `📦 Gaming Laptop Pro x1     │  1  │ $1,299.99 │ $1,299.99
🖱️ Wireless Mouse (Black)  │  2  │   $29.99 │    $59.98
⌨️ Mechanical Keyboard     │  1  │   $89.99 │    $89.99
🎧 Headset Premium         │  1  │  $149.99 │   $149.99`,
  '{{subtotal}}': '$40.00',
  '{{tax_amount}}': '$4.00',
  '{{discount_amount}}': '$2.00',
  '{{total_amount}}': '$42.00',
  '{{payment_method}}': 'Cash',
  '{{amount_paid}}': '$50.00',
  '{{change_amount}}': '$8.00',
  '{{receipt_header}}': 'Welcome to our store!',
  '{{receipt_footer}}': 'Thank you for shopping with us!',
  '{{terms_conditions}}': 'Payment is due within 30 days. Late payments may incur additional charges.',
  '{{notes}}': 'Thank you for your business. We appreciate your prompt payment.'
};

export const DocumentTemplateEditor: React.FC<DocumentTemplateEditorProps> = ({ tenantId }) => {
  const [templates, setTemplates] = useState<Record<string, DocumentTemplate>>({});
  const [activeTemplate, setActiveTemplate] = useState<'receipt' | 'invoice' | 'quote' | 'delivery_note'>('receipt');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSideBySide, setShowSideBySide] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
    
    // Set up real-time subscription for business settings changes
    const channel = supabase
      .channel('business-settings-template-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_settings',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('Template settings changed:', payload);
          // Reload templates when settings change
          loadTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        const storedTemplate = data?.[`${type}_template` as keyof typeof data];
        
        // Use stored template content if it exists and contains template variables
        let templateContent = DEFAULT_TEMPLATES[templateType];
        
        if (storedTemplate && typeof storedTemplate === 'string' && storedTemplate.includes('{{')) {
          templateContent = storedTemplate;
        } else if (type === 'receipt' && (data?.receipt_header || data?.receipt_footer)) {
          // For receipt templates, inject header/footer into default template
          templateContent = templateContent
            .replace('{{receipt_header}}', data.receipt_header || 'Welcome to our store!')
            .replace('{{receipt_footer}}', data.receipt_footer || 'Thank you for shopping with us!');
        }
        
        loadedTemplates[type] = {
          id: `${type}_template`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Template`,
          content: templateContent,
          variables: TEMPLATE_VARIABLES[templateType],
          template_type: templateType
        };
      });

      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Initialize with defaults if loading fails
      const loadedTemplates: Record<string, DocumentTemplate> = {};
      ['receipt', 'invoice', 'quote', 'delivery_note'].forEach((type) => {
        const templateType = type as keyof typeof DEFAULT_TEMPLATES;
        loadedTemplates[type] = {
          id: `${type}_template`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Template`,
          content: DEFAULT_TEMPLATES[templateType],
          variables: TEMPLATE_VARIABLES[templateType],
          template_type: templateType
        };
      });
      setTemplates(loadedTemplates);
    }
  };

  const saveTemplate = async (templateType: string, content: string) => {
    setIsLoading(true);
    try {
      // First check if business_settings record exists
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!existing) {
        // Create a new business_settings record if it doesn't exist
        const { error: insertError } = await supabase
          .from('business_settings')
          .insert({
            tenant_id: tenantId,
            [`${templateType}_template`]: content
          });
        
        if (insertError) throw insertError;
      } else {
        // Update the existing record
        const { error: updateError } = await supabase
          .from('business_settings')
          .update({ [`${templateType}_template`]: content })
          .eq('tenant_id', tenantId);

        if (updateError) throw updateError;
      }

      setTemplates(prev => ({
        ...prev,
        [templateType]: {
          ...prev[templateType],
          content
        }
      }));

      toast({
        title: "Template Saved",
        description: "Template saved and updated throughout the system!",
      });

      // Force reload templates to reflect changes immediately
      setTimeout(() => {
        loadTemplates();
      }, 100);
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

  const insertVariable = useCallback((variable: string) => {
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
  }, [activeTemplate, templates]);

  const getPreviewContent = useCallback((content: string) => {
    let preview = content;
    Object.entries(SAMPLE_DATA).forEach(([variable, value]) => {
      preview = preview.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    return preview;
  }, []);

  const copyTemplate = () => {
    const template = templates[activeTemplate];
    if (template) {
      navigator.clipboard.writeText(template.content);
      toast({
        title: "Copied",
        description: "Template content copied to clipboard",
      });
    }
  };

  const downloadTemplate = () => {
    const template = templates[activeTemplate];
    if (template) {
      const blob = new Blob([template.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTemplate}_template.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const currentTemplate = templates[activeTemplate];

  const renderEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">
          {currentTemplate?.name}
        </Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSideBySide(!showSideBySide)}
          >
            <Split className="h-4 w-4 mr-2" />
            {showSideBySide ? 'Stack' : 'Side by Side'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${showSideBySide ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Editor Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Template Content</Label>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyTemplate}>
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  Download
                </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetTemplate(activeTemplate)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => saveTemplate(activeTemplate, currentTemplate.content)}
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
          
          <Textarea
            data-template={activeTemplate}
            value={currentTemplate?.content || ''}
            onChange={(e) => setTemplates(prev => ({
              ...prev,
              [activeTemplate]: {
                ...prev[activeTemplate],
                content: e.target.value
              }
            }))}
            className="min-h-[500px] font-mono text-sm resize-none"
            placeholder="Enter your template content..."
          />
          
          {/* Variables Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" />
                Available Variables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="grid grid-cols-2 gap-2">
                  {currentTemplate?.variables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground justify-start text-xs py-1 px-2"
                      onClick={() => insertVariable(variable)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {variable.replace(/[{}]/g, '')}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        {showSideBySide && (
          <div className="space-y-4">
            <Label>Live Preview</Label>
            <Card className="bg-white border">
              <CardContent className="p-6">
                <ScrollArea className="h-[500px]">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">
                    {currentTemplate ? getPreviewContent(currentTemplate.content) : ''}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Live Preview Tips:</strong>
                <br />
                • Preview updates automatically as you type
                • Variables are replaced with sample data
                • Formatting and layout are preserved
                • Use thermal printer formatting for receipts
              </p>
            </div>
          </div>
        )}
      </div>

      {!showSideBySide && (
        <Card className="bg-white border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">
                {currentTemplate ? getPreviewContent(currentTemplate.content) : ''}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Template Editor - {currentTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {renderEditor()}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="receipt">Receipt</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="quote">Quote</TabsTrigger>
            <TabsTrigger value="delivery_note">Delivery Note</TabsTrigger>
          </TabsList>

          {(['receipt', 'invoice', 'quote', 'delivery_note'] as const).map((templateType) => (
            <TabsContent key={templateType} value={templateType}>
              {currentTemplate && renderEditor()}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};