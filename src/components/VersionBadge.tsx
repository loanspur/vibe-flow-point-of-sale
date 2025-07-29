import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  GitCommit, 
  Package, 
  Clock,
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { useVersionTracking, CurrentVersionInfo } from '@/hooks/useVersionTracking';
import { formatDate } from 'date-fns';

interface VersionBadgeProps {
  variant?: 'default' | 'minimal' | 'detailed';
  showPopover?: boolean;
  className?: string;
}

export const VersionBadge = ({ 
  variant = 'default', 
  showPopover = true,
  className = ''
}: VersionBadgeProps) => {
  const { currentVersion, tenantVersion, loading, error } = useVersionTracking();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <Badge variant="outline" className={className}>
        <Package className="w-3 h-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  if (error || !currentVersion) {
    return (
      <Badge variant="destructive" className={className}>
        <AlertCircle className="w-3 h-3 mr-1" />
        Version Error
      </Badge>
    );
  }

  const renderBadgeContent = () => {
    switch (variant) {
      case 'minimal':
        return currentVersion.version_number;
      case 'detailed':
        return (
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>v{currentVersion.version_number}</span>
            {currentVersion.build_number && (
              <span className="text-xs opacity-75">
                #{currentVersion.build_number}
              </span>
            )}
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            v{currentVersion.version_number}
          </div>
        );
    }
  };

  const badgeVariant = currentVersion.is_stable ? 'default' : 'secondary';

  const badgeElement = (
    <Badge 
      variant={badgeVariant} 
      className={`cursor-pointer transition-all hover:scale-105 ${className}`}
    >
      {renderBadgeContent()}
    </Badge>
  );

  if (!showPopover) {
    return badgeElement;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {badgeElement}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Application Version
            </CardTitle>
            <CardDescription>
              Current system version information
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Version Info */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Version:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {currentVersion.version_number}
                </span>
                <Badge 
                  variant={currentVersion.is_stable ? 'default' : 'secondary'}
                  className="h-5 text-xs"
                >
                  {currentVersion.is_stable ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Stable
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Beta
                    </>
                  )}
                </Badge>
              </div>
            </div>

            {/* Version Name */}
            {currentVersion.version_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{currentVersion.version_name}</span>
              </div>
            )}

            {/* Build Number */}
            {currentVersion.build_number && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Build:</span>
                <span className="font-mono text-sm">#{currentVersion.build_number}</span>
              </div>
            )}

            {/* Release Date */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Released:</span>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="w-3 h-3" />
                {formatDate(new Date(currentVersion.release_date), 'MMM dd, yyyy')}
              </div>
            </div>

            {/* Tenant Deployment Info */}
            {tenantVersion && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Deployment Info:</span>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Deployed:</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(new Date(tenantVersion.deployed_at), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Method:</span>
                      <span className="capitalize">{tenantVersion.deployment_method}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <Badge variant="outline" className="h-4 text-xs">
                        {tenantVersion.deployment_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};