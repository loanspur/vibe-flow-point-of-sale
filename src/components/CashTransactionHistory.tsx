import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CashTransaction } from '@/hooks/useCashDrawer';
import { Clock } from 'lucide-react';

interface CashTransactionHistoryProps {
  transactions: CashTransaction[];
  formatAmount: (amount: number) => string;
  getTransactionIcon: (type: string) => React.ReactNode;
}

export function CashTransactionHistory({
  transactions,
  formatAmount,
  getTransactionIcon
}: CashTransactionHistoryProps) {
  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'sale_payment': return 'Sale Payment';
      case 'change_issued': return 'Change Issued';
      case 'opening_balance': return 'Opening Balance';
      case 'closing_balance': return 'Closing Balance';
      case 'bank_deposit': return 'Bank Deposit';
      case 'expense_payment': return 'Expense Payment';
      case 'transfer_out': return 'Transfer Out';
      case 'transfer_in': return 'Transfer In';
      case 'adjustment': return 'Adjustment';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getAmountColor = (type: string, amount: number) => {
    if (['sale_payment', 'transfer_in', 'opening_balance'].includes(type) || amount > 0) {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Transactions
        </CardTitle>
        <CardDescription>
          Latest cash drawer transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No transactions found
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <p className="font-medium">
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${getAmountColor(transaction.transaction_type, transaction.amount)}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatAmount(transaction.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Balance: {formatAmount(transaction.balance_after)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}