import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

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
    // Remove the type check since we're using custom invitation tokens
    if (!token) {
      navigate('/');
      return;
    }
  }, [token, navigate]);

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
        .single();

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
        .single();

      // Get tenant information  
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', invitation.tenant_id)
        .single();

      // Sign up the user with Supabase Auth
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
        throw signUpError;
      }

      if (authData.user) {
        // Determine the role based on role name
        const roleName = roleData?.name || 'user';
        const profileRole = roleName.toLowerCase() === 'admin' ? 'admin' : 
                           roleName.toLowerCase() === 'manager' ? 'manager' : 'user';

        // Create/update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: authData.user.id,
            full_name: formData.fullName,
            tenant_id: invitation.tenant_id,
            role: profileRole,
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Create tenant-user relationship
        const { error: tenantUserError } = await supabase
          .from('tenant_users')
          .insert({
            user_id: authData.user.id,
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
            user_id: authData.user.id,
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

        // Sign in the user automatically
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: formData.password
        });

        if (signInError) {
          console.error('Auto sign-in error:', signInError);
          // Redirect to auth page if auto sign-in fails
          navigate('/auth');
        } else {
          // Redirect to admin dashboard
          navigate('/admin');
        }
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