import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountingDashboard from './accounting/AccountingDashboard';
import ChartOfAccounts from './accounting/ChartOfAccounts';
import TransactionManagement from './accounting/TransactionManagement';
import FinancialStatements from './accounting/FinancialStatements';
import AccountsReceivablePayable from './AccountsReceivablePayable';
import EssentialJournals from './accounting/EssentialJournals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3,
  Building,
  FileText,
  TrendingUp,
  Receipt,
  Plus
} from 'lucide-react';

export default function AccountingModule() {
  const { user, tenantId } = useAuth();

  // Setup default accounts when the accounting module is accessed
  useEffect(() => {
    const setupDefaultAccounts = async () => {
      if (!tenantId) return;
      
      try {
        await supabase.rpc('setup_default_accounts', {
          tenant_id_param: tenantId
        });
      } catch (error) {
        console.error('Error setting up default accounts:', error);
      }
    };

    setupDefaultAccounts();
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Accounting & Finance</h2>
          <p className="text-muted-foreground">Complete accounting system with financial management</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="journals" className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Essential Journals</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center space-x-2">
            <Building className="w-4 h-4" />
            <span>Chart of Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="statements" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Financial Statements</span>
          </TabsTrigger>
          <TabsTrigger value="ar_ap" className="flex items-center space-x-2">
            <Receipt className="w-4 h-4" />
            <span>AR/AP</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AccountingDashboard />
        </TabsContent>

        <TabsContent value="journals">
          <EssentialJournals />
        </TabsContent>

        <TabsContent value="accounts">
          <ChartOfAccounts />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionManagement />
        </TabsContent>

        <TabsContent value="statements">
          <FinancialStatements />
        </TabsContent>

        <TabsContent value="ar_ap">
          <AccountsReceivablePayable />
        </TabsContent>
      </Tabs>
    </div>
  );
}