import UnifiedUserManagement from '@/components/UnifiedUserManagement';
import { SafeWrapper } from '@/components/SafeWrapper';

const Team = () => {
  return (
    <div className="p-6">
      <SafeWrapper>
        <UnifiedUserManagement />
      </SafeWrapper>
    </div>
  );
};

export default Team;