import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCommunication } from '@/hooks/useUnifiedCommunication';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Calendar,
  User,
  Building
} from 'lucide-react';

interface Quote {
  id: string;
  quote_number: string;
  contact_id: string;
  total_amount: number;
  status: string;
  valid_until: string;
  created_at: string;
  contacts: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    company: string;
  };
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  type: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  sku: string;
}

interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name: string;
    sku: string;
    image_url: string;
  };
  product_variants?: {
    name: string;
    value: string;
  };
}

export default function EnhancedQuoteManagementUnified() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const { sendQuoteNotification, sendInvoiceNotification } = useUnifiedCommunication();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showQuoteDetails, setShowQuoteDetails] = useState(false);

  // Fetch quotes using TanStack Query
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['quotes', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, contacts(id, name, email, phone, address, company)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch contacts using TanStack Query
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'customer')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch products using TanStack Query
  const { data: products = [] } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, sku')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch quote items when a quote is selected
  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quote-items', selectedQuote?.id],
    queryFn: async () => {
      if (!selectedQuote?.id) return [];
      
      const { data, error } = await supabase
        .from('quote_items')
        .select(`
          *,
          products (name, sku, image_url),
          product_variants (name, value)
        `)
        .eq('quote_id', selectedQuote.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedQuote?.id,
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes', tenantId] });
      toast({
        title: 'Success',
        description: 'Quote created successfully',
      });
      setShowQuoteForm(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quote',
        variant: 'destructive',
      });
    },
  });

  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('quotes')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes', tenantId] });
      toast({
        title: 'Success',
        description: 'Quote updated successfully',
      });
      setShowQuoteForm(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update quote',
        variant: 'destructive',
      });
    },
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes', tenantId] });
      toast({
        title: 'Success',
        description: 'Quote deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quote',
        variant: 'destructive',
      });
    },
  });

  // Filter quotes based on search and status
  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const matchesSearch = 
        quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.contacts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.contacts.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

  // Get status badge
  const getStatusBadge = (status: string, validUntil?: string | null) => {
    const expired = validUntil && new Date(validUntil) < new Date();
    
    if (expired && status !== 'converted') {
      return (
        <Badge variant="destructive" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          EXPIRED
        </Badge>
      );
    }

    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-500">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'converted':
        return <Badge variant="default" className="bg-blue-500">Converted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle quote actions
  const handleSendQuote = async (quote: Quote) => {
    try {
      await sendQuoteNotification(quote.id);
      updateQuoteMutation.mutate({ 
        id: quote.id, 
        data: { status: 'sent' } 
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send quote',
        variant: 'destructive',
      });
    }
  };

  const handleConvertToInvoice = async (quote: Quote) => {
    try {
      // Implementation for converting quote to invoice
      updateQuoteMutation.mutate({ 
        id: quote.id, 
        data: { status: 'converted' } 
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to convert quote',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quote Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and track customer quotes
          </p>
        </div>
        <Button onClick={() => setShowQuoteForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
          <CardDescription>
            {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <div className="py-10 text-center">Loading quotes...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{quote.contacts.name}</div>
                        {quote.contacts.company && (
                          <div className="text-sm text-muted-foreground">
                            {quote.contacts.company}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(quote.total_amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(quote.status, quote.valid_until)}
                    </TableCell>
                    <TableCell>
                      {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Date(quote.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setShowQuoteDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setShowQuoteForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {quote.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendQuote(quote)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {quote.status === 'accepted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToInvoice(quote)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteQuoteMutation.mutate(quote.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredQuotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      No quotes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quote Details Dialog */}
      <Dialog open={showQuoteDetails} onOpenChange={setShowQuoteDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
            <DialogDescription>
              View detailed information about the quote
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Quote Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Quote Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Quote #{selectedQuote.quote_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {getStatusBadge(selectedQuote.status, selectedQuote.valid_until)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatCurrency(selectedQuote.total_amount)}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Customer Information</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedQuote.contacts.name}
                  </p>
                  {selectedQuote.contacts.company && (
                    <p className="text-sm text-muted-foreground">
                      {selectedQuote.contacts.company}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {selectedQuote.contacts.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedQuote.contacts.phone}
                  </p>
                </div>
              </div>

              {/* Quote Items */}
              <div>
                <h3 className="font-semibold mb-4">Quote Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products.name}</TableCell>
                        <TableCell>{item.products.sku}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quote Form Dialog */}
      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedQuote ? 'Edit Quote' : 'Create New Quote'}
            </DialogTitle>
            <DialogDescription>
              {selectedQuote ? 'Update quote information' : 'Create a new quote for your customer'}
            </DialogDescription>
          </DialogHeader>
          {/* Quote form implementation would go here */}
          <div className="py-4">
            <p className="text-muted-foreground">
              Quote form implementation would be added here with proper form handling.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
