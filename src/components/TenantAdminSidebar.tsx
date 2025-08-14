import {
  BarChart3,
  Users,
  Settings,
  ShoppingCart,
  Package,
  Home,
  TrendingUp,
  Calculator,
  Mail
} from 'lucide-react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/ui/image-lazy';
import { useTenantLogo } from '@/hooks/useTenantLogo';

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: Home },
];

const businessItems = [
  { title: "Products", url: "/admin/products", icon: Package },
  
  { title: "Sales", url: "/admin/sales", icon: TrendingUp },
  { title: "Purchases", url: "/admin/purchases", icon: ShoppingCart },
  { title: "Contacts", url: "/admin/customers", icon: Users },
  { title: "Accounting", url: "/admin/accounting", icon: Calculator, featureRequired: "advanced_accounting" },
  { title: "Reports", url: "/admin/reports", icon: BarChart3, featureRequired: "advanced_reporting" },
  { title: "Team", url: "/admin/team", icon: Users, featureRequired: "user_roles" },
  { title: "Communications", url: "/admin/communications", icon: Mail, featureRequired: "advanced_notifications" },
];

const systemItems = [
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function TenantAdminSidebar() {
  const { state } = useSidebar();
  const { hasFeature, subscription } = useFeatureAccess();
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const tenantLogo = useTenantLogo();
  const fallbackLogo = '/lovable-uploads/96478f6e-8bdd-4f18-930b-f1dfa142cefb.png';

  // Check if user is on trial
  const isOnTrial = subscription?.trial_end && new Date(subscription.trial_end) > new Date();

  // Get the appropriate badge text based on subscription plan
  const getUpgradeBadge = () => {
    const planName = subscription?.billing_plans?.name?.toLowerCase();
    if (!planName || planName === 'starter') return 'Pro';
    if (planName === 'professional') return 'Enterprise';
    return 'Pro';
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return currentPath === "/admin";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (active: boolean) =>
    active 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-muted/80 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" aria-label="Go to Dashboard" className="flex items-center">
            <div className="h-8 w-8">
              <LazyImage
                src={tenantLogo || fallbackLogo}
                alt="Tenant logo"
                fallback={fallbackLogo}
                className="h-8 w-8 rounded-md"
                skeletonClassName="h-8 w-8 rounded-md"
              />
            </div>
          </Link>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/admin"}
                      className={({ isActive: navActive }) => getNavCls(navActive)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Business</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessItems.map((item) => {
                const hasAccess = !item.featureRequired || hasFeature(item.featureRequired);
                const showUpgradeBadge = !hasAccess && !isOnTrial; // Don't show badge if on trial
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={hasAccess || isOnTrial ? item.url : "/admin/settings?tab=billing"}
                        className={({ isActive: navActive }) => 
                          `${getNavCls(navActive)} ${!hasAccess && !isOnTrial ? 'opacity-60' : ''}`
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <div className="flex items-center justify-between w-full">
                            <span>{item.title}</span>
                            {showUpgradeBadge && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                {getUpgradeBadge()}
                              </Badge>
                            )}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive: navActive }) => getNavCls(navActive)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}