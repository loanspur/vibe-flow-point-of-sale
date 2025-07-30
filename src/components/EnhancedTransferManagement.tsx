import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowRightLeft, 
  Eye, 
  Check, 
  X, 
  Clock, 
  Building2, 
  User, 
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface TransferRequest {
  id: string;
  amount: number;
  currency_code: string;
  status: string;
  transfer_type: string;
  reason?: string;
  notes?: string;
  reference_number: string;
  requested_at: string;
  responded_at?: string;
  completed_at?: string;
  from_user_id: string;
  to_user_id: string;
  responded_by?: string;
  from_drawer_id?: string;
  to_drawer_id?: string;
  to_account_id?: string;
  profiles_from?: { full_name: string } | null;
  profiles_to?: { full_name: string } | null;
  profiles_responded?: { full_name: string } | null;
  accounts?: { name: string; code: string } | null;
  cash_drawers_from?: { drawer_name: string } | null;
  cash_drawers_to?: { drawer_name: string } | null;
}

export function EnhancedTransferManagement() {
  const { user, tenantId, userRole } = useAuth();
  const { formatCurrency } = useApp();
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager';

  useEffect(() => {
    fetchTransfers();
  }, [tenantId, user?.id]);

  const fetchTransfers = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('cash_transfer_requests')
        .select(`
          *,
          profiles_from:profiles!cash_transfer_requests_from_user_id_fkey(full_name),
          profiles_to:profiles!cash_transfer_requests_to_user_id_fkey(full_name),
          profiles_responded:profiles!cash_transfer_requests_responded_by_fkey(full_name),
          accounts:accounts!cash_transfer_requests_to_account_id_fkey(name, code),
          cash_drawers_from:cash_drawers!cash_transfer_requests_from_drawer_id_fkey(drawer_name),
          cash_drawers_to:cash_drawers!cash_transfer_requests_to_drawer_id_fkey(drawer_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Non-admin users can only see their own transfers
      if (!isAdmin) {
        query = query.or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransfers((data || []) as unknown as TransferRequest[]);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to load transfer requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transfer: TransferRequest, action: 'approve' | 'reject') => {
    setSelectedTransfer(transfer);
    setActionType(action);
    setActionDialogOpen(true);
    setActionNotes('');
  };

  const processAction = async () => {
    if (!selectedTransfer || !actionType) return;

    setProcessingAction(true);
    try {
      const updateData: any = {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        responded_by: user?.id,
        responded_at: new Date().toISOString(),
        notes: actionNotes || null
      };

      // If approving, use the database function to process the transfer safely
      if (actionType === 'approve') {
        try {
          const { error: processError } = await supabase.rpc('process_cash_transfer_request', {
            transfer_request_id_param: selectedTransfer.id,
            action_param: 'approve'
          });

          if (processError) {
            // Handle specific error cases
            if (processError.message?.includes('Insufficient funds')) {
              toast.error(`Transfer rejected: ${processError.message}`);
              return;
            }
            throw processError;
          }

          toast.success('Transfer approved and processed successfully');
        } catch (rpcError) {
          console.error('Transfer processing error:', rpcError);
          toast.error(`Failed to process transfer: ${rpcError.message}`);
          return;
        }
      } else {
        // Reject the transfer
        try {
          const { error: processError } = await supabase.rpc('process_cash_transfer_request', {
            transfer_request_id_param: selectedTransfer.id,
            action_param: 'reject'
          });

          if (processError) throw processError;
          
          toast.success('Transfer rejected successfully');
        } catch (rpcError) {
          console.error('Transfer rejection error:', rpcError);
          toast.error(`Failed to reject transfer: ${rpcError.message}`);
          return;
        }
      }

      toast.success(`Transfer ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      setActionDialogOpen(false);
      fetchTransfers();
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error(`Failed to ${actionType} transfer`);
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const getTransferTypeIcon = (type: string) => {
    return type === 'account' ? <Building2 className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />;
  };

  const filteredTransfers = transfers.filter(transfer => {
    switch (activeTab) {
      case 'pending':
        return transfer.status === 'pending';
      case 'approved':
        return transfer.status === 'approved' || transfer.status === 'completed';
      case 'rejected':
        return transfer.status === 'rejected';
      case 'my-requests':
        return transfer.from_user_id === user?.id;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-muted-foreground">Loading transfer requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-4">
              {filteredTransfers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transfer requests found
                </div>
              ) : (
                filteredTransfers.map((transfer) => (
                  <Card key={transfer.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getTransferTypeIcon(transfer.transfer_type)}
                          <span className="font-medium">#{transfer.reference_number}</span>
                          {getStatusBadge(transfer.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatCurrency(transfer.amount)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>From: {transfer.profiles_from?.full_name || 'Unknown'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(transfer.requested_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {transfer.transfer_type === 'account' ? (
                              <>
                                <Building2 className="h-4 w-4" />
                                <span>To Account: {transfer.accounts?.name || 'Unknown Account'}</span>
                              </>
                            ) : (
                              <>
                                <ArrowRightLeft className="h-4 w-4" />
                                <span>To: {transfer.cash_drawers_to?.drawer_name || transfer.profiles_to?.full_name || 'Unknown'}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {transfer.reason && (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-muted-foreground">{transfer.reason}</span>
                          </div>
                        )}

                        {transfer.notes && (
                          <div className="bg-muted/50 p-2 rounded text-sm">
                            <span className="font-medium">Notes: </span>
                            {transfer.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setActionDialogOpen(true);
                            setActionType(null);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        {/* Admin actions for pending transfers */}
                        {isAdmin && transfer.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleAction(transfer, 'approve')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleAction(transfer, 'reject')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {/* User actions for pending transfers they created */}
                        {!isAdmin && transfer.from_user_id === user?.id && transfer.status === 'pending' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Awaiting Review
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : actionType === 'reject' ? (
                <X className="h-5 w-5 text-red-600" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
              {actionType ? `${actionType === 'approve' ? 'Approve' : 'Reject'} Transfer` : 'Transfer Details'}
            </DialogTitle>
            {selectedTransfer && (
              <DialogDescription>
                Transfer #{selectedTransfer.reference_number}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                  <div className="text-lg font-semibold">{formatCurrency(selectedTransfer.amount)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTransfer.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Requested By</Label>
                  <div>{selectedTransfer.profiles_from?.full_name || 'Unknown'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Requested At</Label>
                  <div>{new Date(selectedTransfer.requested_at).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Transfer Details</Label>
                <div className="mt-1">
                  {selectedTransfer.transfer_type === 'account' ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>Bank Account: {selectedTransfer.accounts?.name} ({selectedTransfer.accounts?.code})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>Cash Drawer: {selectedTransfer.cash_drawers_to?.drawer_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedTransfer.reason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">{selectedTransfer.reason}</div>
                </div>
              )}

              {selectedTransfer.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Admin Notes</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">{selectedTransfer.notes}</div>
                </div>
              )}

              {actionType && (
                <div className="space-y-2">
                  <Label htmlFor="action-notes">
                    {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason'}
                  </Label>
                  <Textarea
                    id="action-notes"
                    placeholder={actionType === 'approve' ? 'Add any approval notes...' : 'Please provide a reason for rejection...'}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                  {actionType ? 'Cancel' : 'Close'}
                </Button>
                {actionType && (
                  <Button
                    onClick={processAction}
                    disabled={processingAction || (actionType === 'reject' && !actionNotes.trim())}
                    className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {processingAction ? 'Processing...' : (actionType === 'approve' ? 'Approve Transfer' : 'Reject Transfer')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}