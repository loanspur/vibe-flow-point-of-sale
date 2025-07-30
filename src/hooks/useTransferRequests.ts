import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TransferRequest {
  id: string;
  tenant_id: string;
  transfer_type: 'cash_drawer' | 'user_to_user' | 'payment_method';
  amount: number;
  currency_code: string;
  from_user_id: string;
  from_drawer_id?: string;
  from_payment_method_id?: string;
  to_user_id: string;
  to_drawer_id?: string;
  to_payment_method_id?: string;
  reason?: string;
  notes?: string;
  reference_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  requested_at: string;
  responded_at?: string;
  completed_at?: string;
  responded_by?: string;
  created_at: string;
  updated_at: string;
}

export function useTransferRequests() {
  const { user, tenantId } = useAuth();
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransferRequests = async () => {
    if (!tenantId || !user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransferRequests((data || []) as TransferRequest[]);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToTransferRequest = async (
    requestId: string, 
    status: 'approved' | 'rejected', 
    notes?: string
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status,
          responded_at: new Date().toISOString(),
          responded_by: user.id,
          notes: notes || null
        })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, we might need to process the actual transfer
      if (status === 'approved') {
        await processApprovedTransfer(requestId);
      }

      // Refresh the list
      await fetchTransferRequests();
    } catch (error) {
      console.error('Error responding to transfer request:', error);
      throw error;
    }
  };

  const processApprovedTransfer = async (requestId: string) => {
    // Find the request
    const request = transferRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      if (request.transfer_type === 'cash_drawer') {
        // Call the existing cash drawer transfer function for cash-to-cash transfers
        await supabase.rpc('process_cash_transfer', {
          transfer_request_id_param: requestId,
          action_param: 'approved',
          notes_param: 'Auto-processed approved transfer'
        });
      } else if (request.transfer_type === 'payment_method') {
        // For payment method transfers, we need to:
        // 1. Deduct from cash drawer
        // 2. Create accounting entries
        // 3. Update cash transactions
        await processPaymentMethodTransfer(request);
      }

      // Mark as completed
      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error('Error processing approved transfer:', error);
      
      // Mark as failed if processing fails
      await supabase
        .from('transfer_requests')
        .update({
          status: 'rejected',
          notes: `Processing failed: ${error.message}`,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      throw error;
    }
  };

  const processPaymentMethodTransfer = async (request: TransferRequest) => {
    if (!request.from_drawer_id) return;

    // 1. Get current drawer balance first
    const { data: currentDrawer, error: drawerFetchError } = await supabase
      .from('cash_drawers')
      .select('current_balance')
      .eq('id', request.from_drawer_id)
      .single();

    if (drawerFetchError) throw drawerFetchError;

    const newBalance = currentDrawer.current_balance - request.amount;

    // 2. Create cash transaction for the deduction
    const { error: cashError } = await supabase
      .from('cash_transactions')
      .insert({
        tenant_id: request.tenant_id,
        cash_drawer_id: request.from_drawer_id,
        transaction_type: 'transfer_out',
        amount: -request.amount, // Negative for outgoing
        balance_after: newBalance,
        description: `Transfer to payment method - ${request.reason || 'No reason'}`,
        reference_type: 'transfer_request',
        reference_id: request.id,
        performed_by: request.from_user_id,
        approved_by: request.responded_by,
        transaction_date: new Date().toISOString()
      });

    if (cashError) throw cashError;
    // 3. Update cash drawer balance
    const { error: drawerUpdateError } = await supabase
      .from('cash_drawers')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.from_drawer_id);

    if (drawerUpdateError) throw drawerUpdateError;

    // 4. Create accounting transaction
    const transactionNumber = `TR-${Date.now()}`;
    
    const { data: accountingTransaction, error: transactionError } = await supabase
      .from('accounting_transactions')
      .insert({
        tenant_id: request.tenant_id,
        transaction_number: transactionNumber,
        description: `Cash transfer to payment method - ${request.reference_number}`,
        transaction_date: new Date().toISOString().split('T')[0],
        total_amount: request.amount,
        reference_type: 'transfer_request',
        reference_id: request.id,
        created_by: request.responded_by || request.from_user_id,
        is_posted: true
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // 5. Create accounting entries (Cash debit, Payment Method credit)
    const { data: cashAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', request.tenant_id)
      .eq('name', 'Cash')
      .single();

    const { data: paymentMethodAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', request.tenant_id)
      .ilike('name', '%bank%')
      .single();

    if (cashAccount && paymentMethodAccount) {
      const { error: entriesError } = await supabase
        .from('accounting_entries')
        .insert([
          {
            transaction_id: accountingTransaction.id,
            account_id: cashAccount.id,
            debit_amount: 0,
            credit_amount: request.amount,
            description: 'Cash transfer out'
          },
          {
            transaction_id: accountingTransaction.id,
            account_id: paymentMethodAccount.id,
            debit_amount: request.amount,
            credit_amount: 0,
            description: 'Payment method transfer in'
          }
        ]);

      if (entriesError) throw entriesError;
    }
  };

  const cancelTransferRequest = async (requestId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'cancelled',
          responded_at: new Date().toISOString(),
          responded_by: user.id
        })
        .eq('id', requestId)
        .eq('from_user_id', user.id); // Only the requester can cancel

      if (error) throw error;
      await fetchTransferRequests();
    } catch (error) {
      console.error('Error cancelling transfer request:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchTransferRequests();
  }, [tenantId, user?.id]);

  // Set up real-time subscription for transfer requests
  useEffect(() => {
    if (!tenantId || !user?.id) return;

    const channel = supabase
      .channel('transfer-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_requests',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('Transfer request changed:', payload);
          fetchTransferRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, user?.id]);

  return {
    transferRequests,
    loading,
    fetchTransferRequests,
    respondToTransferRequest,
    cancelTransferRequest,
    pendingRequests: transferRequests.filter(r => r.status === 'pending'),
    myRequests: transferRequests.filter(r => r.from_user_id === user?.id),
    requestsForMe: transferRequests.filter(r => r.to_user_id === user?.id && r.status === 'pending')
  };
}