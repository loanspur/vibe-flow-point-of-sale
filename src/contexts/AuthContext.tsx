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
      console.log(`🔐 FETCHING: About to query profiles table for user ${userId}`);
      
      // Get user role from profiles with optimized query
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, tenant_id, require_password_change')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      console.log(`🔐 FETCHING: Query completed. Profile:`, profile, 'Error:', error);

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching user profile:', error);
        setUserRole('user');
        // Use domain tenant if available, otherwise null
        const domainTenantId = domainManager.getDomainTenantId();
        setTenantId(domainTenantId || null);
        setRequirePasswordChange(false);
        console.log(`🔐 FETCHING: Set fallback values due to error`);
        return;
      }

      if (profile) {
        // Check if we're setting the same data repeatedly BEFORE logging
        if (userRole === profile.role && tenantId === profile.tenant_id && requirePasswordChange === (profile.require_password_change || false)) {
          return; // Skip update and logging if data hasn't changed
        }
        
        console.log(`User profile loaded:`, profile);
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
        console.log(`🔐 FETCHING: Set default values - no profile found`);
      }
    } catch (error) {
      console.warn('Failed to fetch user info:', error);
      // Set default values on error
      setUserRole('user');
      setTenantId(null);
      setRequirePasswordChange(false);
      console.log(`🔐 FETCHING: Set default values due to exception:`, error);
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

  // Optimized - removed window focus refresh to prevent constant reloads and performance issues
  useEffect(() => {
    if (!user) return;
    
    // Only set initial profile state, remove focus refreshing to prevent flickering
    if (!profileFetched || profileFetched !== user.id) {
      setProfileFetched(user.id);
    }
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
        console.log(`🔄 AUTH STATE CHANGE: ${event}`, { 
          sessionExists: !!session, 
          userExists: !!session?.user,
          currentPath: window.location.pathname,
          timestamp: Date.now()
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
                
                // Log login activity and mark invitation as accepted
                if (event === 'SIGNED_IN') {
                  logUserActivity('login', session.user.id);
                  markInvitationAccepted(session.user);
                }
              }
            }, 0);
          } else {
            // Profile already fetched
            setLoading(false);
            
            // Still mark invitation as accepted on signin
            if (event === 'SIGNED_IN') {
              markInvitationAccepted(session.user);
            }
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

  // Mark invitation as accepted when user signs in
  const markInvitationAccepted = async (user: any) => {
    try {
      const uid = user.id;
      if (!uid) return;

      console.log('🎯 Marking invitation as accepted for user:', uid);

      // First, update profile invite status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          invitation_status: 'accepted', 
          invitation_accepted_at: new Date().toISOString() 
        })
        .eq('user_id', uid);

      if (profileError) {
        console.warn('Failed to update profile invitation status:', profileError);
      } else {
        console.log('✅ Profile invitation status updated successfully');
      }

      // Get tenant ID from multiple sources to ensure we find it
      let tenantId: string | null = null;
      
      // Try getting from user metadata first
      const metaTenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;
      if (metaTenantId) {
        tenantId = metaTenantId;
        console.log('📋 Found tenant ID in user metadata:', tenantId);
      }
      
      // Fallback to RPC function
      if (!tenantId) {
        const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
        tenantId = tenantData as string;
        console.log('📋 Found tenant ID via RPC:', tenantId);
      }
      
      // Final fallback: check existing profile
      if (!tenantId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', uid)
          .maybeSingle();
        tenantId = profile?.tenant_id;
        console.log('📋 Found tenant ID in profile:', tenantId);
      }
      
      if (tenantId) {
        console.log('🏢 Updating tenant_users for tenant:', tenantId);
        
        // Update all tenant_users records for this user in this tenant
        const { error: tenantUserError } = await supabase
          .from('tenant_users')
          .update({
            invitation_status: 'accepted',
            invitation_accepted_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('user_id', uid)
          .eq('tenant_id', tenantId);

        if (tenantUserError) {
          console.warn('Failed to update tenant_users invitation status:', tenantUserError);
        } else {
          console.log('✅ Tenant_users invitation status updated successfully');
        }

        // Also update any records that are specifically pending
        const { error: pendingError } = await supabase
          .from('tenant_users')
          .update({
            invitation_status: 'accepted',
            invitation_accepted_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('user_id', uid)
          .eq('tenant_id', tenantId)
          .eq('invitation_status', 'pending');

        if (pendingError) {
          console.warn('Failed to update pending tenant_users records:', pendingError);
        }
      } else {
        console.warn('⚠️ No tenant ID found for user, skipping tenant_users update');
      }
    } catch (e) {
      console.error('❌ Failed to mark invitation as accepted:', e);
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
  // Add timeout to prevent infinite loading on new devices
  const [authTimeout, setAuthTimeout] = useState(false);
  
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('Auth loading timeout reached, forcing render');
        setLoading(false);
        setAuthTimeout(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading && !authTimeout) {
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