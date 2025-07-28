import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TenantSetupGuardProps {
  children: React.ReactNode;
}

export const TenantSetupGuard = ({ children }: TenantSetupGuardProps) => {
  const { user, tenantId, userRole, refreshUserInfo } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  // If user has a tenant, render children normally
  if (tenantId) {
    return <>{children}</>;
  }

  // If user doesn't have a tenant, show setup screen
  const handleCreateTenant = async () => {
    if (!user) return;

    setIsCreatingTenant(true);
    try {
      // Get user metadata for business name, with fallback
      const businessName = user.user_metadata?.business_name || `${user.email?.split('@')[0]} Business` || "My Business";
      const ownerName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Business Owner";

      console.log('Creating tenant with data:', { businessName, ownerName, email: user.email });

      const { data, error } = await supabase.functions.invoke('setup-missing-tenant', {
        body: {
          businessName,
          ownerName,
          email: user.email
        }
      });

      console.log('Tenant setup response:', { data, error });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to setup business');
      }

      toast({
        title: "Business Setup Complete!",
        description: "Your business has been set up successfully. Redirecting to your dashboard...",
        variant: "default"
      });

      // Refresh user info to get updated tenant_id
      await refreshUserInfo();
      
      // Small delay to ensure auth context is updated
      setTimeout(() => {
        window.location.href = '/admin'; // Force page reload to ensure fresh auth state
      }, 1500);

    } catch (error: any) {
      console.error('Tenant setup error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup your business. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleGoToSignup = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-xl">Business Setup Required</CardTitle>
          <CardDescription>
            Your account needs to be linked to a business to access the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Business Account</p>
                <p className="text-xs text-muted-foreground">Set up your business profile</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Team Management</p>
                <p className="text-xs text-muted-foreground">Manage users and permissions</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleCreateTenant}
              disabled={isCreatingTenant}
              className="w-full"
            >
              {isCreatingTenant ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up business...
                </>
              ) : (
                "Set Up My Business"
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleGoToSignup}
              className="w-full"
            >
              Start Over
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Contact support for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};