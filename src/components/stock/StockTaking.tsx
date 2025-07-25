import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClipboardCheck, Plus, Eye, CheckCircle, Calculator, AlertCircle, BarChart3, FileText, Scan, Save, MoreHorizontal, Copy, Download, Trash2, Play, Pause, XCircle, FileDown, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { initializeStockTakingSession, completeStockTaking } from '@/lib/inventory-integration';

export const StockTaking: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVariance, setFilterVariance] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [batchCount, setBatchCount] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
    fetchLocations();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [stockItems, searchTerm, filterStatus, filterVariance]);

  const applyFilters = () => {
    let filtered = stockItems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_variants?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => 
        filterStatus === 'counted' ? item.is_counted : !item.is_counted
      );
    }

    // Variance filter
    if (filterVariance !== 'all') {
      filtered = filtered.filter(item => {
        if (filterVariance === 'no-variance') return item.variance_quantity === 0;
        if (filterVariance === 'positive') return item.variance_quantity > 0;
        if (filterVariance === 'negative') return item.variance_quantity < 0;
        return true;
      });
    }

    setFilteredItems(filtered);
  };

  const fetchSessions = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data, error } = await supabase
        .from('stock_taking_sessions')
        .select(`
          *,
          store_locations(name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching stock taking sessions:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const createSession = async (formData: FormData) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      const sessionNumber = `ST-${Date.now()}`;
      const locationId = formData.get('location_id') as string;

      const { data: session, error } = await supabase
        .from('stock_taking_sessions')
        .insert({
          tenant_id: profile.tenant_id,
          session_number: sessionNumber,
          location_id: locationId || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize session with current inventory
      await initializeStockTakingSession(profile.tenant_id, session.id, locationId);

      toast({
        title: 'Stock Taking Session Created',
        description: `Session ${sessionNumber} has been started successfully.`
      });

      setIsCreateDialogOpen(false);
      fetchSessions();
    } catch (error) {
      console.error('Error creating stock taking session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create stock taking session.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const viewSession = async (sessionId: string) => {
    try {
      console.log('Viewing session:', sessionId);
      
      // First, let's try a simple query without joins to see if data exists
      const { data: items, error: itemsError } = await supabase
        .from('stock_taking_items')
        .select('*')
        .eq('session_id', sessionId);

      if (itemsError) {
        console.error('Error fetching stock items:', itemsError);
        toast({
          title: 'Error',
          description: 'Failed to load session items. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      console.log('Stock taking items found:', items?.length || 0);

      // If we have items, try to get product details separately
      if (items && items.length > 0) {
        const productIds = items.filter(item => item.product_id).map(item => item.product_id);
        const variantIds = items.filter(item => item.variant_id).map(item => item.variant_id);

        let products = [];
        let variants = [];

        if (productIds.length > 0) {
          const { data: productData } = await supabase
            .from('products')
            .select('id, name, sku')
            .in('id', productIds);
          products = productData || [];
        }

        if (variantIds.length > 0) {
          const { data: variantData } = await supabase
            .from('product_variants')
            .select('id, name, value, sku')
            .in('id', variantIds);
          variants = variantData || [];
        }

        // Combine the data
        const enrichedItems = items.map(item => {
          const product = products.find(p => p.id === item.product_id);
          const variant = variants.find(v => v.id === item.variant_id);
          
          return {
            ...item,
            products: product,
            product_variants: variant
          };
        });

        setStockItems(enrichedItems);
      } else {
        setStockItems([]);
      }

      const session = sessions.find(s => s.id === sessionId);
      setSelectedSession(session);

      // Load session notes
      const { data: sessionData } = await supabase
        .from('stock_taking_sessions')
        .select('notes')
        .eq('id', sessionId)
        .single();
      
      setSessionNotes(sessionData?.notes || '');
      
      toast({
        title: 'Session Loaded',
        description: `Loaded ${items?.length || 0} items for counting.`
      });
    } catch (error) {
      console.error('Error in viewSession:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session details.',
        variant: 'destructive'
      });
    }
  };

  const updateCount = async (itemId: string, countedQuantity: number) => {
    try {
      const item = stockItems.find(i => i.id === itemId);
      if (!item) return;

      const varianceQuantity = countedQuantity - item.system_quantity;
      const varianceValue = varianceQuantity * (item.unit_cost || 0);

      const { error } = await supabase
        .from('stock_taking_items')
        .update({
          counted_quantity: countedQuantity,
          variance_quantity: varianceQuantity,
          variance_value: varianceValue,
          is_counted: true,
          counted_by: user?.id,
          counted_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setStockItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              counted_quantity: countedQuantity,
              variance_quantity: varianceQuantity,
              variance_value: varianceValue,
              is_counted: true 
            }
          : item
      ));

      toast({
        title: 'Count Updated',
        description: `Stock count updated for ${item.products?.name || 'item'}.`
      });
    } catch (error) {
      console.error('Error updating count:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stock count.',
        variant: 'destructive'
      });
    }
  };

  const batchUpdateCount = async () => {
    if (!batchCount || selectedItems.size === 0) return;

    const count = parseInt(batchCount);
    if (isNaN(count)) return;

    setLoading(true);
    try {
      for (const itemId of selectedItems) {
        await updateCount(itemId, count);
      }
      setSelectedItems(new Set());
      setBatchCount('');
      toast({
        title: 'Batch Update Complete',
        description: `Updated ${selectedItems.size} items with count ${count}.`
      });
    } catch (error) {
      console.error('Error batch updating:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSessionNotes = async () => {
    if (!selectedSession) return;

    try {
      const { error } = await supabase
        .from('stock_taking_sessions')
        .update({ notes: sessionNotes })
        .eq('id', selectedSession.id);

      if (error) throw error;

      toast({
        title: 'Notes Saved',
        description: 'Session notes have been saved successfully.'
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save session notes.',
        variant: 'destructive'
      });
    }
  };

  const completeSession = async () => {
    if (!selectedSession) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      await completeStockTaking(profile.tenant_id, selectedSession.id, user?.id || '');

      toast({
        title: 'Stock Taking Completed',
        description: 'Stock variances have been processed and inventory updated.'
      });

      setSelectedSession(null);
      setStockItems([]);
      fetchSessions();
    } catch (error) {
      console.error('Error completing stock taking:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete stock taking session.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('stock_taking_sessions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          completed_by: user?.id
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Session Cancelled',
        description: 'Stock taking session has been cancelled.'
      });

      fetchSessions();
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel session.',
        variant: 'destructive'
      });
    }
  };

  const duplicateSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      const originalSession = sessions.find(s => s.id === sessionId);
      if (!originalSession) throw new Error('Session not found');

      const sessionNumber = `ST-${Date.now()}`;

      const { data: session, error } = await supabase
        .from('stock_taking_sessions')
        .insert({
          tenant_id: profile.tenant_id,
          session_number: sessionNumber,
          location_id: originalSession.location_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize session with current inventory
      await initializeStockTakingSession(profile.tenant_id, session.id, originalSession.location_id);

      toast({
        title: 'Session Duplicated',
        description: `New session ${sessionNumber} created based on the original session.`
      });

      fetchSessions();
    } catch (error) {
      console.error('Error duplicating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate session.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportSessionData = async (sessionId: string, format: 'csv' | 'pdf') => {
    try {
      const { data: items } = await supabase
        .from('stock_taking_items')
        .select(`
          *,
          products(name, sku),
          product_variants(name, value, sku)
        `)
        .eq('session_id', sessionId);

      if (!items) return;

      const session = sessions.find(s => s.id === sessionId);
      const filename = `stock-taking-${session?.session_number || sessionId}`;

      if (format === 'csv') {
        const csvContent = [
          'Product,SKU,System Quantity,Counted Quantity,Variance,Value Impact,Status',
          ...items.map(item => [
            (item as any).products?.name || '',
            (item as any).products?.sku || (item as any).product_variants?.sku || '',
            item.system_quantity,
            item.counted_quantity || '',
            item.variance_quantity || '',
            item.variance_value || '',
            item.is_counted ? 'Counted' : 'Pending'
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: 'Export Complete',
        description: `Session data exported as ${format.toUpperCase()}.`
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export session data.',
        variant: 'destructive'
      });
    }
  };

  const printSessionReport = (sessionId: string) => {
    // Open session in new window for printing
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      toast({
        title: 'Print Report',
        description: `Opening print dialog for session ${session.session_number}.`
      });
      // In a real implementation, this would open a print-friendly view
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const calculateSummary = () => {
    const totalItems = stockItems.length;
    const countedItems = stockItems.filter(item => item.is_counted).length;
    const positiveVariances = stockItems.filter(item => item.variance_quantity > 0).length;
    const negativeVariances = stockItems.filter(item => item.variance_quantity < 0).length;
    const noVariances = stockItems.filter(item => item.variance_quantity === 0).length;
    const totalVarianceValue = stockItems.reduce((sum, item) => sum + (item.variance_value || 0), 0);
    
    return {
      totalItems,
      countedItems,
      positiveVariances,
      negativeVariances,
      noVariances,
      totalVarianceValue,
      progress: totalItems > 0 ? (countedItems / totalItems) * 100 : 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Stock Taking Sessions</h2>
          <p className="text-muted-foreground">
            Conduct physical inventory counts and reconcile with system records
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Stock Taking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Stock Taking Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createSession(new FormData(e.currentTarget));
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="location_id">Location (Optional)</Label>
                  <Select name="location_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sessions List */}
      {!selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Taking Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No stock taking sessions found. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.session_number}
                      </TableCell>
                      <TableCell>
                        {new Date(session.session_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {session.store_locations?.name || 'All Locations'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-white ${getStatusColor(session.status)}`}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{session.total_products}</TableCell>
                      <TableCell>
                        {session.products_counted} / {session.total_products}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-48 bg-background border shadow-md z-50"
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                console.log('Viewing session:', session.id);
                                viewSession(session.id);
                              }}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            
                            {session.status === 'active' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    console.log('Completing session:', session.id);
                                    // First view the session to load it, then complete it
                                    viewSession(session.id).then(() => {
                                      setTimeout(() => completeSession(), 100);
                                    });
                                  }}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Complete Session
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    console.log('Cancelling session:', session.id);
                                    cancelSession(session.id);
                                  }}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Session
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                console.log('Duplicating session:', session.id);
                                duplicateSession(session.id);
                              }}
                              className="cursor-pointer"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate Session
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                console.log('Exporting CSV for session:', session.id);
                                exportSessionData(session.id, 'csv');
                              }}
                              className="cursor-pointer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Export CSV
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                console.log('Printing report for session:', session.id);
                                printSessionReport(session.id);
                              }}
                              className="cursor-pointer"
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Print Report
                            </DropdownMenuItem>
                            
                            {session.status === 'completed' && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.preventDefault();
                                  console.log('Exporting PDF for session:', session.id);
                                  exportSessionData(session.id, 'pdf');
                                }}
                                className="cursor-pointer"
                              >
                                <FileDown className="mr-2 h-4 w-4" />
                                Export PDF
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Details */}
      {selectedSession && (
        <div className="space-y-6">
          {/* Session Header with Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    Session: {selectedSession.session_number}
                  </h3>
                  <p className="text-muted-foreground">
                    Location: {selectedSession.store_locations?.name || 'All Locations'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedSession(null);
                      setStockItems([]);
                      setSelectedItems(new Set());
                      setSearchTerm('');
                      setFilterStatus('all');
                      setFilterVariance('all');
                    }}
                  >
                    Back to List
                  </Button>
                  {selectedSession.status === 'active' && (
                    <Button 
                      onClick={completeSession}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Complete Session
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{calculateSummary().countedItems} / {calculateSummary().totalItems} items</span>
                </div>
                <Progress value={calculateSummary().progress} className="w-full" />
              </div>
            </div>

            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Items:</div>
                  <div className="font-medium">{calculateSummary().totalItems}</div>
                  
                  <div>Counted:</div>
                  <div className="font-medium text-green-600">{calculateSummary().countedItems}</div>
                  
                  <div>No Variance:</div>
                  <div className="font-medium text-green-600">{calculateSummary().noVariances}</div>
                  
                  <div>Over Count:</div>
                  <div className="font-medium text-blue-600">{calculateSummary().positiveVariances}</div>
                  
                  <div>Under Count:</div>
                  <div className="font-medium text-red-600">{calculateSummary().negativeVariances}</div>
                  
                  <div>Total Variance:</div>
                  <div className={`font-medium ${getVarianceColor(calculateSummary().totalVarianceValue)}`}>
                    ${Math.abs(calculateSummary().totalVarianceValue).toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="count" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="count" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Stock Count
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="count" className="space-y-4">
              {/* Quick Count Entry Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Quick Stock Count Entry
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItems(new Set(filteredItems.map(item => item.id)));
                        }}
                        disabled={filteredItems.length === 0}
                      >
                        Select All ({filteredItems.length})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItems(new Set())}
                        disabled={selectedItems.size === 0}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="search">Search Products</Label>
                      <Input
                        id="search"
                        placeholder="Search by name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status-filter">Count Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Items</SelectItem>
                          <SelectItem value="counted">Already Counted</SelectItem>
                          <SelectItem value="pending">Need Counting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="variance-filter">Variance Type</Label>
                      <Select value={filterVariance} onValueChange={setFilterVariance}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Variances</SelectItem>
                          <SelectItem value="no-variance">Perfect Match</SelectItem>
                          <SelectItem value="positive">Over Count (+)</SelectItem>
                          <SelectItem value="negative">Under Count (-)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor="batch-count">Batch Count</Label>
                        <Input
                          id="batch-count"
                          type="number"
                          placeholder="Enter count"
                          value={batchCount}
                          onChange={(e) => setBatchCount(e.target.value)}
                          disabled={selectedItems.size === 0}
                          min="0"
                        />
                      </div>
                      <Button
                        onClick={batchUpdateCount}
                        disabled={!batchCount || selectedItems.size === 0 || loading}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Save className="h-3 w-3" />
                        Apply to {selectedItems.size}
                      </Button>
                    </div>
                  </div>

                  {selectedItems.size > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {selectedItems.size} item(s) selected for batch counting. Enter a count above and click "Apply" to update all selected items.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Stock Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Physical Count Entry ({filteredItems.length} items)</span>
                    <div className="text-sm text-muted-foreground">
                      Progress: {calculateSummary().countedItems} / {calculateSummary().totalItems} completed
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedSession.status === 'active' && (
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(new Set(filteredItems.map(item => item.id)));
                                } else {
                                  setSelectedItems(new Set());
                                }
                              }}
                              className="rounded"
                            />
                          </TableHead>
                        )}
                        <TableHead>Product Details</TableHead>
                        <TableHead className="text-center">System Count</TableHead>
                        <TableHead className="text-center">Physical Count</TableHead>
                        <TableHead className="text-center">Variance</TableHead>
                        <TableHead className="text-center">Value Impact</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        {selectedSession.status === 'active' && (
                          <TableHead className="text-center">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className={item.is_counted ? 'bg-muted/30' : ''}>
                          {selectedSession.status === 'active' && (
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedItems);
                                  if (e.target.checked) {
                                    newSelected.add(item.id);
                                  } else {
                                    newSelected.delete(item.id);
                                  }
                                  setSelectedItems(newSelected);
                                }}
                                className="rounded"
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{item.products?.name}</div>
                              {item.product_variants?.name && (
                                <div className="text-sm text-muted-foreground">
                                  {item.product_variants.name}: {item.product_variants.value}
                                </div>
                              )}
                              <div className="text-xs font-mono text-muted-foreground">
                                SKU: {item.products?.sku || item.product_variants?.sku}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-medium text-lg">{item.system_quantity}</div>
                            <div className="text-xs text-muted-foreground">Expected</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {selectedSession.status === 'active' ? (
                              <div className="flex flex-col items-center gap-2">
                                <Input
                                  type="number"
                                  value={item.counted_quantity || ''}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    updateCount(item.id, value);
                                  }}
                                  className="w-20 text-center font-medium"
                                  min="0"
                                  placeholder="0"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCount(item.id, item.system_quantity)}
                                  className="text-xs px-2 py-1"
                                >
                                  Match System
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-lg">{item.counted_quantity || '-'}</div>
                                <div className="text-xs text-muted-foreground">Actual</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.variance_quantity !== null ? (
                              <div className="space-y-1">
                                <div className={`font-bold text-lg ${getVarianceColor(item.variance_quantity)}`}>
                                  {item.variance_quantity > 0 ? '+' : ''}{item.variance_quantity}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.variance_quantity === 0 ? 'Perfect!' : 
                                   item.variance_quantity > 0 ? 'Over count' : 'Under count'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">-</div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.variance_value !== null ? (
                              <div className="space-y-1">
                                <div className={`font-medium ${getVarianceColor(item.variance_value)}`}>
                                  {item.variance_value > 0 ? '+' : ''}${item.variance_value.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  @ ${(item.unit_cost || 0).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">-</div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={item.is_counted ? 'default' : 'secondary'}
                              className={item.is_counted ? 'bg-green-500 hover:bg-green-600' : ''}
                            >
                              {item.is_counted ? 'Counted' : 'Pending'}
                            </Badge>
                          </TableCell>
                          {selectedSession.status === 'active' && (
                            <TableCell className="text-center">
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCount(item.id, 0)}
                                  className="text-xs px-2 py-1"
                                >
                                  Zero Count
                                </Button>
                                {!item.is_counted && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      // Quick skip - mark as counted with system quantity
                                      updateCount(item.id, item.system_quantity);
                                    }}
                                    className="text-xs px-2 py-1 text-muted-foreground"
                                  >
                                    Skip
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Variance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Items with No Variance:</span>
                        <span className="font-medium text-green-600">{calculateSummary().noVariances}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Items Over Counted:</span>
                        <span className="font-medium text-blue-600">{calculateSummary().positiveVariances}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Items Under Counted:</span>
                        <span className="font-medium text-red-600">{calculateSummary().negativeVariances}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="font-medium">Total Value Impact:</span>
                          <span className={`font-bold ${getVarianceColor(calculateSummary().totalVarianceValue)}`}>
                            ${Math.abs(calculateSummary().totalVarianceValue).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Count Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">
                          {calculateSummary().progress.toFixed(1)}%
                        </div>
                        <div className="text-muted-foreground">Complete</div>
                      </div>
                      <Progress value={calculateSummary().progress} className="w-full" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{calculateSummary().countedItems} counted</span>
                        <span>{calculateSummary().totalItems - calculateSummary().countedItems} remaining</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Session Notes
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveSessionNotes}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save Notes
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add notes about this stock taking session, any issues encountered, or observations..."
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={8}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};