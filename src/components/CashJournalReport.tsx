import { useState } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CashTransaction } from '@/hooks/useCashDrawer';
import { FileText, Download, Calendar } from 'lucide-react';

interface CashJournalReportProps {
  transactions: CashTransaction[];
  formatAmount: (amount: number) => string;
  onClose: () => void;
}

export function CashJournalReport({
  transactions,
  formatAmount,
  onClose
}: CashJournalReportProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.transaction_date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && transactionDate < start) return false;
    if (end && transactionDate > end) return false;
    return true;
  });

  const totalIn = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netChange = totalIn - totalOut;

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Type', 'Description', 'Amount', 'Balance After'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.transaction_date).toLocaleDateString(),
        t.transaction_type,
        `"${t.description}"`,
        t.amount,
        t.balance_after
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-journal-${startDate || 'all'}-to-${endDate || 'all'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Cash Journal Report
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        {/* Date Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Total In</p>
                <p className="text-lg font-bold text-green-800">{formatAmount(totalIn)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">Total Out</p>
                <p className="text-lg font-bold text-red-800">{formatAmount(totalOut)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Net Change</p>
                <p className={`text-lg font-bold ${netChange >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  {formatAmount(netChange)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transactions ({filteredTransactions.length})</CardTitle>
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.transaction_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.description}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-medium ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatAmount(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatAmount(transaction.balance_after)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  );
}