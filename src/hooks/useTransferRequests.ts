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
      // Here you would implement the actual transfer logic
      // For cash drawer transfers, you'd update balances
      // For user-to-user transfers, you might create wallet transactions
      // For payment method transfers, you'd update those accounts

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
      throw error;
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