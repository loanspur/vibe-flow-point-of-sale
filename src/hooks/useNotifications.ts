import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  data: any;
  channels: string[];
  is_read: boolean;
  read_at?: string;
  created_at: string;
  expires_at?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const createNotification = async (
    type: string,
    title: string,
    message: string,
    options?: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      data?: Record<string, any>;
      channels?: string[];
      scheduledFor?: Date;
      expiresAt?: Date;
    }
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          tenant_id: user.user_metadata?.tenant_id,
          user_id: user.id,
          type: type as any,
          title: title,
          message: message,
          data: options?.data || {},
          channels: options?.channels || ['in_app'],
          priority: options?.priority || 'medium',
          scheduled_for: options?.scheduledFor?.toISOString() || new Date().toISOString(),
          expires_at: options?.expiresAt?.toISOString() || null
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchNotifications();
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Set up real-time subscription
      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    createNotification
  };
};