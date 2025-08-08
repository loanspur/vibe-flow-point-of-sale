import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const AuthSessionFix = () => {
  const [isFixing, setIsFixing] = useState(false);

  const handleSessionFix = async () => {
    setIsFixing(true);
    
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out completely
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear any cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Force reload to reset everything
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during session fix:', error);
      // Force reload anyway
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Authentication Session Issue</CardTitle>
          <CardDescription>
            Your authentication session needs to be refreshed. This will sign you out and redirect you to the login page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSessionFix}
            disabled={isFixing}
            className="w-full"
          >
            {isFixing ? 'Fixing Session...' : 'Fix Authentication Session'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            This will clear your browser storage and sign you out completely.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};