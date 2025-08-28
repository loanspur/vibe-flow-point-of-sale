import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Send, Download, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InvoiceGeneratorProps {
  saleId: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  saleItems: any[];
  onInvoiceGenerated?: (invoiceId: string) => void;
  onClose?: () => void;
}

export function InvoiceGenerator({
  saleId,
  customerId,
  customerName,
  totalAmount,
  saleItems,
  onInvoiceGenerated,
  onClose
}: InvoiceGeneratorProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null);

  // Set default due date to 30 days from now
  React.useEffect(() => {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    setDueDate(defaultDueDate.toISOString().split('T')[0]);
  }, []);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `INV-${timestamp}-${random}`;
  };

  const generateInvoice = async () => {
    if (!tenantId || !saleId || !customerId) {
      toast({
        title: "Error",
        description: "Missing required data for invoice generation",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate invoice number if not provided
      const finalInvoiceNumber = invoiceNumber || generateInvoiceNumber();

      // Create invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          customer_id: customerId,
          sale_id: saleId,
          invoice_number: finalInvoiceNumber,
          invoice_date: new Date().toISOString(),
          due_date: dueDate,
          total_amount: totalAmount,
          balance_amount: totalAmount, // Initially unpaid
          status: 'pending',
          notes: notes,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItemsData = saleItems.map(item => ({
        invoice_id: invoice.id,
        sale_item_id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsData);

      if (itemsError) throw itemsError;

      // Update customer credit balance
      const { error: creditError } = await supabase
        .from('contacts')
        .update({
          current_credit_balance: supabase.rpc('increment', { 
            column: 'current_credit_balance', 
            value: totalAmount 
          })
        })
        .eq('id', customerId);

      if (creditError) {
        console.error('Error updating credit balance:', creditError);
        // Don't throw here as invoice was created successfully
      }

      setGeneratedInvoiceId(invoice.id);

      toast({
        title: "Invoice Generated",
        description: `Invoice ${finalInvoiceNumber} has been created successfully`,
      });

      if (onInvoiceGenerated) {
        onInvoiceGenerated(invoice.id);
      }

    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendInvoiceEmail = async () => {
    if (!generatedInvoiceId) return;

    try {
      // Import communication service
      const { UnifiedCommunicationService } = await import('@/lib/unifiedCommunicationService');
      const service = new UnifiedCommunicationService(tenantId || '', 'user', false);
      
      await service.sendInvoiceNotification({
        invoice_id: generatedInvoiceId,
        customer_id: customerId,
        customer_name: customerName,
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        due_date: dueDate
      });

      toast({
        title: "Invoice Sent",
        description: "Invoice has been sent to the customer via email",
      });
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Error",
        description: "Failed to send invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendInvoiceSMS = async () => {
    if (!generatedInvoiceId) return;

    try {
      // Import communication service
      const { UnifiedCommunicationService } = await import('@/lib/unifiedCommunicationService');
      const service = new UnifiedCommunicationService(tenantId || '', 'user', false);
      
      await service.sendInvoiceSMS({
        invoice_id: generatedInvoiceId,
        customer_id: customerId,
        customer_name: customerName,
        invoice_number: invoiceNumber,
        total_amount: totalAmount,
        due_date: dueDate
      });

      toast({
        title: "SMS Sent",
        description: "Invoice notification has been sent via SMS",
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Error",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadInvoice = async () => {
    if (!generatedInvoiceId) return;

    try {
      // Generate PDF invoice
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: generatedInvoiceId }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber || 'generated'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Invoice Downloaded",
        description: "Invoice PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Invoice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="invoice-number">Invoice Number</Label>
            <Input
              id="invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Auto-generated if empty"
            />
          </div>
          <div>
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="invoice-notes">Notes (Optional)</Label>
          <Textarea
            id="invoice-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes for the invoice"
            rows={3}
          />
        </div>

        {/* Invoice Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Invoice Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-bold">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Items:</span>
              <span>{saleItems.length} items</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!generatedInvoiceId ? (
          <Button 
            onClick={generateInvoice}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Invoice...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Invoice
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <Badge variant="default" className="bg-green-100 text-green-800">
                Invoice Generated Successfully
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={downloadInvoice}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              
              <Button 
                onClick={sendInvoiceEmail}
                variant="outline"
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
            
            <Button 
              onClick={sendInvoiceSMS}
              variant="outline"
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
            
            {onClose && (
              <Button 
                onClick={onClose}
                className="w-full"
              >
                Close
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



