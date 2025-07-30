import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { createCashDrawerJournalEntry } from '@/lib/accounting-integration';

export interface CashDrawer {
  id: string;
  tenant_id: string;
  user_id: string;
  drawer_name: string;
  current_balance: number;
  opening_balance: number;
  opened_at: string | null;
  closed_at: string | null;
  status: 'open' | 'closed' | 'suspended';
  location_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashTransaction {
  id: string;
  tenant_id: string;
  cash_drawer_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  performed_by: string;
  approved_by: string | null;
  transaction_date: string;
  created_at: string;
}

export interface CashTransferRequest {
  id: string;
  tenant_id: string;
  from_drawer_id: string;
  to_drawer_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransferRequest {
  id: string;
  tenant_id: string;
  cash_drawer_id: string;
  requested_by: string;
  amount: number;
  bank_account_name: string;
  reference_number: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useCashDrawer = () => {
  const { user, tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const [currentDrawer, setCurrentDrawer] = useState<CashDrawer | null>(null);
  const [allDrawers, setAllDrawers] = useState<CashDrawer[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [transferRequests, setTransferRequests] = useState<CashTransferRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch current user's drawer
  const fetchCurrentDrawer = async () => {
    if (!user?.id || !tenantId) {
      console.log('Missing user or tenant:', { userId: user?.id, tenantId });
      return;
    }

    try {
      console.log('Fetching cash drawer for:', { userId: user.id, tenantId });
      
      const { data, error } = await supabase
        .from('cash_drawers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching drawer:', error);
        return;
      }

      console.log('Cash drawer data:', data);
      setCurrentDrawer(data as CashDrawer);
    } catch (error) {
      console.error('Error fetching current drawer:', error);
    }
  };

  // Fetch all drawers for transfers
  const fetchAllDrawers = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('cash_drawers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching all drawers:', error);
        return;
      }

      setAllDrawers((data as CashDrawer[]) || []);
    } catch (error) {
      console.error('Error fetching all drawers:', error);
    }
  };

  // Fetch transactions for current drawer
  const fetchTransactions = async () => {
    if (!currentDrawer?.id) return;

    try {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('cash_drawer_id', currentDrawer.id)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Fetch transfer requests
  const fetchTransferRequests = async () => {
    if (!user?.id || !tenantId) return;

    try {
      const { data, error } = await supabase
        .from('cash_transfer_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfer requests:', error);
        return;
      }

      setTransferRequests((data as CashTransferRequest[]) || []);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
    }
  };

  // Create or get drawer for current user
  const initializeDrawer = async () => {
    if (!user?.id || !tenantId) return;

    try {
      const { data, error } = await supabase
        .from('cash_drawers')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          drawer_name: 'Main Cash Drawer',
          status: 'closed'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating drawer:', error);
        toast.error('Failed to initialize cash drawer');
        return;
      }

      setCurrentDrawer(data as CashDrawer);
      toast.success('Cash drawer initialized');
    } catch (error) {
      console.error('Error initializing drawer:', error);
      toast.error('Failed to initialize cash drawer');
    }
  };

