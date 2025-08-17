import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, Loader2, FileText, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEmailService } from "@/hooks/useEmailService";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  receipt_number: string;
  total_amount: number;
  discount_amount: number | null;
  tax_amount: number | null;
  status: string;
  created_at: string;
  customer_id?: string;
  contacts?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  notes?: string;
}

interface InvoiceEmailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceEmailDialog({ invoice, open, onOpenChange }: InvoiceEmailDialogProps) {
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [publicViewUrl, setPublicViewUrl] = useState("");
  const [publicDownloadUrl, setPublicDownloadUrl] = useState("");
  
  const { toast } = useToast();
  const { sendInvoiceNotificationEmail } = useEmailService();

  useEffect(() => {
    if (invoice && open) {
      // Pre-fill email data
      setEmailData({
        to: invoice.contacts?.email || "",
        subject: `Invoice ${invoice.receipt_number} - ${formatCurrency(invoice.total_amount)}`,
        message: generateDefaultMessage(),
        priority: "medium"
      });

      // Generate public URLs for invoice viewing and downloading
      generatePublicUrls();
    }
  }, [invoice, open]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const generateDefaultMessage = () => {
    if (!invoice) return "";
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Default 30-day terms
    
    return `Dear ${invoice.contacts?.name || "Valued Customer"},

Please find attached your invoice ${invoice.receipt_number} for ${formatCurrency(invoice.total_amount)}.

Invoice Details:
• Invoice Number: ${invoice.receipt_number}
• Issue Date: ${new Date(invoice.created_at).toLocaleDateString()}
• Due Date: ${dueDate.toLocaleDateString()}
• Amount Due: ${formatCurrency(invoice.total_amount)}

You can view and download your invoice using the links provided in this email.

Payment Instructions:
Please remit payment within 30 days of the invoice date. If you have any questions about this invoice, please contact us.

Thank you for your business!

Best regards,
Your Account Team`;
  };

  const generatePublicUrls = async () => {
    if (!invoice) return;

    try {
      const baseUrl = window.location.origin;
      const viewUrl = `${baseUrl}/api/public-invoice-viewer?invoice_id=${invoice.id}&action=view`;
      const downloadUrl = `${baseUrl}/api/public-invoice-viewer?invoice_id=${invoice.id}&action=download`;
      
      setPublicViewUrl(viewUrl);
      setPublicDownloadUrl(downloadUrl);
    } catch (error) {
      console.error("Error generating public URLs:", error);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice || !emailData.to.trim()) {
      toast({
        title: "Error",
        description: "Please provide a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create enhanced message with public URLs
      const enhancedMessage = `${emailData.message}

---

📄 **View Your Invoice Online:**
${publicViewUrl}

⬇️ **Download PDF:**
${publicDownloadUrl}

This invoice can be accessed without login. Please save these links for your records.`;

      // Send email using unified service
      await sendInvoiceNotificationEmail(
        emailData.to,
        invoice.contacts?.name || "Valued Customer",
        {
          invoiceNumber: invoice.receipt_number,
          totalAmount: formatCurrency(invoice.total_amount),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          invoiceUrl: publicViewUrl,
        }
      );

      // Update invoice status to sent if it was draft
      if (invoice.status === "pending") {
        await supabase
          .from("sales")
          .update({ 
            status: "sent",
            updated_at: new Date().toISOString()
          })
          .eq("id", invoice.id);
      }

      toast({
        title: "Email Sent Successfully",
        description: `Invoice email sent to ${emailData.to}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error sending invoice email:", error);
      toast({
        title: "Email Failed",
        description: "Failed to send invoice email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invoice Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Invoice {invoice.receipt_number}</h3>
              <Badge variant="outline">
                {formatCurrency(invoice.total_amount)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Customer: {invoice.contacts?.name || "Walk-in Customer"}</p>
              <p>Created: {new Date(invoice.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Public Access URLs */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Public Access Links</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700">View Online:</span>
                <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                  {publicViewUrl}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700">Download PDF:</span>
                <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                  {publicDownloadUrl}
                </code>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              These links will be included in the email and don't require login
            </p>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-to">Recipient Email *</Label>
              <Input
                id="email-to"
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                placeholder="customer@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="email-subject">Subject *</Label>
              <Input
                id="email-subject"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Invoice subject line"
                required
              />
            </div>

            <div>
              <Label htmlFor="email-priority">Priority</Label>
              <Select
                value={emailData.priority}
                onValueChange={(value: "low" | "medium" | "high" | "urgent") => 
                  setEmailData({ ...emailData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                placeholder="Enter your message..."
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Public access links will be automatically added to the email
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isLoading || !emailData.to.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Invoice Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}