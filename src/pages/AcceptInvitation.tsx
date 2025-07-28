import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

console.log("🚀 AcceptInvitation component rendering");

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    console.log("🔗 AcceptInvitation page loaded");
    console.log("🎫 Token from URL:", token);
    console.log("🔄 Type from URL:", type);
    console.log("🌐 Current URL:", window.location.href);
    console.log("🏠 Current hostname:", window.location.hostname);
    console.log("🔍 Full search params:", window.location.search);
    
    // Remove the type check since we're using custom invitation tokens
    if (!token) {
      console.log("❌ No token found, redirecting to home");
      navigate('/');
      return;
    } else {
      console.log("✅ Token found, staying on AcceptInvitation page");
    }
  }, [token, type, navigate]);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Invalid invitation",
        description: "The invitation link is invalid or has expired.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First, validate the invitation token and get invitation details
      const { data: invitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (invitationError || !invitation) {
        toast({
          title: "Invalid or expired invitation",
          description: "This invitation link is invalid or has expired. Please contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      // Get role information
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('name')
        .eq('id', invitation.role_id)
        .maybeSingle();

      // Get tenant information  
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', invitation.tenant_id)
        .maybeSingle();

      // Check if user already exists and handle accordingly
      let userToAdd;
      
      try {
        // Try to sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: invitation.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              tenant_id: invitation.tenant_id,
              role_id: invitation.role_id,
              invited_by: invitation.invited_by
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            // User exists, try to sign them in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: invitation.email,
              password: formData.password,
            });

            if (signInError) {
              toast({
                title: "Account exists with different password",
                description: "An account with this email already exists. Please use the correct password or contact your administrator.",
                variant: "destructive",
              });
              return;
            }

            userToAdd = signInData.user;
          } else {
            throw signUpError;
          }
        } else {
          userToAdd = authData.user;
        }
      } catch (error: any) {
        throw error;
      }

      if (userToAdd) {
        // Determine the role based on role name
        const roleName = roleData?.name || 'user';
        const profileRole = roleName.toLowerCase() === 'admin' ? 'admin' : 
                           roleName.toLowerCase() === 'manager' ? 'manager' : 'user';

        // Check if profile exists, if not create it
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', userToAdd.id)
          .maybeSingle();

        if (!existingProfile) {
          // Create new profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: userToAdd.id,
              full_name: formData.fullName,
              tenant_id: invitation.tenant_id,
              role: profileRole
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        } else {
          // Update existing profile with new tenant and role
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              tenant_id: invitation.tenant_id,
              role: profileRole,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userToAdd.id);

          if (profileError) {
            console.error('Profile update error:', profileError);
          }
        }

        // Create tenant-user relationship
        const { error: tenantUserError } = await supabase
          .from('tenant_users')
          .insert({
            user_id: userToAdd.id,
            tenant_id: invitation.tenant_id,
            role: roleName.toLowerCase(),
            is_active: true
          });

        if (tenantUserError && !tenantUserError.message.includes('duplicate key')) {
          console.error('Tenant user creation error:', tenantUserError);
        }

        // Assign the user their role
        const { error: roleError } = await supabase
          .from('user_role_assignments')
          .insert({
            user_id: userToAdd.id,
            role_id: invitation.role_id,
            tenant_id: invitation.tenant_id,
            assigned_by: invitation.invited_by
          });

        if (roleError && !roleError.message.includes('duplicate key')) {
          console.error('Role assignment error:', roleError);
        }

        // Update invitation status
        const { error: updateInvitationError } = await supabase
          .from('user_invitations')
          .update({ 
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('invitation_token', token);

        if (updateInvitationError) {
          console.error('Invitation update error:', updateInvitationError);
        }

        const companyName = tenantData?.name || 'the team';
        toast({
          title: "Welcome!",
          description: `Your account has been set up successfully. Welcome to ${companyName}!`,
        });

        // Redirect to login page for user to sign in
        navigate('/auth');
      }
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Complete your account setup to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                  placeholder="Choose a password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting up account..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}