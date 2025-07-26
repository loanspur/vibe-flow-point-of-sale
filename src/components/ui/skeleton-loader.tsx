import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
      {...props}
    />
  );
};

export const PricingCardSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="text-center space-y-3">
        <Skeleton className="h-6 w-24 mx-auto" />
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-20 mx-auto" />
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="text-center space-y-8 max-w-4xl mx-auto py-20">
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-6 w-3/4 mx-auto" />
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-12 w-32" />
      </div>
    </div>
  );
};