import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { useCashDrawer } from '@/hooks/useCashDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users,
  ArrowRightLeft,
  Plus,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CashTransferModal } from './CashTransferModal';
import { CashTransactionHistory } from './CashTransactionHistory';
import { CashJournalReport } from './CashJournalReport';
import { EnhancedTransferRequests } from './EnhancedTransferRequests';

export function CashDrawerManagement() {
  const { businessSettings } = useApp();
  const {
    currentDrawer,
    allDrawers,
    transactions,
    transferRequests,
    loading,
    initializeDrawer,
    openDrawer,
    closeDrawer,
    createTransferRequest,
    respondToTransferRequest,
    recordCashTransaction
  } = useCashDrawer();

  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  const pendingRequests = transferRequests.filter(req => req.status === 'pending');

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
      {/* Cash Balance Card */}
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

            {pendingRequests.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    {pendingRequests.length} pending transfer request(s)
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transfer Cash
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

      {/* Tabs for different views */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Requests</TabsTrigger>
          <TabsTrigger value="enhanced-transfers">Transfer Management</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <CashTransactionHistory
            transactions={transactions.slice(0, 10)}
            formatAmount={formatAmount}
            getTransactionIcon={getTransactionIcon}
          />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Drawer Transfer Requests</CardTitle>
              <CardDescription>
                Manage cash transfer requests between cash drawers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transferRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No transfer requests found
                </p>
              ) : (
                <div className="space-y-3">
                  {transferRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {formatAmount(request.amount)} Transfer
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.reason || 'No reason provided'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {request.status}
                          </Badge>
                          {request.status === 'pending' && request.to_user_id === currentDrawer.user_id && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => respondToTransferRequest(request.id, 'approved')}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => respondToTransferRequest(request.id, 'rejected')}
                              >
                                Reject
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

        <TabsContent value="enhanced-transfers" className="space-y-4">
          <EnhancedTransferRequests formatAmount={formatAmount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}