import { supabase } from '@/integrations/supabase/client';

export const fixUserTenant = async (email: string) => {
  try {
    console.log('Attempting to fix tenant for user:', email);
    
    // First, get the user's profile to see their current state
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('user_id', '%')
      .limit(10);
    
    console.log('All profiles:', profiles);
    
    // Since we can't access auth.users directly, let's check if current user needs fixing
    const { data: { user }, error: getCurrentUserError } = await supabase.auth.getUser();
    
    if (getCurrentUserError || !user) {
      return { success: false, error: 'No authenticated user found' };
    }
    
    console.log('Current user:', user.id, user.email);
    
    // Check if user has a profile
    const { data: profile, error: getProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    console.log('User profile:', profile, 'Error:', getProfileError);
    
    // If user has no tenant_id, set up a tenant
    if (!profile?.tenant_id) {
      console.log('User has no tenant, creating one...');
      
      const { data: tenantData, error: tenantError } = await supabase.functions.invoke('setup-missing-tenant', {
        body: {
          businessName: user.user_metadata?.business_name || 'My Business',
          ownerName: user.user_metadata?.full_name || 'Business Owner'
        }
      });
      
      console.log('Tenant creation result:', { tenantData, tenantError });
      
      if (tenantError) {
        return { success: false, error: tenantError.message };
      }
      
      return { success: true, message: 'Tenant created successfully' };
    }
    
    return { success: true, message: 'User already has a tenant' };
    
  } catch (error: any) {
    console.error('Error fixing user tenant:', error);
    return { success: false, error: error.message };
  }
};