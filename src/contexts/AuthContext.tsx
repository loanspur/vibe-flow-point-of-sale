import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier' | 'user';
type ViewMode = 'superadmin' | 'tenant';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  viewMode: ViewMode;
  tenantId: string | null;
  canSwitchViews: boolean;
  switchViewMode: (mode: ViewMode) => void;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
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
  const [viewMode, setViewMode] = useState<ViewMode>('tenant');

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
        setViewMode('tenant');
        return;
      }

      if (profile) {
        setUserRole(profile.role);
        setTenantId(profile.tenant_id);
        
        // Only auto-set view mode for new sessions, not when switching
        if (profile.role === 'superadmin' && viewMode === 'tenant') {
          // Keep current view mode when switching, don't auto-change
        } else if (profile.role === 'superadmin') {
          setViewMode('superadmin');
        } else {
          setViewMode('tenant');
        }
      } else {
        // Fallback if no profile found
        setUserRole('user');
        setTenantId(null);
        setViewMode('tenant');
      }
    } catch (error) {
      console.warn('Failed to fetch user info:', error);
      // Set default values on error
      setUserRole('user');
      setTenantId(null);
      setViewMode('tenant');
    }
  };

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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserInfo(session.user.id);
          
          // Log login activity
          if (event === 'SIGNED_IN') {
            logUserActivity('login', session.user.id);
          }
        } else {
          // Log logout activity for previous user if we had one
          if (event === 'SIGNED_OUT' && user) {
            logUserActivity('logout', user.id);
          }
          
          setUserRole(null);
          setTenantId(null);
          setViewMode('tenant');
        }
        
        setLoading(false);
      }
    );

    // Get initial session with better error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Session fetch error:', error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserInfo(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.warn('Auth initialization failed:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    return { error };
  };

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

  const switchViewMode = (mode: ViewMode) => {
    if (canSwitchViews) {
      setViewMode(mode);
    }
  };

  // Determine if user can switch views (only superadmins can switch)
  const canSwitchViews = userRole === 'superadmin';

  const value = {
    user,
    session,
    loading,
    userRole,
    viewMode,
    tenantId,
    canSwitchViews,
    switchViewMode,
    signUp,
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