import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogger } from './useActivityLogger';

export const useDeletionControl = () => {
  const { user } = useAuth();
  const { logDelete } = useActivityLogger();

  // Check if user can delete - for now, disable for all users except superadmin
  const canDelete = (resourceType: string) => {
    // You can add more sophisticated logic here based on user roles
    return false; // Disable deletion for all resources
  };

  const logDeletionAttempt = (resourceType: string, resourceId: string, resourceName?: string) => {
    logDelete(resourceType, resourceId, {
      attempted_by: user?.id,
      resource_name: resourceName,
      action_prevented: true,
      reason: 'Deletion disabled for audit trail'
    });
  };

  return {
    canDelete,
    logDeletionAttempt
  };
};