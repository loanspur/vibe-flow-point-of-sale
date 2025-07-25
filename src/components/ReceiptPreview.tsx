import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrencySettings } from "@/lib/currency";

interface Sale {
  id: string;
  receipt_number: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: string;
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
  const [items, setItems] = useState<(SaleItem | QuoteItem)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: "VibePOS",
    address: "123 Business Street",
    city: "Business City, BC 12345",
    phone: "(555) 123-4567",
    email: "info@vibepos.com",
    website: "www.vibepos.com"
  });
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { formatAmount } = useCurrencySettings();

  const document = sale || quote;

  useEffect(() => {
    if (isOpen && document) {
      fetchItems();
    }
  }, [isOpen, document]);

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
                body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
                .receipt { max-width: 400px; margin: 0 auto; }
                .center { text-align: center; }
                .right { text-align: right; }
                .bold { font-weight: bold; }
                .separator { border-top: 1px dashed #000; margin: 10px 0; }
                .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
                .no-print { display: none; }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none !important; }
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

  const handleDownload = () => {
    if (receiptRef.current) {
      const documentNumber = sale?.receipt_number || quote?.quote_number;
      const content = receiptRef.current.innerHTML;
      const blob = new Blob([`
        <html>
          <head>
            <title>${type === "receipt" ? "Receipt" : type === "quote" ? "Quote" : "Invoice"} - ${documentNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 600px; margin: 0 auto; }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .separator { border-top: 1px solid #000; margin: 15px 0; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `], { type: 'text/html' });
      
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${type}-${documentNumber}.html`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
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

  if (!document) return null;

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

        <div ref={receiptRef} className="receipt bg-white p-6 border rounded-lg">
          {/* Header */}
          <div className="center mb-6">
            <h1 className="text-2xl font-bold text-primary">{companyInfo.name}</h1>
            <p className="text-sm text-muted-foreground">{companyInfo.address}</p>
            <p className="text-sm text-muted-foreground">{companyInfo.city}</p>
            <p className="text-sm text-muted-foreground">
              {companyInfo.phone} | {companyInfo.email}
            </p>
            <p className="text-sm text-muted-foreground">{companyInfo.website}</p>
          </div>

          <Separator className="my-4" />

          {/* Document Type and Number */}
          <div className="center mb-4">
            <h2 className="text-xl font-bold">{getTitle().toUpperCase()}</h2>
            <p className="text-lg font-mono">{sale?.receipt_number || quote?.quote_number}</p>
            <Badge className={getStatusColor(document.status)}>
              {document.status.toUpperCase()}
            </Badge>
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p><span className="font-semibold">Date:</span> {formatDate(document.created_at)}</p>
              <p><span className="font-semibold">Customer:</span> {document.customers?.name || "Walk-in Customer"}</p>
              {document.customers?.email && (
                <p><span className="font-semibold">Email:</span> {document.customers.email}</p>
              )}
              {document.customers?.phone && (
                <p><span className="font-semibold">Phone:</span> {document.customers.phone}</p>
              )}
            </div>
            <div>
              {type === "receipt" && sale?.payment_method && (
                <p><span className="font-semibold">Payment:</span> {sale.payment_method.toUpperCase()}</p>
              )}
              {document.profiles?.full_name && (
                <p><span className="font-semibold">Cashier:</span> {document.profiles.full_name}</p>
              )}
              {type === "quote" && quote?.valid_until && (
                <p><span className="font-semibold">Valid Until:</span> {formatDate(quote.valid_until)}</p>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Items */}
          <div className="mb-4">
            <div className="flex justify-between font-semibold mb-2 text-sm">
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Total</span>
            </div>
            <Separator className="mb-2" />
            
            {isLoading ? (
              <p className="text-center py-4">Loading items...</p>
            ) : (
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="flex-1 font-medium">
                        {item.products.name}
                        {"product_variants" in item && item.product_variants && (
                          <span className="text-muted-foreground ml-2">
                            ({item.product_variants.name}: {item.product_variants.value})
                          </span>
                        )}
                      </span>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <span className="w-20 text-right">{formatAmount(item.unit_price)}</span>
                      <span className="w-24 text-right font-medium">{formatAmount(item.total_price)}</span>
                    </div>
                    {item.products.sku && (
                      <div className="text-xs text-muted-foreground ml-2">SKU: {item.products.sku}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatAmount(calculateSubtotal())}</span>
            </div>
            
            {document.discount_amount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="text-red-600">-{formatAmount(document.discount_amount)}</span>
              </div>
            )}
            
            {document.tax_amount > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatAmount(document.tax_amount)}</span>
              </div>
            )}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatAmount(document.total_amount)}</span>
            </div>
          </div>

          {/* Notes for quotes */}
          {type === "quote" && quote?.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="font-semibold text-sm mb-2">Notes:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            </>
          )}

          {/* Footer */}
          <Separator className="my-6" />
          
          <div className="center text-xs text-muted-foreground space-y-1">
            <p>Thank you for your business!</p>
            {type === "quote" && (
              <p className="font-medium">This quote is valid until {quote?.valid_until ? formatDate(quote.valid_until) : "further notice"}</p>
            )}
            {type === "receipt" && (
              <p>Please keep this receipt for your records</p>
            )}
            <p>Powered by VibePOS - Modern Point of Sale Solution</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}