import { useState } from "react";
import { 
  Building2, 
  Users, 
  BarChart3, 
  Settings, 
  Crown,
  DollarSign,
  Activity,
  Database,
  Shield,
  Mail
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { 
    title: "Overview", 
    url: "/superadmin", 
    icon: Crown,
    description: "Platform dashboard"
  },
  { 
    title: "Tenant Management", 
    url: "/superadmin/tenants", 
    icon: Building2,
    description: "Manage tenant accounts"
  },
  { 
    title: "User Management", 
    url: "/superadmin/users", 
    icon: Users,
    description: "Manage all users"
  },
  { 
    title: "Analytics", 
    url: "/superadmin/analytics", 
    icon: BarChart3,
    description: "Platform analytics"
  },
  { 
    title: "Revenue", 
    url: "/superadmin/revenue", 
    icon: DollarSign,
    description: "Revenue tracking"
  },
];

const systemItems = [
  { 
    title: "System Health", 
    url: "/superadmin/system", 
    icon: Activity,
    description: "Monitor system status"
  },
  { 
    title: "Database", 
    url: "/superadmin/database", 
    icon: Database,
    description: "Database administration"
  },
  { 
    title: "Security", 
    url: "/superadmin/security", 
    icon: Shield,
    description: "Security & compliance"
  },
  { 
    title: "Communications", 
    url: "/communications", 
    icon: Mail,
    description: "Email & notifications"
  },
  { 
    title: "Settings", 
    url: "/superadmin/settings", 
    icon: Settings,
    description: "Platform settings"
  },
];

export function SuperAdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/superadmin") {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground";
  };

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="pt-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${getNavClass(item.url)}`}
                      end={item.url === "/superadmin"}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {item.title}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Administration */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            System Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${getNavClass(item.url)}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {item.title}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
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