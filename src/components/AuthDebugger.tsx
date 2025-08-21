import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export const AuthDebugger = () => {
  const [authState, setAuthState] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      // Check session
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      setSessionData({ session: session.session, error: sessionError });

      // Check user
      const { data: user, error: userError } = await supabase.auth.getUser();
      setAuthState({ user: user.user, error: userError });

      // Check profile if user exists
      if (user.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.user.id)
          .single();
        setProfileData({ profile, error: profileError });
      }
    };

    checkAuth();
  }, []);

  return (
    <Card className="mb-6 border-2 border-yellow-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Authentication Debugger
          {user ? (
            <Badge variant="default" className="bg-green-100 text-green-800">Authenticated</Badge>
          ) : (
            <Badge variant="destructive">Not Authenticated</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">Auth Context User:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold">Session Data:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold">Auth User:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold">Profile Data:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Quick Actions:</h4>
          <div className="flex gap-2">
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Sign Out
            </button>
            <button
              onClick={() => window.location.href = '/auth'}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Go to Login
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};