import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  tenantId: string | null;
  refreshUserInfo: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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

  // Fetch user role and tenant info
  const fetchUserInfo = async (userId: string) => {
    try {
      // Get user role from profiles with optimized query
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching user profile:', error);
        setUserRole('user');
        setTenantId(null);
        return;
      }

      if (profile) {
        console.log('User profile loaded:', profile);
        setUserRole(profile.role);
        setTenantId(profile.tenant_id);
      } else {
        console.log('No profile found, setting default role');
        // Fallback if no profile found
        setUserRole('user');
        setTenantId(null);
      }
    } catch (error) {
      console.warn('Failed to fetch user info:', error);
      // Set default values on error
      setUserRole('user');
      setTenantId(null);
    }
  };

  // Public function to refresh user info
  const refreshUserInfo = async () => {
    if (user) {
      await fetchUserInfo(user.id);
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
          // Use setTimeout to prevent deadlock
          setTimeout(() => {
            if (mounted) {
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
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    tenantId,
    refreshUserInfo,
    signIn,
    signOut
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