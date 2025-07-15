import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { FileText, Download, TrendingUp, TrendingDown, Building, CreditCard } from 'lucide-react';

interface BalanceSheetItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type_name: string;
  account_type_category: string;
  balance: number;
}

interface IncomeStatementItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type_name: string;
  account_type_category: string;
  balance: number;
}

export default function FinancialStatements() {
  const { tenantId } = useAuth();
  const { toast } = useToast();

  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetItem[]>([]);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  // Update date range based on period selection
  useEffect(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'current_month':
        setDateRange({
          start: startOfMonth(now),
          end: endOfMonth(now)
        });
        break;
      case 'current_year':
        setDateRange({
          start: startOfYear(now),
          end: endOfYear(now)
        });
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        setDateRange({
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        });
        break;
      case 'last_year':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        setDateRange({
          start: startOfYear(lastYear),
          end: endOfYear(lastYear)
        });
        break;
    }
  }, [selectedPeriod]);

  // Fetch balance sheet data
  const fetchBalanceSheetData = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          code,
          name,
          balance,
          account_types (
            name,
            category
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('account_types.category', ['assets', 'liabilities', 'equity'])
        .order('code');

      if (error) throw error;

      const formattedData = data?.map(account => ({
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_type_name: account.account_types?.name || 'Unknown',
        account_type_category: account.account_types?.category || 'assets',
        balance: account.balance || 0
      })) || [];

      setBalanceSheetData(formattedData);
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      toast({ title: "Error", description: "Failed to fetch balance sheet data", variant: "destructive" });
    }
  };

  // Fetch income statement data
  const fetchIncomeStatementData = async () => {
    if (!tenantId) return;

    try {
      // For income statement, we need to calculate balances based on the date range
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          code,
          name,
          account_types (
            name,
            category
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('account_types.category', ['income', 'expenses'])
        .order('code');

      if (error) throw error;

      // Calculate period balance for each account using the get_account_balance function
      const accountsWithBalances = await Promise.all(
        data?.map(async (account) => {
          const { data: balanceData, error: balanceError } = await supabase
            .rpc('get_account_balance', {
              account_id_param: account.id,
              as_of_date: format(dateRange.end, 'yyyy-MM-dd')
            });

          if (balanceError) {
            console.error('Error fetching account balance:', balanceError);
            return {
              account_id: account.id,
              account_code: account.code,
              account_name: account.name,
              account_type_name: account.account_types?.name || 'Unknown',
              account_type_category: account.account_types?.category || 'income',
              balance: 0
            };
          }

          return {
            account_id: account.id,
            account_code: account.code,
            account_name: account.name,
            account_type_name: account.account_types?.name || 'Unknown',
            account_type_category: account.account_types?.category || 'income',
            balance: balanceData || 0
          };
        }) || []
      );

      setIncomeStatementData(accountsWithBalances);
    } catch (error) {
      console.error('Error fetching income statement data:', error);
      toast({ title: "Error", description: "Failed to fetch income statement data", variant: "destructive" });
    }
  };

  // Load financial statements
  const loadStatements = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBalanceSheetData(), fetchIncomeStatementData()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadStatements();
    }
  }, [tenantId, dateRange]);

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const groupAccountsByType = (accounts: any[], categories: string[]) => {
    return accounts
      .filter(account => categories.includes(account.account_type_category))
      .reduce((groups, account) => {
        const category = account.account_type_category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(account);
        return groups;
      }, {} as Record<string, any[]>);
  };

  const getCategoryTotal = (accounts: any[], category: string) => {
    return accounts
      .filter(account => account.account_type_category === category)
      .reduce((total, account) => total + account.balance, 0);
  };

  // Balance Sheet calculations
  const balanceSheetGroups = groupAccountsByType(balanceSheetData, ['assets', 'liabilities', 'equity']);
  const totalAssets = getCategoryTotal(balanceSheetData, 'assets');
  const totalLiabilities = getCategoryTotal(balanceSheetData, 'liabilities');
  const totalEquity = getCategoryTotal(balanceSheetData, 'equity');

  // Income Statement calculations
  const incomeStatementGroups = groupAccountsByType(incomeStatementData, ['income', 'expenses']);
  const totalIncome = getCategoryTotal(incomeStatementData, 'income');
  const totalExpenses = getCategoryTotal(incomeStatementData, 'expenses');
  const netIncome = totalIncome - totalExpenses;

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
          <p className="text-muted-foreground text-center">
            Financial statements require an active tenant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Financial Statements</h3>
          <p className="text-sm text-muted-foreground">Balance sheet and income statement</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_year">Current Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadStatements} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="balance_sheet" className="space-y-6">
        <TabsList>
          <TabsTrigger value="balance_sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income_statement">Income Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="balance_sheet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Balance Sheet</span>
              </CardTitle>
              <CardDescription>
                As of {format(dateRange.end, 'MMMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Assets */}
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span>Assets</span>
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceSheetGroups.assets?.map((account) => (
                        <TableRow key={account.account_id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{account.account_name}</span>
                              <span className="text-muted-foreground text-sm ml-2">({account.account_code})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                        </TableRow>
                      )) || []}
                      <TableRow className="font-semibold bg-muted">
                        <TableCell>Total Assets</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalAssets)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Liabilities */}
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-red-500" />
                    <span>Liabilities</span>
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceSheetGroups.liabilities?.map((account) => (
                        <TableRow key={account.account_id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{account.account_name}</span>
                              <span className="text-muted-foreground text-sm ml-2">({account.account_code})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                        </TableRow>
                      )) || []}
                      <TableRow className="font-semibold bg-muted">
                        <TableCell>Total Liabilities</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalLiabilities)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Equity */}
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>Equity</span>
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceSheetGroups.equity?.map((account) => (
                        <TableRow key={account.account_id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{account.account_name}</span>
                              <span className="text-muted-foreground text-sm ml-2">({account.account_code})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                        </TableRow>
                      )) || []}
                      <TableRow className="font-semibold bg-muted">
                        <TableCell>Total Equity</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalEquity)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Balance Check */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Liabilities & Equity</span>
                    <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span>Balance Check:</span>
                    <Badge
                      className={
                        Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }
                    >
                      {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
                        ? 'Balanced'
                        : `Difference: ${formatCurrency(totalAssets - (totalLiabilities + totalEquity))}`
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income_statement">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Income Statement</span>
              </CardTitle>
              <CardDescription>
                For the period {format(dateRange.start, 'MMMM dd, yyyy')} to {format(dateRange.end, 'MMMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Income */}
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>Income</span>
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeStatementGroups.income?.map((account) => (
                        <TableRow key={account.account_id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{account.account_name}</span>
                              <span className="text-muted-foreground text-sm ml-2">({account.account_code})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                        </TableRow>
                      )) || []}
                      <TableRow className="font-semibold bg-muted">
                        <TableCell>Total Income</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalIncome)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Expenses */}
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span>Expenses</span>
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeStatementGroups.expenses?.map((account) => (
                        <TableRow key={account.account_id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{account.account_name}</span>
                              <span className="text-muted-foreground text-sm ml-2">({account.account_code})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                        </TableRow>
                      )) || []}
                      <TableRow className="font-semibold bg-muted">
                        <TableCell>Total Expenses</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Net Income */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Net Income</span>
                    <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}