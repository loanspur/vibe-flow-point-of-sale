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

  // Don't allow switching when in superadmin view mode
  if (!canSwitchViews || viewMode === 'superadmin') {
    return (
      <Badge variant="outline" className="text-primary">
        {viewMode === 'superadmin' ? (
          <>
            <Crown className="h-3 w-3 mr-1 text-yellow-500" />
            Super Admin
          </>
        ) : (
          <>
            <Building2 className="h-3 w-3 mr-1" />
            Tenant Admin
          </>
        )}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span>Tenant View</span>
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
        >
          <Crown className="h-4 w-4 mr-2 text-yellow-500" />
          <div className="flex flex-col">
            <span>Super Admin Dashboard</span>
            <span className="text-xs text-muted-foreground">
              Manage all tenants and system settings
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => {
            switchViewMode('tenant');
            navigate('/admin');
          }}
          className="bg-muted"
        >
          <Building2 className="h-4 w-4 mr-2 text-primary" />
          <div className="flex flex-col">
            <span>Tenant Dashboard</span>
            <span className="text-xs text-muted-foreground">
              Manage your business operations
            </span>
          </div>
          <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Current Role: {userRole}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}