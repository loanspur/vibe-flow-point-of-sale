import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { LazyImage } from '@/components/ui/image-lazy';
import { useTenantLogo } from '@/hooks/useTenantLogo';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const tenantLogo = useTenantLogo();
  const fallbackLogo = '/lovable-uploads/8ec254a5-4e90-416c-afc2-2521bf634890.png';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <SuperAdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 sticky top-0 z-40">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Link to="/superadmin" aria-label="Go to Super Admin Dashboard" className="flex items-center">
                  <div className="h-8">
                    <LazyImage
                      src={tenantLogo || fallbackLogo}
                      alt="Logo"
                      fallback={fallbackLogo}
                      className="h-8 w-auto"
                      skeletonClassName="h-8 w-8 rounded"
                    />
                  </div>
                </Link>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tenants, users..."
                    className="pl-10 w-64"
                  />
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
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

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}