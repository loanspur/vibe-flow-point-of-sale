import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
// CACHE BUST v2 - Multiple profile load prevention
import { supabase } from '@/integrations/supabase/client';
import { domainManager } from '@/lib/domain-manager';
import { tabStabilityManager } from '@/lib/tab-stability-manager';
import { PasswordChangeModal } from '@/components/PasswordChangeModal';

// User roles are now dynamically managed via user_roles table
type UserRole = 'user' | 'superadmin' | 'admin' | 'manager' | 'cashier';

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
  showPasswordChangeModal: boolean;
  setShowPasswordChangeModal: (show: boolean) => void;
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
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [profileFetched, setProfileFetched] = useState<string | null>(null);
  const [fetchInProgress, setFetchInProgress] = useState<boolean>(false); // Prevent concurrent calls

  // Optimized user info fetching with performance checks
  const fetchUserInfo = async (userId: string, source: string = 'unknown') => {
    // Performance check - don't fetch if tab is switching
    if (tabStabilityManager.shouldPreventQueryRefresh()) {
      return;
    }
    
    if (fetchInProgress || profileFetched === userId) {
      return;
    }
    
    setFetchInProgress(true);
    
    try {
      // Load profile for tenant context and base role (fallback)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, tenant_id, require_password_change')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        setUserRole('user');
        const domainTenantId = domainManager.getDomainTenantId();
        setTenantId(domainTenantId || null);
        setRequirePasswordChange(false);
        return;
      }

      let effectiveTenantId = profile?.tenant_id || domainManager.getDomainTenantId() || null;
      // Normalize profile role to unified roles
      const profileRoleRaw = (profile?.role || '').toString().toLowerCase();
      let effectiveRole: UserRole = (
        profileRoleRaw === 'administrator' ? 'admin' :
        profileRoleRaw === 'admin' ? 'admin' :
        profileRoleRaw === 'manager' ? 'manager' :
        profileRoleRaw === 'cashier' ? 'cashier' :
        'user'
      );

      // Prefer highest-level active role assignment for this tenant
      if (effectiveTenantId) {
        const { data: assignments } = await supabase
          .from('user_role_assignments')
          .select('is_active, role_id, user_roles!inner(name, level)')
          .eq('user_id', userId)
          .eq('tenant_id', effectiveTenantId)
          .eq('is_active', true);

        if (assignments && assignments.length > 0) {
          const highest = [...assignments].sort((a: any, b: any) => (a.user_roles?.level ?? 999) - (b.user_roles?.level ?? 999))[0];
          const name = (highest?.user_roles?.name || '').toString();
          // Normalize and constrain to allowed roles
          const normalized = ['administrator'].includes(name.toLowerCase()) ? 'admin' : name.toLowerCase();
          const mapped = (['superadmin','admin','manager','cashier','user'].includes(normalized) ? normalized : 'user') as UserRole;
          effectiveRole = mapped;
        }
      }

      // Skip update if no change
      const passwordChangeRequired = profile?.require_password_change || false;
      if (userRole === effectiveRole && tenantId === effectiveTenantId && requirePasswordChange === passwordChangeRequired) {
        return;
      }

      // Limit to known roles for type safety
      type AllowedRole = 'superadmin' | 'admin' | 'manager' | 'cashier' | 'user';
      const normalizedRole = (effectiveRole || 'user').toLowerCase();
      const safeRole = (['superadmin','admin','manager','cashier','user'].includes(normalizedRole) 
        ? normalizedRole 
        : 'user') as AllowedRole;
      setUserRole(safeRole);
      setTenantId(effectiveTenantId);
      setRequirePasswordChange(passwordChangeRequired);

      // Show password change modal if required
      if (passwordChangeRequired && !showPasswordChangeModal) {
        setShowPasswordChangeModal(true);
      }
    } catch (error) {
      // Set default values on error
      setUserRole('user');
      setTenantId(null);
      setRequirePasswordChange(false);
    } finally {
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
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check all conditions to prevent duplicate calls
          const needsProfileFetch = profileFetched !== session.user.id && !fetchInProgress;
          
          if (needsProfileFetch) {
            setProfileFetched(session.user.id);
            setLoading(true);
            
            fetchUserInfo(session.user.id, 'auth-state-change')
              .finally(() => {
                if (mounted) setLoading(false);
              });
            
            // Log login activity and mark invitation as accepted
            if (event === 'SIGNED_IN') {
              logUserActivity('login', session.user.id);
              markInvitationAccepted(session.user);
            }
          } else {
            setLoading(false);
            
            if (event === 'SIGNED_IN') {
              markInvitationAccepted(session.user);
            }
          }
        } else {
          if (event === 'SIGNED_OUT' && user) {
            logUserActivity('logout', user.id);
          }
          
          setUserRole(null);
          setTenantId(null);
          setProfileFetched(null);
          setFetchInProgress(false);
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
          setProfileFetched(session.user.id);
          await fetchUserInfo(session.user.id, 'initial-auth-check');
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

      // Check if invitation was already processed to prevent loops
      const inviteProcessedKey = `invite_processed_${uid}`;
      if (sessionStorage.getItem(inviteProcessedKey)) {
        return;
      }

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
      }

      // Get tenant ID from domain context first
      let tenantId: string | null = domainManager.getDomainTenantId();
      
      // Fallback to user metadata
      if (!tenantId) {
        const metaTenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id;
        if (metaTenantId) {
          tenantId = metaTenantId;
          
        }
      }
      
      // Final fallback: check existing profile (avoid RPC if possible)
      if (!tenantId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', uid)
          .maybeSingle();
        tenantId = profile?.tenant_id;
        
      }
      
      if (tenantId) {
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
        }
      }

      // Mark as processed to prevent future runs
      sessionStorage.setItem(inviteProcessedKey, 'true');
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
          .update({ 
            require_password_change: false,
            temp_password_created_at: null
          })
          .eq('user_id', user.id);
        
        setRequirePasswordChange(false);
        setShowPasswordChangeModal(false);
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
    updatePassword,
    showPasswordChangeModal,
    setShowPasswordChangeModal,
  };

  // Don't render children until we've checked for an existing session
  // Add timeout to prevent infinite loading on new devices
  const [authTimeout, setAuthTimeout] = useState(false);
  
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        setAuthTimeout(true);
      }, 5000); // Reduced timeout to 5 seconds
      
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
      
      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordChangeModal}
        onClose={() => setShowPasswordChangeModal(false)}
        onSuccess={() => {
          setShowPasswordChangeModal(false);
          setRequirePasswordChange(false);
        }}
        isRequired={requirePasswordChange}
      />
    </AuthContext.Provider>
  );
};