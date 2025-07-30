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
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft,
  Plus,
  FileText
} from 'lucide-react';
import { CashTransferModal } from './CashTransferModal';
import { CashTransactionHistory } from './CashTransactionHistory';
import { CashJournalReport } from './CashJournalReport';

export function CashDrawerManagement() {
  const { businessSettings } = useApp();
  const {
    currentDrawer,
    allDrawers,
    transactions,
    loading,
    initializeDrawer,
    openDrawer,
    closeDrawer,
    createTransferRequest
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
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Quick Transfer
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

      {/* Tabs for drawer-specific views */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="journal">Daily Journal</TabsTrigger>
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
      </Tabs>
    </div>
  );
}