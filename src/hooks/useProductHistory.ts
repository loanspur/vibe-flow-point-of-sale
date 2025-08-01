import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ProductHistoryEntry {
  id: string;
  tenant_id: string;
  product_id: string;
  action_type: string;
  field_changed?: string;
  old_value?: any;
  new_value?: any;
  changed_by: string;
  change_reason?: string;
  metadata?: any;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ProductHistorySummary {
  total_changes: number;
  last_change_date: string | null;
  price_changes: number;
  stock_adjustments: number;
  status_changes: number;
  most_active_user: string | null;
}

export const useProductHistory = (productId: string) => {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Manual history tracking function
  const logProductChange = async (
    action_type: string,
    field_changed?: string,
    old_value?: any,
    new_value?: any,
    change_reason?: string
  ) => {
    if (!tenantId || !productId || !user) return;

    try {
      // For now, we'll use user_activity_logs table as fallback
      await supabase.from('user_activity_logs').insert({
        tenant_id: tenantId,
        user_id: user!.id,
        action_type: `product_${action_type}`,
        resource_type: 'product',
        resource_id: productId,
        details: {
          field_changed,
          old_value,
          new_value,
          change_reason,
          product_action: action_type
        }
      });
    } catch (error) {
      console.warn('Failed to log product change:', error);
    }
  };

  // Fetch product history from user_activity_logs as fallback
  const { data: history = [], isLoading, refetch } = useQuery({
    queryKey: ['product-history', productId, tenantId],
    queryFn: async (): Promise<ProductHistoryEntry[]> => {
      if (!productId || !tenantId) return [];

      try {
        // Try to fetch from activity logs as fallback
        const { data, error } = await supabase
          .from('user_activity_logs')
          .select(`
            id,
            action_type,
            resource_id,
            details,
            user_id,
            created_at,
            ip_address
          `)
          .eq('resource_type', 'product')
          .eq('resource_id', productId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Transform activity logs to match product history format
        return data.map((log: any) => ({
          id: log.id,
          tenant_id: tenantId,
          product_id: productId,
          action_type: log.action_type.replace('product_', ''),
          field_changed: log.details?.field_changed,
          old_value: log.details?.old_value,
          new_value: log.details?.new_value,
          changed_by: log.user_id,
          change_reason: log.details?.change_reason,
          metadata: log.details,
          created_at: log.created_at,
          ip_address: log.ip_address
        }));
      } catch (error) {
        console.warn('Could not fetch product history:', error);
        return [];
      }
    },
    enabled: !!productId && !!tenantId,
    staleTime: 30000, // 30 seconds
  });

  // Fetch user profiles for history entries
  const { data: userProfiles = {} } = useQuery({
    queryKey: ['user-profiles-history', history.map(h => h.changed_by)],
    queryFn: async () => {
      if (history.length === 0) return {};
      
      const userIds = [...new Set(history.map(h => h.changed_by))];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (error) throw error;
      
      return data.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: history.length > 0,
  });

  // Calculate summary from history data
  const summary: ProductHistorySummary = {
    total_changes: history.length,
    last_change_date: history.length > 0 ? history[0].created_at : null,
    price_changes: history.filter(h => h.action_type === 'price_change').length,
    stock_adjustments: history.filter(h => h.action_type === 'stock_adjustment').length,
    status_changes: history.filter(h => h.action_type === 'status_change').length,
    most_active_user: null // Could be calculated if needed
  };

  // Filter history based on search and action type
  const filteredHistory = history.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.field_changed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.change_reason?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'all' || entry.action_type === actionFilter;

    return matchesSearch && matchesAction;
  });

  return {
    history: filteredHistory,
    allHistory: history,
    summary,
    userProfiles,
    isLoading,
    searchTerm,
    setSearchTerm,
    actionFilter,
    setActionFilter,
    logProductChange,
    refetch
  };
};