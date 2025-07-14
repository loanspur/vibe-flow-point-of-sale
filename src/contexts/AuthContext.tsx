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
      // Get user role from profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Set default values if profile doesn't exist
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
      console.error('Error fetching user info:', error);
      // Set default values on error
      setUserRole('user');
      setTenantId(null);
      setViewMode('tenant');
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserInfo(session.user.id);
        } else {
          setUserRole(null);
          setTenantId(null);
          setViewMode('tenant');
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserInfo(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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