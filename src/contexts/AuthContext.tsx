import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { domainManager } from '@/lib/domain-manager';

// User roles are now dynamically managed via user_roles table
type UserRole = string; // Dynamic role from database

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  tenantId: string | null;
  requirePasswordChange: boolean;
  refreshUserInfo: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  // Fetch user role and tenant info with domain context support
  const fetchUserInfo = async (userId: string) => {
    try {
      // Get user role from profiles with optimized query
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, tenant_id, require_password_change')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching user profile:', error);
        setUserRole('user');
        // Use domain tenant if available, otherwise null
        const domainTenantId = domainManager.getDomainTenantId();
        setTenantId(domainTenantId || null);
        setRequirePasswordChange(false);
        return;
      }

      if (profile) {
        console.log('User profile loaded:', profile);
        setUserRole(profile.role);
        setTenantId(profile.tenant_id);
        setRequirePasswordChange(profile.require_password_change || false);
      } else {
        console.log('No profile found, setting default role');
        // Fallback if no profile found
        setUserRole('user');
        const domainTenantId = domainManager.getDomainTenantId();
        setTenantId(domainTenantId || null);
        setRequirePasswordChange(false);
      }
    } catch (error) {
      console.warn('Failed to fetch user info:', error);
      // Set default values on error
      setUserRole('user');
      setTenantId(null);
      setRequirePasswordChange(false);
    }
  };

  // Public function to refresh user info
  const refreshUserInfo = async () => {
    try {
      // Refresh the entire session to get updated user metadata
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Error refreshing session:', error);
        return;
      }
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      }
    } catch (error) {
      console.warn('Failed to refresh user info:', error);
    }
  };

  // Force refresh on window focus to catch external changes
  useEffect(() => {
    const handleFocus = () => {
      if (user && document.visibilityState === 'visible') {
        fetchUserInfo(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [user]);

  // Optimized activity logging function
  const logUserActivity = async (actionType: string, userId: string) => {
    // Run activity logging asynchronously without blocking UI
    setTimeout(async () => {
      try {
        // Get user agent immediately (no network call)
        const userAgent = navigator.userAgent;
        
        // Get tenant ID for the user with optimized query
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile?.tenant_id) {
          // Log activity without waiting for IP address to avoid delays
          await supabase.rpc('log_user_activity', {
            tenant_id_param: profile.tenant_id,
            user_id_param: userId,
            action_type_param: actionType,
            resource_type_param: null,
            resource_id_param: null,
            details_param: { timestamp: new Date().toISOString() },
            ip_address_param: null, // Skip IP lookup for better performance
            user_agent_param: userAgent
          });
        }
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.warn('Activity logging failed:', error);
      }
    }, 0);
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent deadlock and only fetch if we don't have profile data
          setTimeout(() => {
            if (mounted && (!userRole || !tenantId)) {
              console.log('📋 Fetching user info for:', session.user.id);
              fetchUserInfo(session.user.id);
              
              // Log login activity
              if (event === 'SIGNED_IN') {
                logUserActivity('login', session.user.id);
              }
            }
          }, 0);
        } else {
          // Log logout activity for previous user if we had one
          if (event === 'SIGNED_OUT' && user) {
            logUserActivity('logout', user.id);
          }
          
          setUserRole(null);
          setTenantId(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session with better error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.warn('Session fetch error:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserInfo(session.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        if (mounted) {
          console.warn('Auth initialization failed:', error);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove user.id dependency to prevent infinite loops


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear session state immediately to prevent multiple calls
      setSession(null);
      setUser(null);
      setUserRole(null);
      setTenantId(null);
      setRequirePasswordChange(false);
      
      await supabase.auth.signOut();
    } catch (error) {
      // Silent fail - user experience is more important than logout errors
      console.warn('Logout error (ignored):', error);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) return { error };

      // Update profile to remove password change requirement
      if (user) {
        await supabase
          .from('profiles')
          .update({ require_password_change: false })
          .eq('user_id', user.id);
        
        setRequirePasswordChange(false);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    tenantId,
    requirePasswordChange,
    refreshUserInfo,
    signIn,
    signOut,
    updatePassword
  };

  // Don't render children until we've checked for an existing session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};