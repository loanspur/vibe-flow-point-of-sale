import { useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SuperAdminSidebar } from '@/components/SuperAdminSidebar';
import { LazyImage } from '@/components/ui/image-lazy';
import { useTenantLogo } from '@/hooks/useTenantLogo';

export function SuperAdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const tenantLogo = useTenantLogo();
  const fallbackLogo = '/lovable-uploads/8ec254a5-4e90-416c-afc2-2521bf634890.png';

  // Sentinel: detect if SuperAdminLayout is mounted on /auth (should never happen)
  useEffect(() => {
    if (window.location.pathname.startsWith('/auth')) {
      console.warn('[sentinel] SuperAdminLayout mounted on /auth — this should never happen');
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <SuperAdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile-first Top Header */}
          <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <SidebarTrigger className="touch-target" />
                <Link to="/superadmin" aria-label="Go to Super Admin Dashboard" className="flex items-center">
                  <div className="h-6 sm:h-8">
                    <LazyImage
                      src={tenantLogo || fallbackLogo}
                      alt="Logo"
                      fallback={fallbackLogo}
                      className="h-6 sm:h-8 w-auto"
                      skeletonClassName="h-6 sm:h-8 w-6 sm:w-8 rounded"
                    />
                  </div>
                </Link>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search - hidden on mobile, shown on larger screens */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tenants, users..."
                    className="pl-10 w-48 lg:w-64"
                  />
                </div>

                {/* Mobile search button */}
                <Button variant="ghost" size="icon" className="touch-target md:hidden">
                  <Search className="h-4 w-4" />
                </Button>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative touch-target">
                  <Bell className="h-4 w-4" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="touch-target">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm">
                      <p className="font-medium">{user?.user_metadata?.full_name || 'Super Admin'}</p>
                      <p className="text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/')}>
                      Home
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content with mobile padding */}
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
