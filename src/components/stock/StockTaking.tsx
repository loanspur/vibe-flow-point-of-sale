import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, Plus, Eye, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { initializeStockTakingSession, completeStockTaking } from '@/lib/inventory-integration';

export const StockTaking: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
    fetchLocations();
  }, [user]);

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
      const { data, error } = await supabase
        .from('stock_taking_items')
        .select(`
          *,
          products(name, sku),
          product_variants(name, value, sku)
        `)
        .eq('session_id', sessionId)
        .order('created_at');

      if (error) throw error;

      setStockItems(data || []);
      const session = sessions.find(s => s.id === sessionId);
      setSelectedSession(session);
    } catch (error) {
      console.error('Error fetching stock items:', error);
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
    } catch (error) {
      console.error('Error updating count:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewSession(session.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
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

          <Card>
            <CardHeader>
              <CardTitle>Stock Count Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>System Qty</TableHead>
                    <TableHead>Counted Qty</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.products?.name}
                        {item.product_variants?.name && (
                          <span className="text-sm text-muted-foreground">
                            - {item.product_variants.name}: {item.product_variants.value}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.products?.sku || item.product_variants?.sku}
                      </TableCell>
                      <TableCell>{item.system_quantity}</TableCell>
                      <TableCell>
                        {selectedSession.status === 'active' ? (
                          <Input
                            type="number"
                            value={item.counted_quantity || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              updateCount(item.id, value);
                            }}
                            className="w-20"
                          />
                        ) : (
                          item.counted_quantity || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {item.variance_quantity !== null ? (
                          <span className={item.variance_quantity === 0 ? 'text-green-600' : 
                                         item.variance_quantity > 0 ? 'text-blue-600' : 'text-red-600'}>
                            {item.variance_quantity > 0 ? '+' : ''}{item.variance_quantity}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_counted ? 'default' : 'secondary'}>
                          {item.is_counted ? 'Counted' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};