  // Open drawer
  const openDrawer = async (openingBalance: number) => {
    if (!currentDrawer?.id) return;

    try {
      // Update drawer status and balance directly
      const { error } = await supabase
        .from('cash_drawers')
        .update({
          status: 'open',
          opening_balance: openingBalance,
          current_balance: openingBalance,
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDrawer.id);

      if (error) {
        console.error('Error opening drawer:', error);
        toast.error('Failed to open cash drawer');
        return;
      }

      // Record opening transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('cash_transactions')
        .insert({
          tenant_id: tenantId,
          cash_drawer_id: currentDrawer.id,
          transaction_type: 'opening_balance',
          amount: openingBalance,
          balance_after: openingBalance,
          description: 'Cash drawer opened',
          performed_by: user?.id
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Error recording opening transaction:', transactionError);
      } else if (transactionData) {
        // Create accounting journal entry for opening balance
        try {
          await createCashDrawerJournalEntry(tenantId, {
            transactionId: transactionData.id,
            transactionType: 'opening_balance',
            amount: openingBalance,
            description: 'Cash drawer opened',
            performedBy: user.id
          });
        } catch (accountingError) {
          console.warn('Failed to create accounting entry for cash drawer opening:', accountingError);
        }
      }

      await fetchCurrentDrawer();
      await fetchTransactions();
      toast.success('Cash drawer opened successfully');
    } catch (error) {
      console.error('Error opening drawer:', error);
      toast.error('Failed to open cash drawer');
    }
  };

  // Close drawer
  const closeDrawer = async () => {
    if (!currentDrawer?.id) return;

    try {
      const { error } = await supabase
        .from('cash_drawers')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDrawer.id);

      if (error) {
        console.error('Error closing drawer:', error);
        toast.error('Failed to close cash drawer');
        return;
      }

      // Record closing transaction
      await supabase
        .from('cash_transactions')
        .insert({
          tenant_id: tenantId,
          cash_drawer_id: currentDrawer.id,
          transaction_type: 'closing_balance',
          amount: currentDrawer.current_balance,
          balance_after: currentDrawer.current_balance,
          description: 'Cash drawer closed',
          performed_by: user?.id
        });

      await fetchCurrentDrawer();
      await fetchTransactions();
      toast.success('Cash drawer closed successfully');
    } catch (error) {
      console.error('Error closing drawer:', error);
      toast.error('Failed to close cash drawer');
    }
  };

  // Create transfer request with overdraw protection
  const createTransferRequest = async (toDrawerId: string, amount: number, reason?: string) => {
    if (!currentDrawer?.id || !user?.id || !tenantId) return;

    try {
      // Check if source drawer has sufficient balance
      if (currentDrawer.current_balance < amount) {
        toast.error(`Insufficient funds. Available: ${formatCurrency(currentDrawer.current_balance)}, Requested: ${formatCurrency(amount)}`);
        return;
      }

      const { error } = await supabase
        .from('cash_transfer_requests')
        .insert({
          tenant_id: tenantId,
          from_drawer_id: currentDrawer.id,
          to_drawer_id: toDrawerId,
          from_user_id: user.id,
          to_user_id: allDrawers.find(d => d.id === toDrawerId)?.user_id,
          amount,
          reason,
          status: 'pending' // Always start as pending for admin approval
        });

      if (error) {
        console.error('Error creating transfer request:', error);
        toast.error('Failed to create transfer request');
        return;
      }

      await fetchTransferRequests();
      toast.success('Transfer request created successfully and awaiting approval');
      // Return true to indicate success so calling components can refresh their data
      return true;
    } catch (error) {
      console.error('Error creating transfer request:', error);
      toast.error('Failed to create transfer request');
      return false;
    }
  };

  // Respond to transfer request
  const respondToTransferRequest = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      console.log('🔄 Processing transfer request:', { requestId, action });
      
      const { error } = await supabase.rpc('process_cash_transfer_request', {
        transfer_request_id_param: requestId,
        action_param: action
      });

      if (error) {
        console.error('❌ Error processing transfer:', error);
        toast.error(`Failed to process transfer request: ${error.message}`);
        return;
      }

      console.log('✅ Transfer request processed successfully');
      
      // Force refresh of all cash drawer data
      await Promise.all([
        fetchTransferRequests(),
        fetchCurrentDrawer(),
        fetchAllDrawers(),
        fetchTransactions()
      ]);
      
      toast.success(`Transfer request ${action} successfully`);
    } catch (error) {
      console.error('❌ Error responding to transfer:', error);
      toast.error('Failed to process transfer request');
    }
  };

  // Record cash transaction
  const recordCashTransaction = async (
    type: string, 
    amount: number, 
    description: string, 
    referenceType?: string, 
    referenceId?: string
  ) => {
    if (!currentDrawer?.id || !tenantId || !user?.id) return;

    try {
      const newBalance = currentDrawer.current_balance + amount;

      const { data: transactionData, error } = await supabase
        .from('cash_transactions')
        .insert({
          tenant_id: tenantId,
          cash_drawer_id: currentDrawer.id,
          transaction_type: type,
          amount,
          balance_after: newBalance,
          reference_type: referenceType,
          reference_id: referenceId,
          description,
          performed_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording transaction:', error);
        return;
      }

      // Create accounting journal entry
      if (transactionData) {
        try {
          await createCashDrawerJournalEntry(tenantId, {
            transactionId: transactionData.id,
            transactionType: type,
            amount,
            description,
            referenceType,
            referenceId,
            performedBy: user.id
          });
        } catch (accountingError) {
          console.warn('Failed to create accounting entry for cash transaction:', accountingError);
        }
      }

      // Update drawer balance
      await supabase
        .from('cash_drawers')
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDrawer.id);

      await fetchCurrentDrawer();
      await fetchTransactions();
    } catch (error) {
      console.error('Error recording cash transaction:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCurrentDrawer();
      await fetchAllDrawers();
      await fetchTransferRequests();
      setLoading(false);
    };

    loadData();
  }, [user?.id, tenantId]);

  useEffect(() => {
    if (currentDrawer?.id) {
      fetchTransactions();
    }
  }, [currentDrawer?.id]);

  const refresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCurrentDrawer(),
        fetchAllDrawers(), 
        fetchTransactions(),
        fetchTransferRequests()
      ]);
    } catch (error) {
      console.error('Error refreshing cash drawer data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
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
    recordCashTransaction,
    refresh
  };
};