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
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  status: string;
  valid_until: string | null;
  created_at: string;
  customer_id?: string;
  customers?: {
    name: string;
  };
  notes?: string;
}

export function QuoteManagement() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          customers (name)
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

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || quote.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "outline" as const, icon: Edit, color: "text-gray-600" },
      sent: { variant: "secondary" as const, icon: Send, color: "text-blue-600" },
      accepted: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      expired: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
      converted: { variant: "default" as const, icon: ShoppingCart, color: "text-purple-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: newStatus })
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
          payment_method: "pending",
          receipt_number: receiptNumber,
          total_amount: quote.total_amount,
          discount_amount: 0,
          tax_amount: 0,
          status: "pending",
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

      // Update quote status
      await updateQuoteStatus(quote.id, "converted");

      toast({
        title: "Quote Converted",
        description: `Quote converted to sale ${receiptNumber}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
      const quoteNumber = `QUO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create new quote
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          customer_id: quote.customer_id,
          cashier_id: user.id,
          tenant_id: tenantData,
          total_amount: quote.total_amount,
          status: "draft",
          notes: quote.notes,
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  if (isLoading) {
    return <div className="p-6">Loading quotes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quote Management</h2>
        <Button onClick={() => setActiveTab("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
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
                      placeholder="Search by quote number or customer..."
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
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
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
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {quote.customers?.name || "Walk-in Customer"}
                          </p>
                          <p className="text-sm text-muted-foreground">Customer</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(quote.total_amount)}</p>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => duplicateQuote(quote)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {quote.status === "accepted" && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => convertToSale(quote)}
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        )}
                        {quote.status === "draft" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateQuoteStatus(quote.id, "sent")}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        )}
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
              <div className="text-center py-8 text-muted-foreground">
                Quote creation form will be integrated with the enhanced sale form.
                <br />
                Use the "Save as Quote" option in the sale form instead of "Complete Sale".
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}