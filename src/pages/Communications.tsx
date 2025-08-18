import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UnifiedCommunicationCenter from "@/components/UnifiedCommunicationCenter";

export default function Communications() {
  const { user } = useAuth();

  // Determine user role for role-based access
  const getUserRole = (): 'superadmin' | 'tenant_admin' | 'user' => {
    if (!user) return 'user';
    
    // Check if user has superadmin role
    if (user.user_metadata?.role === 'superadmin') return 'superadmin';
    
    // Check if user is tenant admin
    if (user.user_metadata?.role === 'admin' || user.user_metadata?.is_admin) return 'tenant_admin';
    
    return 'user';
  };

  const userRole = getUserRole();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Communications</h1>
        <p className="text-muted-foreground">
          Manage your communication channels and view analytics
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="text-sm">
            Role: {userRole.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Use the new Unified Communication Center */}
      <UnifiedCommunicationCenter userRole={userRole} />
    </div>
  );
}