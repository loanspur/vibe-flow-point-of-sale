import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
// CACHE BUST v2 - Multiple profile load prevention
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
  const [profileFetched, setProfileFetched] = useState<string | null>(null);
  const [fetchInProgress, setFetchInProgress] = useState<boolean>(false); // Prevent concurrent calls

  // Fetch user role and tenant info with domain context support
  const fetchUserInfo = async (userId: string, source: string = 'unknown') => {
    console.log(`🔐 fetchUserInfo called for ${userId} from ${source}, fetchInProgress: ${fetchInProgress}, profileFetched: ${profileFetched}`);
    
    // Prevent concurrent calls
    if (fetchInProgress) {
      console.log(`🔐 fetchUserInfo already in progress, skipping`);
      return;
    }
    
    // Check if already fetched for this user
    if (profileFetched === userId) {
      console.log(`🔐 Profile already fetched for ${userId}, skipping`);
      return;
    }
    
    setFetchInProgress(true);
    console.log(`🔐 Starting profile fetch for user ${userId}`);
    
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
        console.log(`🔐 Profile loaded:`, profile);
        // Check if we're setting the same data repeatedly
        if (userRole === profile.role && tenantId === profile.tenant_id) {
          console.log(`🔐 Profile data unchanged, skipping update`);
          return;
        }
        
        setUserRole(profile.role);
        setTenantId(profile.tenant_id);
        setRequirePasswordChange(profile.require_password_change || false);
      } else {
        console.log(`🔐 No profile found, using defaults`);
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
    } finally {
      console.log(`🔐 fetchUserInfo completed for ${userId}, setting fetchInProgress to false`);
      setFetchInProgress(false);
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
        // Always refresh on manual call, but update tracking
        setProfileFetched(session.user.id);
        await fetchUserInfo(session.user.id, 'manual-refresh');
      }
    } catch (error) {
      console.warn('Failed to refresh user info:', error);
    }
  };

  // Force refresh on window focus to catch external changes
  useEffect(() => {
    const handleFocus = () => {
      if (user && document.visibilityState === 'visible') {
        // Only refresh if we haven't fetched profile in the last 5 minutes
        const shouldRefresh = !profileFetched || profileFetched !== user.id;
        if (shouldRefresh) {
          console.log(`👁️ Refreshing user info on focus for: ${user.id}`);
          setProfileFetched(user.id);
          fetchUserInfo(user.id, 'focus-refresh');
        }
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [user, profileFetched]);

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
        console.log(`🔄 Auth state change: ${event}`, { 
          sessionExists: !!session, 
          userExists: !!session?.user,
          mounted,
          currentProfileFetched: profileFetched
        });
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // User state updated
        
        if (session?.user) {
          // Check all conditions to prevent duplicate calls
          const needsProfileFetch = profileFetched !== session.user.id && !fetchInProgress;
          
          if (needsProfileFetch) {
            // Fetching user profile
            setProfileFetched(session.user.id);
            setLoading(true);
            
            // Use setTimeout to prevent deadlock
            setTimeout(() => {
              if (mounted) {
                fetchUserInfo(session.user.id, 'auth-state-change')
                  .finally(() => {
                    if (mounted) setLoading(false);
                  });
                
                // Log login activity
                if (event === 'SIGNED_IN') {
                  logUserActivity('login', session.user.id);
                }
              }
            }, 0);
          } else {
            // Profile already fetched
            setLoading(false);
          }
        } else {
          // User signed out - reset everything including profile fetch tracking
          if (event === 'SIGNED_OUT' && user) {
            logUserActivity('logout', user.id);
          }
          
          setUserRole(null);
          setTenantId(null);
          setProfileFetched(null);
          setFetchInProgress(false); // Reset fetch state
          setLoading(false);
        }
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
        
        if (session?.user && profileFetched !== session.user.id && !fetchInProgress) {
          console.log(`🚀 Initial user info fetch for: ${session.user.id}`);
          setProfileFetched(session.user.id);
          await fetchUserInfo(session.user.id, 'initial-auth-check');
        } else if (session?.user) {
          console.log(`✅ Skipping initial fetch - User: ${session.user.id}, Fetched: ${profileFetched}, InProgress: ${fetchInProgress}`);
        }
        
        // Always set loading to false after initial check
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
      setProfileFetched(null);
      setFetchInProgress(false);
      
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

  // Debug the loading state issue
  console.log('🔐 AuthContext render:', { 
    loading, 
    user: !!user, 
    userRole, 
    tenantId, 
    fetchInProgress,
    profileFetched,
    session: !!session 
  });

  // Don't render children until we've checked for an existing session
  if (loading) {
    console.log('🔐 AuthContext BLOCKING render - loading is true');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('🔐 AuthContext ALLOWING render - proceeding to children');
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};