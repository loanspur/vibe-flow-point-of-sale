import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  ShoppingCart, 
  CalendarIcon,
  Send,
  Copy,
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
  Archive,
  MoreHorizontal,
  Printer,
  Star,
  Tags,
  Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailService } from "@/hooks/useEmailService";
import { SaleForm } from "./SaleForm";

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
  customer_id?: string;
  cashier_id: string;
  customers?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
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

export function QuoteManagement() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [showQuoteDetails, setShowQuoteDetails] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailContent, setEmailContent] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [showInvoiceTerms, setShowInvoiceTerms] = useState(false);
  const [selectedQuoteForInvoice, setSelectedQuoteForInvoice] = useState<Quote | null>(null);
  const [selectedNetDays, setSelectedNetDays] = useState<number>(30);
  const { toast } = useToast();
  const { tenantCurrency } = useApp();
  const { sendEmail } = useEmailService();

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          customers (name, email, phone, address)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
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

  // Helpers for auto-numbering based on business settings
  const pad4 = (n: number) => String(n).padStart(4, '0');
  const getBusinessSettings = async (tenantId: string) => {
    const { data } = await supabase
      .from('business_settings')
      .select('invoice_number_prefix, quote_number_prefix, invoice_auto_number, quote_auto_number, company_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return {
      invoicePrefix: data?.invoice_number_prefix || 'INV-',
      quotePrefix: data?.quote_number_prefix || 'QT-',
      autoInvoice: data?.invoice_auto_number ?? true,
      autoQuote: data?.quote_auto_number ?? true,
      companyName: data?.company_name || 'VibePOS'
    };
  };
  const generateQuoteNumber = async (tenantId: string) => {
    const bs = await getBusinessSettings(tenantId);
    const today = new Date();
    const yyyyMMdd = today.toISOString().slice(0,10).replace(/-/g,'');
    const start = new Date(today); start.setHours(0,0,0,0);
    const end = new Date(today); end.setHours(23,59,59,999);
    const { count } = await supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    return `${bs.quotePrefix}${yyyyMMdd}-${pad4((count || 0) + 1)}`;
  };
  const generateInvoiceNumber = async (tenantId: string) => {
    const bs = await getBusinessSettings(tenantId);
    const today = new Date();
    const yyyyMMdd = today.toISOString().slice(0,10).replace(/-/g,'');
    const start = new Date(today); start.setHours(0,0,0,0);
    const end = new Date(today); end.setHours(23,59,59,999);
    const { count } = await supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('payment_method', 'credit')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    return `${bs.invoicePrefix}${yyyyMMdd}-${pad4((count || 0) + 1)}`;
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customers?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || quote.status === filterStatus;
    
    let matchesDate = true;
    if (filterDateRange !== "all") {
      const quoteDate = new Date(quote.created_at);
      const now = new Date();
      
      switch (filterDateRange) {
        case "today":
          matchesDate = quoteDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = quoteDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = quoteDate >= monthAgo;
          break;
        default:
          matchesDate = true;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string, validUntil?: string | null) => {
    // Check if quote is expired regardless of status
    const expired = validUntil && isExpired(validUntil);
    
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

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", quoteId);

      if (error) throw error;

      setQuotes(quotes.map(quote => 
        quote.id === quoteId ? { ...quote, status: newStatus } : quote
      ));

      toast({
        title: "Quote Updated",
        description: `Quote status changed to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateQuote = async (quoteId: string, updates: Partial<Quote>) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", quoteId);

      if (error) throw error;

      setQuotes(quotes.map(quote => 
        quote.id === quoteId ? { ...quote, ...updates } : quote
      ));

      toast({
        title: "Quote Updated",
        description: "Quote has been updated successfully",
      });
      
      setShowEditDialog(false);
      setEditingQuote(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteQuote = async (quoteId: string) => {
    try {
      // Delete quote items first
      const { error: itemsError } = await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", quoteId);

      if (itemsError) throw itemsError;

      // Delete quote
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", quoteId);

      if (error) throw error;

      setQuotes(quotes.filter(quote => quote.id !== quoteId));
      
      toast({
        title: "Quote Deleted",
        description: "Quote has been deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const convertToSale = async (quote: Quote) => {
    try {
      // Get quote items
      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          cashier_id: user.id,
          customer_id: quote.customer_id,
          payment_method: "cash",
          receipt_number: receiptNumber,
          total_amount: quote.total_amount,
          discount_amount: quote.discount_amount || 0,
          tax_amount: quote.tax_amount || 0,
          status: "completed",
          tenant_id: tenantData,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = quoteItems?.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })) || [];

      const { error: itemsInsertError } = await supabase
        .from("sale_items")
        .insert(saleItemsData);

      if (itemsInsertError) throw itemsInsertError;

      // Update quote status to converted
      await updateQuoteStatus(quote.id, "converted");

      toast({
        title: "Quote Converted",
        description: `Quote converted to sale ${receiptNumber}`,
      });

      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const convertToInvoice = async (quote: Quote, netDays: number = 30) => {
    try {
      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      // Generate invoice number using business settings and daily sequence
      const invoiceNumber = await generateInvoiceNumber(tenantData);

      // Create sale record as invoice (credit sale awaiting payment)
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          cashier_id: user.id,
          customer_id: quote.customer_id,
          payment_method: "credit",
          receipt_number: invoiceNumber,
          total_amount: quote.total_amount,
          discount_amount: quote.discount_amount || 0,
          tax_amount: quote.tax_amount || 0,
          status: "pending",
          tenant_id: tenantData,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItemsData = quoteItems?.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })) || [];

      const { error: itemsInsertError } = await supabase
        .from("sale_items")
        .insert(saleItemsData);

      if (itemsInsertError) throw itemsInsertError;

      // Create accounts receivable record for the invoice with due date based on terms
      if (quote.customer_id) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + netDays);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const { error: arError } = await supabase.rpc('create_accounts_receivable_record', {
          tenant_id_param: tenantData,
          sale_id_param: sale.id,
          customer_id_param: quote.customer_id,
          total_amount_param: quote.total_amount,
          due_date_param: dueDateStr
        });

        if (arError) {
          console.error('Error creating AR record:', arError);
        }
      }

      await updateQuoteStatus(quote.id, "converted");

      toast({
        title: "Quote Converted to Invoice",
        description: `Quote successfully converted to invoice ${invoiceNumber}. The invoice is now awaiting payment (Net ${netDays}).`,
      });

      fetchQuotes();
    } catch (error: any) {
      console.error('Error converting quote to invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to convert quote to invoice",
        variant: "destructive",
      });
    }
  };

  const duplicateQuote = async (quote: Quote) => {
    try {
      // Get quote items
      const { data: quoteItems, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quote.id);

      if (itemsError) throw itemsError;

      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      // Generate new quote number
      const quoteNumber = await generateQuoteNumber(tenantData);

      // Create new quote
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          customer_id: quote.customer_id,
          cashier_id: user.id,
          tenant_id: tenantData,
          total_amount: quote.total_amount,
          discount_amount: quote.discount_amount,
          tax_amount: quote.tax_amount,
          status: "draft",
          notes: quote.notes,
          valid_until: quote.valid_until,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
      const newQuoteItemsData = quoteItems?.map(item => ({
        quote_id: newQuote.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })) || [];

      const { error: itemsInsertError } = await supabase
        .from("quote_items")
        .insert(newQuoteItemsData);

      if (itemsInsertError) throw itemsInsertError;

      fetchQuotes();
      toast({
        title: "Quote Duplicated",
        description: `New quote ${quoteNumber} created`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendQuoteEmail = async () => {
    try {
      if (!selectedQuote) return;
      if (!emailContent.to) throw new Error('Recipient email is required');

      const html = `
        <div>
          <h2 style="margin:0 0 8px 0;">Quote ${selectedQuote.quote_number}</h2>
          <p>Dear ${selectedQuote.customers?.name || 'Customer'},</p>
          <p>${emailContent.message || 'Please find your quote details below.'}</p>
          <p><strong>Total:</strong> ${formatCurrency(selectedQuote.total_amount)}</p>
          ${selectedQuote.valid_until ? `<p><strong>Valid Until:</strong> ${formatDate(selectedQuote.valid_until)}</p>` : ''}
          <p>If you have any questions or would like to proceed, just reply to this email.</p>
          <p>Best regards,<br />VibePOS Team</p>
        </div>`;

      await sendEmail({
        to: emailContent.to,
        subject: emailContent.subject || `Quote ${selectedQuote.quote_number}`,
        htmlContent: html,
        textContent: `${emailContent.message}\nTotal: ${selectedQuote.total_amount}`,
        variables: { company_name: 'VibePOS' },
        priority: 'medium'
      });

      await updateQuoteStatus(selectedQuote.id, 'sent');
      setEmailDialog(false);
      setEmailContent({ to: '', subject: '', message: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send email', variant: 'destructive' });
    }
  };

  const exportQuotes = () => {
    const csvContent = [
      'Quote Number,Customer,Amount,Status,Created Date,Valid Until',
      ...filteredQuotes.map(quote => 
        `${quote.quote_number},"${quote.customers?.name || 'Walk-in'}",${quote.total_amount},${quote.status},${formatDate(quote.created_at)},${quote.valid_until ? formatDate(quote.valid_until) : ''}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Quotes exported to CSV file",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: tenantCurrency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const openQuoteDetails = async (quote: Quote) => {
    setSelectedQuote(quote);
    await fetchQuoteItems(quote.id);
    setShowQuoteDetails(true);
  };

  const openEditDialog = (quote: Quote) => {
    setEditingQuote(quote);
    setShowEditDialog(true);
  };

  const getQuoteStats = () => {
    const total = quotes.length;
    const draft = quotes.filter(q => q.status === 'draft').length;
    const sent = quotes.filter(q => q.status === 'sent').length;
    const accepted = quotes.filter(q => q.status === 'accepted').length;
    const converted = quotes.filter(q => q.status === 'converted').length;
    const totalValue = quotes.reduce((sum, q) => sum + q.total_amount, 0);

    return { total, draft, sent, accepted, converted, totalValue };
  };

  const stats = getQuoteStats();

  if (isLoading) {
    return <div className="p-6">Loading quotes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quote Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchQuotes()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setActiveTab("create")}>
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.converted}</div>
            <p className="text-xs text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">All Quotes</TabsTrigger>
          <TabsTrigger value="create">Create Quote</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by quote number, customer, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportQuotes}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quotes List */}
          <Card>
            <CardHeader>
              <CardTitle>Quotes ({filteredQuotes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{quote.quote_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(quote.created_at)}
                            {quote.valid_until && (
                              <span className={isExpired(quote.valid_until) ? "text-red-500 ml-2" : "ml-2"}>
                                • Valid until {formatDate(quote.valid_until)}
                                {isExpired(quote.valid_until) && " (Expired)"}
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {quote.customers?.name || "Walk-in Customer"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quote.customers?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {quote.customers.email}
                              </span>
                            )}
                          </p>
                        </div>
                        {quote.notes && (
                          <div className="max-w-xs">
                            <p className="text-xs text-muted-foreground truncate">
                              {quote.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(quote.total_amount)}</p>
                        {getStatusBadge(quote.status, quote.valid_until)}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openQuoteDetails(quote)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(quote)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => duplicateQuote(quote)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {quote.status === "draft" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setEmailContent({
                                to: quote.customers?.email || '',
                                subject: `Quote ${quote.quote_number}`,
                                message: `Please find attached quote ${quote.quote_number} for your review.`
                              });
                              setEmailDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        )}
                        {quote.status === "sent" && (
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateQuoteStatus(quote.id, "accepted")}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateQuoteStatus(quote.id, "rejected")}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {(quote.status === "accepted" || quote.status === "sent") && (
                          <div className="flex gap-1">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => convertToSale(quote)}
                              title="Convert to Completed Sale"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Sale
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => { setSelectedQuoteForInvoice(quote); setSelectedNetDays(30); setShowInvoiceTerms(true); }}
                              title="Convert to Pending Invoice"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Invoice
                            </Button>
                          </div>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete quote {quote.quote_number}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteQuote(quote.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredQuotes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No quotes found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Quote</CardTitle>
            </CardHeader>
            <CardContent>
              <SaleForm onSaleCompleted={() => { setActiveTab('list'); fetchQuotes(); }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quote Details Dialog */}
      <Dialog open={showQuoteDetails} onOpenChange={setShowQuoteDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Quote Details - {selectedQuote?.quote_number}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">{selectedQuote.customers?.name || "Walk-in Customer"}</p>
                    </div>
                    {selectedQuote.customers?.email && (
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <p className="text-sm">{selectedQuote.customers.email}</p>
                      </div>
                    )}
                    {selectedQuote.customers?.phone && (
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="text-sm">{selectedQuote.customers.phone}</p>
                      </div>
                    )}
                    {selectedQuote.customers?.address && (
                      <div>
                        <Label className="text-sm font-medium">Address</Label>
                        <p className="text-sm">{selectedQuote.customers.address}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quote Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quote Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedQuote.status, selectedQuote.valid_until)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created Date</Label>
                      <p className="text-sm">{formatDate(selectedQuote.created_at)}</p>
                    </div>
                    {selectedQuote.valid_until && (
                      <div>
                        <Label className="text-sm font-medium">Valid Until</Label>
                        <p className={`text-sm font-medium ${isExpired(selectedQuote.valid_until) ? 'text-red-500' : 'text-green-600'}`}>
                          {formatDate(selectedQuote.valid_until)}
                          {isExpired(selectedQuote.valid_until) && (
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              EXPIRED
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedQuote.notes && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Notes</Label>
                      <p className="text-sm mt-1">{selectedQuote.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quote Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quote Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quoteItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {item.products.image_url ? (
                            <img 
                              src={item.products.image_url} 
                              alt={item.products.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.products.name}</p>
                            {item.product_variants && (
                              <p className="text-xs text-muted-foreground">
                                {item.product_variants.name}: {item.product_variants.value}
                              </p>
                            )}
                            {item.products.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                          <p className="text-sm font-bold">{formatCurrency(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedQuote.total_amount - (selectedQuote.tax_amount || 0) + (selectedQuote.discount_amount || 0))}</span>
                    </div>
                    {selectedQuote.discount_amount && selectedQuote.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedQuote.discount_amount)}</span>
                      </div>
                    )}
                    {selectedQuote.tax_amount && selectedQuote.tax_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>{formatCurrency(selectedQuote.tax_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedQuote.total_amount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quote - {editingQuote?.quote_number}</DialogTitle>
          </DialogHeader>
          {editingQuote && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingQuote.notes || ''}
                  onChange={(e) => setEditingQuote({...editingQuote, notes: e.target.value})}
                  placeholder="Add notes to this quote..."
                />
              </div>
              
              <div>
                <Label htmlFor="valid_until">Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editingQuote.valid_until && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingQuote.valid_until ? (
                        format(new Date(editingQuote.valid_until), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingQuote.valid_until ? new Date(editingQuote.valid_until) : undefined}
                      onSelect={(date) => 
                        setEditingQuote({
                          ...editingQuote, 
                          valid_until: date?.toISOString() || null
                        })
                      }
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateQuote(editingQuote.id, editingQuote)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote via Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email_to">To</Label>
              <Input
                id="email_to"
                type="email"
                value={emailContent.to}
                onChange={(e) => setEmailContent({...emailContent, to: e.target.value})}
                placeholder="customer@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="email_subject">Subject</Label>
              <Input
                id="email_subject"
                value={emailContent.subject}
                onChange={(e) => setEmailContent({...emailContent, subject: e.target.value})}
                placeholder="Quote Subject"
              />
            </div>
            
            <div>
              <Label htmlFor="email_message">Message</Label>
              <Textarea
                id="email_message"
                value={emailContent.message}
                onChange={(e) => setEmailContent({...emailContent, message: e.target.value})}
                placeholder="Email message..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDialog(false)}>
                Cancel
              </Button>
              <Button onClick={sendQuoteEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Send Quote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Terms Dialog */}
      <Dialog open={showInvoiceTerms} onOpenChange={setShowInvoiceTerms}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Terms</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Terms</Label>
            <Select value={String(selectedNetDays)} onValueChange={(v) => setSelectedNetDays(parseInt(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Net 7</SelectItem>
                <SelectItem value="14">Net 14</SelectItem>
                <SelectItem value="30">Net 30</SelectItem>
                <SelectItem value="45">Net 45</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvoiceTerms(false)}>Cancel</Button>
              <Button onClick={() => { if (selectedQuoteForInvoice) { convertToInvoice(selectedQuoteForInvoice, selectedNetDays); } setShowInvoiceTerms(false); setSelectedQuoteForInvoice(null); }}>Convert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
