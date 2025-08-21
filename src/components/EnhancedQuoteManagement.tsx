import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  ShoppingCart, 
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  User,
  DollarSign,
  Calendar as CalendarDays,
  Filter,
  RefreshCw,
  CreditCard,
  Receipt,
  Banknote,
  Wallet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedCommunication } from '@/hooks/useUnifiedCommunication';

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  discount_amount: number | null;
  tax_amount: number | null;
  status: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  contact_id?: string;
  cashier_id: string;
  contacts?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
  };
  notes?: string;
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
    image_url?: string;
  };
  product_variants?: {
    name: string;
    value: string;
  };
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  sku?: string;
}

interface InvoicePayment {
  id?: string;
  invoice_id: string;
  payment_amount: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export function EnhancedQuoteManagement() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [showQuoteDetails, setShowQuoteDetails] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    contact_id: "",
    notes: "",
    valid_until: "",
    items: [] as Array<{ product_id: string; quantity: number; unit_price: number; total_price: number }>
  });
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: 0,
    payment_method: "cash",
    reference_number: "",
    notes: ""
  });
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const { tenantId } = useAuth();
  const { sendQuoteNotification, sendInvoiceNotification } = useUnifiedCommunication();

  useEffect(() => {
    fetchQuotes();
    fetchContacts();
    fetchProducts();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data: quotesData, error } = await supabase
        .from("quotes")
        .select("*, contacts(id, name, email, phone, address, company)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setQuotes(quotesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch quotes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("type", "customer")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock_quantity, sku")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchQuoteItems = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select(`
          *,
          products (name, sku, image_url),
          product_variants (name, value)
        `)
        .eq("quote_id", quoteId);

      if (error) throw error;
      setQuoteItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch quote items",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, validUntil?: string | null) => {
    // Check if quote is expired regardless of status
    const expired = validUntil && new Date(validUntil) < new Date();
    
    if (expired && status !== 'converted') {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="destructive" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            EXPIRED
          </Badge>
          {status !== 'draft' && (
            <Badge variant="outline" className="text-xs">
              {status.toUpperCase()}
            </Badge>
          )}
        </div>
      );
    }

    const statusConfig = {
      draft: { variant: "outline" as const, icon: Edit, color: "text-gray-600" },
      sent: { variant: "secondary" as const, icon: Send, color: "text-blue-600" },
      accepted: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      rejected: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
      converted: { variant: "default" as const, icon: ShoppingCart, color: "text-purple-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      icon: AlertCircle,
      color: "text-gray-600"
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="text-xs">
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const createQuote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Generate quote number
      const quoteNumber = `QT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      // Calculate totals
      const subtotal = quoteForm.items.reduce((sum, item) => sum + item.total_price, 0);
      const taxAmount = subtotal * 0.16; // Assuming 16% tax rate
      const totalAmount = subtotal + taxAmount;

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          contact_id: quoteForm.contact_id || null,
          cashier_id: user.id,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          discount_amount: 0,
          status: "draft",
          valid_until: quoteForm.valid_until || null,
          notes: quoteForm.notes,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
      if (quoteForm.items.length > 0) {
        const itemsData = quoteForm.items.map(item => ({
          quote_id: quote.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          tenant_id: tenantId,
        }));

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      // Send quote notification
      await sendQuoteNotification(
        quote.id,
        { id: quote.id, quote_number: quoteNumber, contact_id: quoteForm.contact_id }
      );

      toast({
        title: "Quote Created",
        description: `Quote ${quoteNumber} has been created successfully`,
      });

      setShowCreateDialog(false);
      resetQuoteForm();
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const convertToInvoice = async (quote: Quote, paymentTerms: number = 30) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create sale record as invoice (credit sale)
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          cashier_id: user.id,
          customer_id: quote.contact_id,
          payment_method: "credit",
          receipt_number: invoiceNumber,
          total_amount: quote.total_amount,
          discount_amount: quote.discount_amount || 0,
          tax_amount: quote.tax_amount || 0,
          status: "pending",
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Fetch quote items and create sale items
      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      if (quoteItems && quoteItems.length > 0) {
        const saleItemsData = quoteItems.map(item => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

        const { error: saleItemsError } = await supabase
          .from("sale_items")
          .insert(saleItemsData);

        if (saleItemsError) throw saleItemsError;
      }

      // Create accounts receivable record
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      const { error: arError } = await supabase.rpc('create_accounts_receivable_record', {
        tenant_id_param: tenantId,
        sale_id_param: sale.id,
        customer_id_param: quote.contact_id,
        total_amount_param: quote.total_amount,
        due_date_param: dueDate.toISOString().split('T')[0]
      });

      if (arError) throw arError;

      // Update quote status to converted
      const { error: updateError } = await supabase
        .from("quotes")
        .update({ status: "converted" })
        .eq("id", quote.id);

      if (updateError) throw updateError;

      // Update inventory (reduce stock)
      for (const item of quoteItems || []) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          const newStock = Math.max(0, product.stock_quantity - item.quantity);
          await supabase
            .from("products")
            .update({ stock_quantity: newStock })
            .eq("id", item.product_id);
        }
      }

      // Send invoice notification
      await sendInvoiceNotification(
        sale.id,
        { id: sale.id, invoice_number: invoiceNumber, customer_id: quote.contact_id }
      );

      toast({
        title: "Quote Converted to Invoice",
        description: `Invoice ${invoiceNumber} has been created successfully`,
      });

      setShowInvoiceDialog(false);
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const recordInvoicePayment = async (invoiceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Record payment using AR/AP payments table (existing table)
      const { error: paymentError } = await supabase
        .from("ar_ap_payments")
        .insert({
          reference_id: invoiceId,
          payment_type: "receivable",
          amount: paymentForm.payment_amount,
          payment_method: paymentForm.payment_method,
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: paymentForm.reference_number,
          notes: paymentForm.notes,
          tenant_id: tenantId,
        });

      if (paymentError) throw paymentError;

      // Update accounts receivable - get current values first
      const { data: arRecord } = await supabase
        .from("accounts_receivable")
        .select("paid_amount, outstanding_amount")
        .eq("reference_id", invoiceId)
        .eq("reference_type", "sale")
        .single();

      if (arRecord) {
        const newPaidAmount = (arRecord.paid_amount || 0) + paymentForm.payment_amount;
        const newOutstandingAmount = (arRecord.outstanding_amount || 0) - paymentForm.payment_amount;
        const newStatus = newOutstandingAmount <= 0 ? 'paid' : 'partial';

        const { error: arUpdateError } = await supabase
          .from("accounts_receivable")
          .update({
            paid_amount: newPaidAmount,
            outstanding_amount: newOutstandingAmount,
            status: newStatus
          })
          .eq("reference_id", invoiceId)
          .eq("reference_type", "sale");

        if (arUpdateError) throw arUpdateError;
      }


      toast({
        title: "Payment Recorded",
        description: "Invoice payment has been recorded successfully",
      });

      setShowPaymentDialog(false);
      resetPaymentForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addQuoteItem = () => {
    setQuoteForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: "", quantity: 1, unit_price: 0, total_price: 0 }
      ]
    }));
  };

  const updateQuoteItem = (index: number, field: string, value: any) => {
    setQuoteForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total when quantity or unit_price changes
      if (field === 'quantity' || field === 'unit_price') {
        newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const removeQuoteItem = (index: number) => {
    setQuoteForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const resetQuoteForm = () => {
    setQuoteForm({
      contact_id: "",
      notes: "",
      valid_until: "",
      items: []
    });
    setSelectedContact(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      payment_amount: 0,
      payment_method: "cash",
      reference_number: "",
      notes: ""
    });
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.contacts?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || quote.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = async (quote: Quote) => {
    setSelectedQuote(quote);
    await fetchQuoteItems(quote.id);
    setShowQuoteDetails(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Quote Management</h1>
          <p className="text-muted-foreground">Create, manage, and convert quotes to invoices with payment tracking</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Quote
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Quotes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quotes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchQuotes} size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quotes List */}
          <div className="grid gap-4">
            {filteredQuotes.map((quote) => (
              <Card key={quote.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{quote.quote_number}</h3>
                        {getStatusBadge(quote.status, quote.valid_until)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {quote.contacts && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{quote.contacts.name}</span>
                            {quote.contacts.company && (
                              <span className="text-xs bg-muted px-2 py-1 rounded">
                                {quote.contacts.company}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{formatCurrency(quote.total_amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          <span>Created: {new Date(quote.created_at).toLocaleDateString()}</span>
                          {quote.valid_until && (
                            <span className="text-xs">
                              | Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(quote)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {quote.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setShowInvoiceDialog(true);
                          }}
                          className="gap-1"
                        >
                          <Receipt className="h-4 w-4" />
                          Convert to Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Invoice management will show converted quotes and payment tracking.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Payment tracking will show all invoice payments and outstanding amounts.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Quote & Invoice Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analytics dashboard will show conversion rates, payment patterns, and performance metrics.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Quote Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-4">
              <Label>Customer</Label>
              <Select 
                value={quoteForm.contact_id} 
                onValueChange={(value) => {
                  setQuoteForm(prev => ({ ...prev, contact_id: value }));
                  const contact = contacts.find(c => c.id === value);
                  setSelectedContact(contact || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex flex-col">
                        <span>{contact.name}</span>
                        {contact.company && (
                          <span className="text-xs text-muted-foreground">{contact.company}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedContact && (
                <Card className="p-4 bg-muted/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Email:</strong> {selectedContact.email || "N/A"}
                    </div>
                    <div>
                      <strong>Phone:</strong> {selectedContact.phone || "N/A"}
                    </div>
                    <div className="col-span-2">
                      <strong>Address:</strong> {selectedContact.address || "N/A"}
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Quote Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Quote Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuoteItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              {quoteForm.items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                      <Label>Product</Label>
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => {
                          const product = products.find(p => p.id === value);
                          updateQuoteItem(index, "product_id", value);
                          if (product) {
                            updateQuoteItem(index, "unit_price", product.price);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex flex-col">
                                <span>{product.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(product.price)} | Stock: {product.stock_quantity}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuoteItem(index, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateQuoteItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <Input
                        type="number"
                        value={item.total_price}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuoteItem(index)}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Quote Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={quoteForm.valid_until}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
              <div>
                <Label>Total Amount</Label>
                <Input
                  value={formatCurrency(
                    quoteForm.items.reduce((sum, item) => sum + item.total_price, 0) * 1.16 // Including tax
                  )}
                  readOnly
                  className="bg-muted font-medium"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for the quote..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createQuote}>
              Create Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Quote to Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedQuote && (
              <div className="space-y-2">
                <p>Quote: <strong>{selectedQuote.quote_number}</strong></p>
                <p>Amount: <strong>{formatCurrency(selectedQuote.total_amount)}</strong></p>
                <p>Customer: <strong>{selectedQuote.contacts?.name}</strong></p>
              </div>
            )}
            <div>
              <Label>Payment Terms (Days)</Label>
              <Select defaultValue="30">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Due on Receipt</SelectItem>
                  <SelectItem value="15">Net 15</SelectItem>
                  <SelectItem value="30">Net 30</SelectItem>
                  <SelectItem value="60">Net 60</SelectItem>
                  <SelectItem value="90">Net 90</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedQuote && convertToInvoice(selectedQuote, 30)}>
              Convert to Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Details Dialog */}
      <Dialog open={showQuoteDetails} onOpenChange={setShowQuoteDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Quote Header */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{selectedQuote.quote_number}</h3>
                  {getStatusBadge(selectedQuote.status, selectedQuote.valid_until)}
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(selectedQuote.created_at).toLocaleDateString()}
                  </p>
                  {selectedQuote.valid_until && (
                    <p className="text-sm text-muted-foreground">
                      Valid until: {new Date(selectedQuote.valid_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {selectedQuote.contacts && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Customer Details</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Name:</strong> {selectedQuote.contacts.name}</p>
                      {selectedQuote.contacts.company && (
                        <p><strong>Company:</strong> {selectedQuote.contacts.company}</p>
                      )}
                      {selectedQuote.contacts.email && (
                        <p><strong>Email:</strong> {selectedQuote.contacts.email}</p>
                      )}
                      {selectedQuote.contacts.phone && (
                        <p><strong>Phone:</strong> {selectedQuote.contacts.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quote Items */}
              <div className="space-y-4">
                <h4 className="font-medium">Quote Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-right p-3">Unit Price</th>
                        <th className="text-right p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{item.products.name}</p>
                              {item.products.sku && (
                                <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                              )}
                            </div>
                          </td>
                          <td className="text-right p-3">{item.quantity}</td>
                          <td className="text-right p-3">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right p-3 font-medium">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted border-t">
                      <tr>
                        <td colSpan={3} className="text-right p-3 font-medium">Total Amount:</td>
                        <td className="text-right p-3 font-bold">{formatCurrency(selectedQuote.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedQuote.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium">Notes</h4>
                  <p className="text-sm bg-muted p-3 rounded">{selectedQuote.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}