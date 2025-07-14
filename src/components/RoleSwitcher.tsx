import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Crown, Building2, ChevronDown, Eye } from 'lucide-react';

export default function RoleSwitcher() {
  const { userRole, viewMode, canSwitchViews, switchViewMode } = useAuth();
  const navigate = useNavigate();

  if (!canSwitchViews) {
    return (
      <Badge variant="outline" className="text-primary">
        <Building2 className="h-3 w-3 mr-1" />
        Tenant Admin
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          {viewMode === 'superadmin' ? (
            <>
              <Crown className="h-4 w-4 text-yellow-500" />
              <span>Super Admin View</span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4 text-primary" />
              <span>Tenant View</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          Switch Interface
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => {
            switchViewMode('superadmin');
            navigate('/superadmin');
          }}
          className={viewMode === 'superadmin' ? 'bg-muted' : ''}
        >
          <Crown className="h-4 w-4 mr-2 text-yellow-500" />
          <div className="flex flex-col">
            <span>Super Admin Dashboard</span>
            <span className="text-xs text-muted-foreground">
              Manage all tenants and system settings
            </span>
          </div>
          {viewMode === 'superadmin' && (
            <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => {
            switchViewMode('tenant');
            navigate('/admin');
          }}
          className={viewMode === 'tenant' ? 'bg-muted' : ''}
        >
          <Building2 className="h-4 w-4 mr-2 text-primary" />
          <div className="flex flex-col">
            <span>Tenant Dashboard</span>
            <span className="text-xs text-muted-foreground">
              Manage your business operations
            </span>
          </div>
          {viewMode === 'tenant' && (
            <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Current Role: {userRole}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}