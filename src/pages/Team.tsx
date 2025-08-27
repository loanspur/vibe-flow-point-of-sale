import React, { Suspense } from 'react';
import { SafeWrapper } from '@/components/SafeWrapper';

// Lazy load the UnifiedUserManagement component with error handling
const UnifiedUserManagement = React.lazy(() => 
  import('@/components/UnifiedUserManagement').catch(() => {
    console.error('Failed to load UnifiedUserManagement');
    return { 
      default: () => (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Team Management</h1>
          <p className="text-muted-foreground">
            Team management component failed to load. Please refresh the page.
          </p>
        </div>
      )
    };
  })
);

const Team = () => {
  return (
    <div className="p-6">
      <SafeWrapper>
        <Suspense fallback={
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Team Management</h1>
            <p className="text-muted-foreground">Loading team management...</p>
          </div>
        }>
          <UnifiedUserManagement />
        </Suspense>
      </SafeWrapper>
    </div>
  );
};

export default Team;