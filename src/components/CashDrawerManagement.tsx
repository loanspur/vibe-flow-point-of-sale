import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCashDrawer } from '@/hooks/useCashDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft,
  Plus,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Eye,
  Check,
  X
} from 'lucide-react';
import { CashTransferModal } from './CashTransferModal';
import { CashTransactionHistory } from './CashTransactionHistory';
import { CashJournalReport } from './CashJournalReport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransferRequest {
  id: string;
  amount: number;
  status: string;
  transfer_type: string;
  reason?: string;
  notes?: string;
  reference_number?: string;
  requested_at?: string;
  responded_at?: string;
  from_user_id: string;
  to_user_id: string;
  responded_by?: string;
  from_drawer_id: string;
  to_drawer_id?: string;
  to_account_id?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  profiles_from?: { full_name: string } | null;
  profiles_to?: { full_name: string } | null;
  profiles_responded?: { full_name: string } | null;
}

export function CashDrawerManagement() {
  const { businessSettings } = useApp();
  const { user, tenantId, userRole } = useAuth();
  const {
    currentDrawer,
    allDrawers,
    transactions,
    loading,
    initializeDrawer,
    openDrawer,
    closeDrawer,
    createTransferRequest,
    refresh: refreshCashDrawer
  } = useCashDrawer();

  // Add separate method names for clarity
  const fetchCashDrawers = refreshCashDrawer;

  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Transfer management state
  const [allTransfers, setAllTransfers] = useState<TransferRequest[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager';

  useEffect(() => {
    if (tenantId) {
      fetchAllTransfers();
    }
  }, [tenantId, user?.id]);

  const fetchAllTransfers = async () => {
    if (!tenantId) return;

    setTransfersLoading(true);
    try {
      // First get user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map for quick lookup
      const profileMap = new Map();
      if (profiles) {
        profiles.forEach(profile => {
          profileMap.set(profile.user_id, profile.full_name);
        });
      }

      // Fetch both cash drawer transfers and bank transfers
      const [cashTransfersResponse, bankTransfersResponse] = await Promise.all([
        supabase
          .from('cash_transfer_requests')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('transfer_requests')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('transfer_type', 'account')
          .order('created_at', { ascending: false })
      ]);

      if (cashTransfersResponse.error) throw cashTransfersResponse.error;
      if (bankTransfersResponse.error) throw bankTransfersResponse.error;

      // Combine and sort transfers, adding profile names
      const cashTransfers = (cashTransfersResponse.data || []).map(t => ({ 
        ...t, 
        transfer_type: 'drawer',
        profiles_from: { full_name: profileMap.get(t.from_user_id) || 'Unknown User' },
        profiles_to: { full_name: profileMap.get(t.to_user_id) || 'Unknown User' },
        profiles_responded: t.responded_by ? { full_name: profileMap.get(t.responded_by) || 'Unknown User' } : null
      })) as unknown as TransferRequest[];
      
      const bankTransfers = (bankTransfersResponse.data || []).map(t => ({ 
        ...t, 
        transfer_type: 'account',
        profiles_from: { full_name: profileMap.get(t.from_user_id) || 'Unknown User' },
        profiles_to: { full_name: profileMap.get(t.to_user_id) || 'Unknown User' },
        profiles_responded: t.responded_by ? { full_name: profileMap.get(t.responded_by) || 'Unknown User' } : null
      })) as unknown as TransferRequest[];
      
      const allTransfers = [...cashTransfers, ...bankTransfers]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Filter for non-admin users
      if (!isAdmin) {
        const filteredTransfers = allTransfers.filter(transfer =>
          transfer.from_user_id === user?.id || transfer.to_user_id === user?.id
        );
        setAllTransfers(filteredTransfers);
      } else {
        setAllTransfers(allTransfers);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to load transfer requests');
    } finally {
      setTransfersLoading(false);
    }
  };

  const handleTransferAction = async (transfer: TransferRequest, action: 'approve' | 'reject') => {
    setSelectedTransfer(transfer);
    setActionType(action);
    setActionDialogOpen(true);
    setActionNotes('');
  };

  const processTransferAction = async () => {
    if (!selectedTransfer || !actionType) {
      console.error('Missing transfer or action type:', { selectedTransfer, actionType });
      return;
    }

    console.log('Processing transfer action:', {
      transferId: selectedTransfer.id,
      action: actionType,
      transferType: selectedTransfer.transfer_type,
      selectedTransfer
    });

    setProcessingAction(true);
    try {
      if (selectedTransfer.transfer_type === 'drawer') {
        // Handle cash drawer transfers using the existing RPC function
        console.log('Calling process_cash_transfer_request RPC with:', {
          transfer_request_id_param: selectedTransfer.id,
          action_param: actionType
        });

        const { data, error: processError } = await supabase.rpc('process_cash_transfer_request', {
          transfer_request_id_param: selectedTransfer.id,
          action_param: actionType
        });

        console.log('RPC response:', { data, processError });

        if (processError) {
          console.error('RPC error:', processError);
          if (processError.message?.includes('Insufficient funds')) {
            toast.error(`Transfer rejected: ${processError.message}`);
            return;
          }
          throw processError;
        }
        toast.success(`Drawer transfer ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      } else {
        // Handle bank account transfers - update status only
        console.log('Updating bank transfer status');
        const updateData: any = {
          status: actionType === 'approve' ? 'approved' : 'rejected',
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
          notes: actionNotes || null
        };

        console.log('Updating transfer_requests with:', updateData);

        const { error } = await supabase
          .from('transfer_requests')
          .update(updateData)
          .eq('id', selectedTransfer.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        toast.success(`Bank transfer ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      }

      setActionDialogOpen(false);
      setSelectedTransfer(null);
      setActionType(null);
      setActionNotes('');
      
      // Refresh all relevant data after successful action
      await Promise.all([
        fetchAllTransfers(),
        refreshCashDrawer() // This will refresh cash drawer balances, transactions, and all drawer data
      ]);
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error(`Failed to ${actionType} transfer: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingAction(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: businessSettings?.currency_code || 'KES',
      currencyDisplay: 'symbol'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale_payment': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'change_issued': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'transfer_in': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'transfer_out': return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case 'bank_deposit': return <TrendingDown className="h-4 w-4 text-purple-500" />;
      default: return <ArrowRightLeft className="h-4 w-4 text-gray-500" />;
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

  const pendingTransfers = allTransfers.filter(t => t.status === 'pending');
  const myPendingRequests = pendingTransfers.filter(t => t.to_user_id === user?.id || (isAdmin && t.status === 'pending'));

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading cash drawer...</div>;
  }

  if (!currentDrawer) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cash Drawer Setup
          </CardTitle>
          <CardDescription>
            Initialize your cash drawer to start managing cash transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={initializeDrawer} className="w-full">
            Initialize Cash Drawer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cash Balance Card with Pending Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  <CardTitle>Cash Drawer Balance</CardTitle>
                </div>
                <Badge className={getStatusColor(currentDrawer.status)}>
                  {currentDrawer.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary flex items-center justify-center gap-2">
                    <CurrencyIcon currency={businessSettings?.currency_code} className="h-8 w-8" />
                    {formatAmount(currentDrawer.current_balance)}
                  </div>
                  <p className="text-muted-foreground mt-2">Current Cash Balance</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="font-medium">Opening Balance</p>
                    <p className="text-lg">{formatAmount(currentDrawer.opening_balance)}</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="font-medium">Status</p>
                    <p className="text-lg capitalize">{currentDrawer.status}</p>
                  </div>
                </div>

                {currentDrawer.status === 'closed' ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Opening balance"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                    />
                    <Button 
                      onClick={() => openDrawer(Number(openingBalance))}
                      className="w-full"
                    >
                      Open Cash Drawer
                    </Button>
                  </div>
                ) : (
                  <Button onClick={closeDrawer} variant="outline" className="w-full">
                    Close Cash Drawer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Transfer Approvals */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              Transfer requests awaiting your approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myPendingRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No pending requests
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {myPendingRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="border border-orange-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getTransferTypeIcon(request.transfer_type)}
                          <span className="font-medium text-sm">
                            {formatAmount(request.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {request.profiles_from?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.reason && request.reason.length > 20 
                            ? `${request.reason.substring(0, 20)}...` 
                            : request.reason || 'No reason'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleTransferAction(request, 'approve')}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleTransferAction(request, 'reject')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {myPendingRequests.length > 3 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{myPendingRequests.length - 3} more pending
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Create Transfer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <CashTransferModal
              allDrawers={allDrawers}
              currentDrawer={currentDrawer}
              onTransfer={createTransferRequest}
              onClose={() => setShowTransferModal(false)}
              formatAmount={formatAmount}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Cash Journal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <CashJournalReport
              transactions={transactions}
              formatAmount={formatAmount}
              onClose={() => setShowReportModal(false)}
            />
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Adjustment
        </Button>
      </div>

      {/* Comprehensive Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="journal">Daily Journal</TabsTrigger>
          <TabsTrigger value="transfers">All Transfers</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <CashTransactionHistory
            transactions={transactions.slice(0, 15)}
            formatAmount={formatAmount}
            getTransactionIcon={getTransactionIcon}
          />
        </TabsContent>

        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cash Journal</CardTitle>
              <CardDescription>
                Complete transaction history for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashTransactionHistory
                transactions={transactions.filter(t => 
                  new Date(t.transaction_date).toDateString() === new Date().toDateString()
                )}
                formatAmount={formatAmount}
                getTransactionIcon={getTransactionIcon}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Transfer Requests</CardTitle>
              <CardDescription>
                Complete history of cash drawer and bank transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transfersLoading ? (
                <div className="flex items-center justify-center py-8">Loading transfers...</div>
              ) : allTransfers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transfer requests found
                </p>
              ) : (
                <div className="space-y-3">
                  {allTransfers.map((transfer) => (
                    <div key={transfer.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {getTransferTypeIcon(transfer.transfer_type)}
                            <span className="font-medium">
                              {formatAmount(transfer.amount)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({transfer.transfer_type === 'account' ? 'Bank Transfer' : 'Cash Drawer Transfer'})
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">From:</p>
                              <p className="font-medium">{transfer.profiles_from?.full_name || 'Unknown User'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">To:</p>
                              <p className="font-medium">{transfer.profiles_to?.full_name || 'Unknown User'}</p>
                            </div>
                          </div>
                          {transfer.reason && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Reason:</strong> {transfer.reason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(transfer.created_at).toLocaleString()}
                            {transfer.reference_number && ` • Ref: ${transfer.reference_number}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(transfer.status)}
                          {transfer.status === 'pending' && (transfer.to_user_id === user?.id || isAdmin) && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleTransferAction(transfer, 'approve')}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleTransferAction(transfer, 'reject')}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Transfer Approvals</CardTitle>
              <CardDescription>
                Transfer requests that require your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myPendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending approvals
                </p>
              ) : (
                <div className="space-y-4">
                  {myPendingRequests.map((request) => (
                    <div key={request.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50/30">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {getTransferTypeIcon(request.transfer_type)}
                            <span className="font-medium text-lg">
                              {formatAmount(request.amount)}
                            </span>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Requested by:</p>
                              <p className="font-medium">{request.profiles_from?.full_name || 'Unknown User'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Transfer type:</p>
                              <p className="font-medium">{request.transfer_type === 'account' ? 'To Bank Account' : 'To Cash Drawer'}</p>
                            </div>
                          </div>
                          {request.reason && (
                            <div>
                              <p className="text-muted-foreground text-sm">Reason:</p>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Requested: {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleTransferAction(request, 'approve')}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleTransferAction(request, 'reject')}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Transfer Request
            </DialogTitle>
            <DialogDescription>
              {selectedTransfer && (
                <>
                  {actionType === 'approve' 
                    ? `Confirm approval of ${formatAmount(selectedTransfer.amount)} transfer from ${selectedTransfer.profiles_from?.full_name || 'Unknown User'}.`
                    : `Confirm rejection of ${formatAmount(selectedTransfer.amount)} transfer from ${selectedTransfer.profiles_from?.full_name || 'Unknown User'}.`
                  }
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedTransfer && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Amount:</p>
                    <p>{formatAmount(selectedTransfer.amount)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Type:</p>
                    <p>{selectedTransfer.transfer_type === 'account' ? 'Bank Transfer' : 'Cash Drawer Transfer'}</p>
                  </div>
                  <div>
                    <p className="font-medium">From:</p>
                    <p>{selectedTransfer.profiles_from?.full_name || 'Unknown User'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Requested:</p>
                    <p>{new Date(selectedTransfer.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {selectedTransfer.reason && (
                  <div className="mt-2">
                    <p className="font-medium text-sm">Reason:</p>
                    <p className="text-sm text-muted-foreground">{selectedTransfer.reason}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="action-notes">Notes (Optional)</Label>
              <Textarea
                id="action-notes"
                placeholder="Add any notes about this decision..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setActionDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={processTransferAction}
                disabled={processingAction}
                className={`flex-1 ${
                  actionType === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingAction ? 'Processing...' : (actionType === 'approve' ? 'Approve Transfer' : 'Reject Transfer')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}