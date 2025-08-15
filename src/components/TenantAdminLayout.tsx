import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Search, Plus, LogOut, User, Settings } from 'lucide-react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TenantAdminSidebar } from './TenantAdminSidebar';
import UserProfileSettings from './UserProfileSettings';
import { LazyImage } from '@/components/ui/image-lazy';
import { useTenantLogo } from '@/hooks/useTenantLogo';

interface TenantAdminLayoutProps {
  children: ReactNode;
}

export function TenantAdminLayout({ children }: TenantAdminLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  console.log('🏢 TenantAdminLayout rendering with user:', !!user);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const tenantLogo = useTenantLogo();
  const fallbackLogo = '/lovable-uploads/8ec254a5-4e90-416c-afc2-2521bf634890.png';
  
  // Check if we're on sales page with new-sale tab active
  const isOnAddSalePage = location.pathname === '/admin/sales' && searchParams.get('tab') === 'new-sale';
  
  // Sidebar should be open by default except on add sale page
  const shouldSidebarBeOpen = !isOnAddSalePage;

  return (
    <SidebarProvider defaultOpen={shouldSidebarBeOpen}>
      <div className="min-h-screen flex w-full bg-background">
        <TenantAdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile-first Top Header */}
          <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <SidebarTrigger className="touch-target" />
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search - hidden on mobile, shown on larger screens */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
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

                {/* User Menu - Mobile optimized */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-left touch-target">
                      <User className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline font-medium">{user?.user_metadata?.full_name || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm">
                      <p className="font-medium">{user?.user_metadata?.full_name || 'User'}</p>
                      <p className="text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      Home
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
            {children}
          </main>
        </div>
        
        {/* Mobile-optimized Profile Settings Dialog */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Profile Settings</DialogTitle>
            </DialogHeader>
            <UserProfileSettings />
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}