import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrencySettings } from "@/lib/currency";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Sale {
  id: string;
  receipt_number: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: string;
  amount_paid?: number;
  change_amount?: number;
  status: string;
  created_at: string;
  customer_id?: string;
  cashier_id: string;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name: string;
    sku?: string;
  };
}

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  status: string;
  valid_until: string | null;
  created_at: string;
  notes?: string;
  customer_id?: string;
  cashier_id: string;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface QuoteItem {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name: string;
    sku?: string;
  };
  product_variants?: {
    name: string;
    value: string;
  };
}

interface ReceiptPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  sale?: Sale;
  quote?: Quote;
  type: "receipt" | "quote" | "invoice";
}

export function ReceiptPreview({ isOpen, onClose, sale, quote, type }: ReceiptPreviewProps) {
  const { tenantId } = useAuth();
  const [items, setItems] = useState<(SaleItem | QuoteItem)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { formatAmount } = useCurrencySettings();

  const document = sale || quote;

  useEffect(() => {
    if (isOpen && document) {
      fetchBusinessSettings();
      fetchItems();
    }
  }, [isOpen, document]);

  const fetchBusinessSettings = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select(`
          company_name,
          email,
          phone,
          website,
          address_line_1,
          address_line_2,
          city,
          state_province,
          postal_code,
          country,
          receipt_header,
          receipt_footer,
          receipt_logo_url,
          company_logo_url,
          receipt_template
        `)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      setBusinessSettings(data);
    } catch (error: any) {
      console.error('Error fetching business settings:', error);
      // Use fallback data if settings not found
      setBusinessSettings({
        company_name: "VibePOS",
        address_line_1: "123 Business Street",
        city: "Business City",
        phone: "(555) 123-4567",
        email: "info@vibepos.com",
        website: "www.vibepos.com",
        receipt_header: "",
        receipt_footer: "Thank you for your business!"
      });
    }
  };

  const fetchItems = async () => {
    if (!document) return;
    
    setIsLoading(true);
    try {
      if (type === "receipt" && sale) {
        const { data, error } = await supabase
          .from("sale_items")
          .select(`
            *,
            products (name, sku)
          `)
          .eq("sale_id", sale.id);

        if (error) throw error;
        setItems(data || []);
      } else if ((type === "quote" || type === "invoice") && quote) {
        const { data, error } = await supabase
          .from("quote_items")
          .select(`
            *,
            products (name, sku),
            product_variants (name, value)
          `)
          .eq("quote_id", quote.id);

        if (error) throw error;
        setItems(data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handlePrint = () => {
    if (receiptRef.current) {
      const documentNumber = sale?.receipt_number || quote?.quote_number;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${type === "receipt" ? "Receipt" : type === "quote" ? "Quote" : "Invoice"} - ${documentNumber}</title>
              <style>
                 @page { margin: 0; size: 80mm auto; }
                body { 
                  font-family: 'Courier New', monospace; 
                  font-size: 16px;
                  font-weight: bold;
                  margin: 0; 
                  padding: 2mm;
                  width: 76mm;
                  line-height: 1.4;
                  color: #000000;
                }
                .thermal-receipt { width: 100%; }
                .center { text-align: center; }
                .right { text-align: right; }
                .left { text-align: left; }
                .bold { font-weight: 900; }
                .large { font-size: 18px; font-weight: 900; }
                .small { font-size: 14px; }
                .separator { 
                  border-top: 1px dashed #000; 
                  margin: 3px 0; 
                  width: 100%;
                }
                .item-line { 
                  display: flex; 
                  justify-content: space-between; 
                  margin: 1px 0; 
                }
                .item-header .item-line {
                  font-weight: 900;
                  border-bottom: 1px solid #000;
                  padding-bottom: 2px;
                  margin-bottom: 3px;
                }
                .item-row .item-line {
                  align-items: flex-start;
                }
                .item-name { 
                  flex: 1; 
                  white-space: nowrap; 
                  overflow: hidden; 
                  text-overflow: ellipsis; 
                  margin-right: 8px;
                }
                .qty-price { 
                  white-space: nowrap; 
                  text-align: right; 
                  min-width: 60px;
                }
                .total-line { 
                  display: flex; 
                  justify-content: space-between; 
                  font-weight: bold; 
                }
                .company-info { margin-bottom: 8px; }
                .document-info { margin: 8px 0; }
                .items-section { margin: 8px 0; }
                .totals-section { margin: 8px 0; }
                .footer-section { margin-top: 8px; }
                  @media print {
                  body { 
                    width: 76mm;
                    font-size: 16px;
                    font-weight: bold;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                  }
                  .no-print { display: none !important; }
                  * { font-weight: bold !important; }
                  pre { font-size: 16px !important; font-weight: 900 !important; }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = async () => {
    if (receiptRef.current) {
      const documentNumber = sale?.receipt_number || quote?.quote_number;
      const node = receiptRef.current as HTMLElement;
      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40; // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, Math.min(imgHeight, pageHeight - 40), undefined, 'FAST');
      pdf.save(`${type}-${documentNumber}.pdf`);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "receipt": return "Receipt";
      case "quote": return "Quote";
      case "invoice": return "Invoice";
      default: return "Document";
    }
  };

  const renderTemplateReceipt = () => {
    // Always use modern template design
    const defaultTemplate = `{{receipt_header}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            {{company_name}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 {{company_address}}
📞 {{company_phone}}  ✉️ {{company_email}}

┌─────────────────────────────────────────┐
│                RECEIPT                  │
│              #{{receipt_number}}        │
└─────────────────────────────────────────┘

🗓️  {{date}} ⏰ {{time}}
👤 Cashier: {{cashier_name}}
👥 Customer: {{customer_name}}
📞 {{customer_phone}}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃               ITEMS                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

{{items}}

┌─────────────────────────────────────────┐
│ 💰 PAYMENT SUMMARY                     │
├─────────────────────────────────────────┤
│ Subtotal:              {{subtotal}}     │
│ Discount:             {{discount_amount}}│
│ Tax:                  {{tax_amount}}    │
├─────────────────────────────────────────┤
│ 🎯 TOTAL:             {{total_amount}}  │
└─────────────────────────────────────────┘

💳 Payment Method: {{payment_method}}
💵 Amount Paid: {{amount_paid}}
💴 Change: {{change_amount}}

{{receipt_footer}}

✨ Thank you for choosing us! ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Powered by VibePOS | 📱 0727638940
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    // Use stored template or default modern template
    let templateContent = businessSettings?.receipt_template && businessSettings.receipt_template !== 'standard' 
      ? businessSettings.receipt_template 
      : defaultTemplate;
    
    // Replace template variables with actual data
    const replacements: Record<string, string> = {
      '{{company_name}}': businessSettings?.company_name || "VibePOS",
      '{{company_address}}': [
        businessSettings?.address_line_1,
        businessSettings?.address_line_2,
        [businessSettings?.city, businessSettings?.state_province, businessSettings?.postal_code].filter(Boolean).join(', '),
        businessSettings?.country
      ].filter(Boolean).join('\n'),
      '{{company_phone}}': businessSettings?.phone || '',
      '{{company_email}}': businessSettings?.email || '',
      '{{receipt_number}}': sale?.receipt_number || quote?.quote_number || '',
      '{{date}}': formatDate(document?.created_at || ''),
      '{{time}}': new Date(document?.created_at || '').toLocaleTimeString(),
      '{{cashier_name}}': document?.profiles?.full_name || '',
      '{{customer_name}}': document?.customers?.name || "Walk-in Customer",
      '{{customer_phone}}': document?.customers?.phone || '',
      '{{customer_email}}': document?.customers?.email || '',
      '{{items}}': formatItemsForTemplate(),
      '{{subtotal}}': formatAmount(calculateSubtotal()),
      '{{tax_amount}}': formatAmount(document?.tax_amount || 0),
      '{{discount_amount}}': formatAmount(document?.discount_amount || 0),
      '{{total_amount}}': formatAmount(document?.total_amount || 0),
      '{{payment_method}}': type === "receipt" && sale?.payment_method ? sale.payment_method.toUpperCase() : '',
      '{{amount_paid}}': type === "receipt" && sale?.amount_paid ? formatAmount(sale.amount_paid) : '',
      '{{change_amount}}': type === "receipt" && sale?.change_amount ? formatAmount(sale.change_amount) : '',
      '{{receipt_header}}': businessSettings?.receipt_header || 'Welcome to our store!',
      '{{receipt_footer}}': businessSettings?.receipt_footer || 'Thank you for shopping with us!'
    };

    Object.entries(replacements).forEach(([variable, value]) => {
      templateContent = templateContent.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return (
      <div className="thermal-receipt bg-white p-6 border rounded-lg">
        <pre className="whitespace-pre-wrap font-mono text-base leading-relaxed font-bold">
          {templateContent}
        </pre>
      </div>
    );
  };

  const formatItemsForTemplate = () => {
    if (isLoading) return "Loading items...";
    
    const itemLines = items.map((item) => {
      const itemName = item.products.name;
      const variantInfo = "product_variants" in item && item.product_variants 
        ? ` (${item.product_variants.name}: ${item.product_variants.value})`
        : '';
      const fullItemName = `${itemName}${variantInfo}`;
      
      // Use modern emoji and formatting
      const emoji = ['📦', '🖱️', '⌨️', '🎧', '📱', '💻', '🖥️', '🔌'][Math.floor(Math.random() * 8)];
      
      const qtyStr = item.quantity.toString().padStart(2);
      const rateStr = formatAmount(item.unit_price).padStart(10);
      const totalStr = formatAmount(item.total_price).padStart(10);
      
      return `${emoji} ${fullItemName.padEnd(25)} │ ${qtyStr} │ ${rateStr} │ ${totalStr}`;
    });

    return itemLines.join('\n');
  };

  const renderStandardReceipt = () => {
    return (
      <div className="thermal-receipt bg-white p-6 border rounded-lg">
        {/* Custom Header */}
        {businessSettings.receipt_header && (
          <div className="company-info center">
            <div className="small">{businessSettings.receipt_header}</div>
          </div>
        )}

        {/* Logo */}
        {(businessSettings.receipt_logo_url || businessSettings.company_logo_url) && (
          <div className="company-info center">
            <img src={businessSettings.receipt_logo_url || businessSettings.company_logo_url} alt={`${businessSettings.company_name || 'Company'} logo`} style={{ height: '40px', margin: '0 auto' }} />
          </div>
        )}

        {/* Company Header */}
        <div className="company-info center">
          <div className="bold large">{businessSettings.company_name || "VibePOS"}</div>
          {businessSettings.address_line_1 && (
            <div className="small">{businessSettings.address_line_1}</div>
          )}
          {businessSettings.address_line_2 && (
            <div className="small">{businessSettings.address_line_2}</div>
          )}
          <div className="small">
            {[businessSettings.city, businessSettings.state_province, businessSettings.postal_code].filter(Boolean).join(', ')}
            {businessSettings.country && `, ${businessSettings.country}`}
          </div>
          {businessSettings.phone && <div className="small">{businessSettings.phone}</div>}
          {businessSettings.email && <div className="small">{businessSettings.email}</div>}
          {businessSettings.website && <div className="small">{businessSettings.website}</div>}
        </div>

        <div className="separator"></div>

        {/* Document Type and Number */}
        <div className="document-info center">
          <div className="bold large">{getTitle().toUpperCase()}</div>
          <div className="bold">{sale?.receipt_number || quote?.quote_number}</div>
          <div className="small">{document.status.toUpperCase()}</div>
        </div>

        <div className="separator"></div>

        {/* Document Details */}
        <div className="document-info small">
          <div>Date: {formatDate(document.created_at)}</div>
          <div>Customer: {document.customers?.name || "Walk-in Customer"}</div>
          {document.customers?.phone && (
            <div>Phone: {document.customers.phone}</div>
          )}
          {type === "receipt" && sale?.payment_method && (
            <div>Payment: {sale.payment_method.toUpperCase()}</div>
          )}
          {document.profiles?.full_name && (
            <div>Cashier: {document.profiles.full_name}</div>
          )}
          {type === "quote" && quote?.valid_until && (
            <div>Valid Until: {formatDate(quote.valid_until)}</div>
          )}
        </div>

        <div className="separator"></div>

        {/* Items with proper columns */}
        <div className="items-section">
          {isLoading ? (
            <div className="center">Loading items...</div>
          ) : (
            <div>
              {/* Header */}
              <div className="item-header bold small">
                <div className="item-line">
                  <div style={{ width: '45%' }}>Item Details</div>
                  <div style={{ width: '15%', textAlign: 'center' }}>Qty</div>
                  <div style={{ width: '20%', textAlign: 'right' }}>Rate</div>
                  <div style={{ width: '20%', textAlign: 'right' }}>Total</div>
                </div>
              </div>
              <div className="separator"></div>
              
              {/* Items */}
              {items.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="item-line small">
                    <div style={{ width: '45%' }}>
                      <div>{item.products.name}</div>
                      {"product_variants" in item && item.product_variants && (
                        <div className="small" style={{ opacity: 0.8 }}>
                          ({item.product_variants.name}: {item.product_variants.value})
                        </div>
                      )}
                      {item.products.sku && (
                        <div className="small" style={{ opacity: 0.7 }}>
                          SKU: {item.products.sku}
                        </div>
                      )}
                    </div>
                    <div style={{ width: '15%', textAlign: 'center' }}>{item.quantity}</div>
                    <div style={{ width: '20%', textAlign: 'right' }}>{formatAmount(item.unit_price)}</div>
                    <div style={{ width: '20%', textAlign: 'right' }}>{formatAmount(item.total_price)}</div>
                  </div>
                  <div style={{ height: '3px' }}></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="separator"></div>

        {/* Totals */}
        <div className="totals-section">
          <div className="item-line">
            <div>Subtotal:</div>
            <div>{formatAmount(calculateSubtotal())}</div>
          </div>
          
          {document.discount_amount > 0 && (
            <div className="item-line">
              <div>Discount:</div>
              <div>-{formatAmount(document.discount_amount)}</div>
            </div>
          )}
          
          {document.tax_amount > 0 && (
            <div className="item-line">
              <div>Tax:</div>
              <div>{formatAmount(document.tax_amount)}</div>
            </div>
          )}
          
          <div className="separator"></div>
          
          <div className="total-line large">
            <div>TOTAL:</div>
            <div>{formatAmount(document.total_amount)}</div>
          </div>
        </div>

        {/* Notes for quotes */}
        {type === "quote" && quote?.notes && (
          <>
            <div className="separator"></div>
            <div className="small">
              <div className="bold">Notes:</div>
              <div>{quote.notes}</div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="separator"></div>
        
        <div className="footer-section center small">
          {/* Custom Footer */}
          {businessSettings.receipt_footer ? (
            <div>{businessSettings.receipt_footer}</div>
          ) : (
            <div>Thank you for your business!</div>
          )}
          
          {type === "quote" && (
            <div className="bold">Valid until {quote?.valid_until ? formatDate(quote.valid_until) : "further notice"}</div>
          )}
          {type === "receipt" && (
            <div>Please keep this receipt</div>
          )}
          <div style={{ marginTop: '5px' }}>Powered by VibePOS</div>
        </div>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "accepted": return "bg-purple-100 text-purple-800";
      case "converted": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!document || !businessSettings) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{getTitle()} Preview</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div ref={receiptRef}>
          {renderTemplateReceipt()}
        </div>
      </DialogContent>
    </Dialog>
  );
}