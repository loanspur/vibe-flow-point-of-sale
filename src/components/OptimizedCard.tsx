import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  alert?: string;
  className?: string;
  onClick?: () => void;
  refreshing?: boolean;
}

export const OptimizedCard = memo<OptimizedCardProps>(({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  loading = false,
  alert,
  className,
  onClick,
  refreshing = false
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-pos-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return null;
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card 
      className={cn(
        "p-6 transition-all duration-300 cursor-pointer group",
        "hover:shadow-[var(--shadow-card)] hover:scale-[1.02]",
        loading && "animate-pulse",
        refreshing && "border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {alert && (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {alert}
              </Badge>
            )}
            {refreshing && (
              <RefreshCw className="h-3 w-3 text-primary animate-spin" />
            )}
          </div>
          
          <div className={cn(
            "text-2xl font-bold transition-all duration-300",
            loading ? "bg-muted rounded h-8 w-20" : "text-foreground"
          )}>
            {loading ? '' : value}
          </div>
          
          {subtitle && (
            <div className="flex items-center gap-1">
              {TrendIcon && <TrendIcon className={cn("h-4 w-4", getTrendColor())} />}
              <span className={cn("text-sm font-medium", getTrendColor())}>
                {loading ? '' : subtitle}
              </span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
});

OptimizedCard.displayName = 'OptimizedCard';