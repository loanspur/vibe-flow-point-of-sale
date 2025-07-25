import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDeletionControl } from '@/hooks/useDeletionControl';

interface CrudOptions {
  tableName: string;
  entityName: string;
  enableDeletionControl?: boolean;
  onSuccess?: (action: 'create' | 'update' | 'delete', data?: any) => void;
  onError?: (action: 'create' | 'update' | 'delete', error: any) => void;
}

interface CrudState {
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

export function useCrudOperations<T = any>(options: CrudOptions) {
  const { tableName, entityName, enableDeletionControl = false, onSuccess, onError } = options;
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { canDelete, logDeletionAttempt } = useDeletionControl();

  const [state, setState] = useState<CrudState>({
    loading: false,
    creating: false,
    updating: false,
    deleting: false
  });

  const create = useCallback(async (data: Partial<T>) => {
    setState(prev => ({ ...prev, creating: true }));
    
    try {
      const insertData = tenantId ? { ...data, tenant_id: tenantId } : data;
      const { data: result, error } = await supabase
        .from(tableName as any)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: `${entityName} created`,
        description: `${entityName} has been successfully created.`,
      });

      onSuccess?.('create', result);
      return { data: result, error: null };
    } catch (error: any) {
      const errorMessage = error.message || `Failed to create ${entityName.toLowerCase()}`;
      toast({
        title: `Error creating ${entityName.toLowerCase()}`,
        description: errorMessage,
        variant: "destructive",
      });
      onError?.('create', error);
      return { data: null, error };
    } finally {
      setState(prev => ({ ...prev, creating: false }));
    }
  }, [tableName, entityName, tenantId, toast, onSuccess, onError]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    setState(prev => ({ ...prev, updating: true }));
    
    try {
      const { data: result, error } = await supabase
        .from(tableName as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: `${entityName} updated`,
        description: `${entityName} has been successfully updated.`,
      });

      onSuccess?.('update', result);
      return { data: result, error: null };
    } catch (error: any) {
      const errorMessage = error.message || `Failed to update ${entityName.toLowerCase()}`;
      toast({
        title: `Error updating ${entityName.toLowerCase()}`,
        description: errorMessage,
        variant: "destructive",
      });
      onError?.('update', error);
      return { data: null, error };
    } finally {
      setState(prev => ({ ...prev, updating: false }));
    }
  }, [tableName, entityName, toast, onSuccess, onError]);

  const remove = useCallback(async (id: string, itemName?: string) => {
    // Check deletion control if enabled
    if (enableDeletionControl) {
      if (!canDelete(entityName.toLowerCase())) {
        logDeletionAttempt(entityName.toLowerCase(), id, itemName);
        toast({
          title: "Deletion Disabled",
          description: `${entityName} deletion has been disabled to maintain audit trail and data integrity.`,
          variant: "destructive",
        });
        return { data: null, error: new Error('Deletion disabled') };
      }
    }

    setState(prev => ({ ...prev, deleting: true }));
    
    try {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: `${entityName} deleted`,
        description: `${entityName} has been successfully deleted.`,
      });

      onSuccess?.('delete', { id });
      return { data: { id }, error: null };
    } catch (error: any) {
      const errorMessage = error.message || `Failed to delete ${entityName.toLowerCase()}`;
      toast({
        title: `Error deleting ${entityName.toLowerCase()}`,
        description: errorMessage,
        variant: "destructive",
      });
      onError?.('delete', error);
      return { data: null, error };
    } finally {
      setState(prev => ({ ...prev, deleting: false }));
    }
  }, [tableName, entityName, enableDeletionControl, canDelete, logDeletionAttempt, toast, onSuccess, onError]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    if (enableDeletionControl && !canDelete(entityName.toLowerCase())) {
      toast({
        title: "Deletion Disabled",
        description: `${entityName} deletion has been disabled to maintain audit trail and data integrity.`,
        variant: "destructive",
      });
      return { data: null, error: new Error('Deletion disabled') };
    }

    setState(prev => ({ ...prev, deleting: true }));
    
    try {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: `${entityName}s deleted`,
        description: `${ids.length} ${entityName.toLowerCase()}(s) have been successfully deleted.`,
      });

      onSuccess?.('delete', { ids });
      return { data: { ids }, error: null };
    } catch (error: any) {
      const errorMessage = error.message || `Failed to delete ${entityName.toLowerCase()}s`;
      toast({
        title: `Error deleting ${entityName.toLowerCase()}s`,
        description: errorMessage,
        variant: "destructive",
      });
      onError?.('delete', error);
      return { data: null, error };
    } finally {
      setState(prev => ({ ...prev, deleting: false }));
    }
  }, [tableName, entityName, enableDeletionControl, canDelete, toast, onSuccess, onError]);

  return {
    ...state,
    create,
    update,
    remove,
    bulkDelete,
    canDelete: enableDeletionControl ? canDelete(entityName.toLowerCase()) : true
  };
}