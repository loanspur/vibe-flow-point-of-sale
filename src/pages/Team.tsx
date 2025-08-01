import UserManagement from '@/components/UserManagement';
import { SafeWrapper } from '@/components/SafeWrapper';

const Team = () => {
  return (
    <div className="p-6">
      <SafeWrapper>
        <UserManagement />
      </SafeWrapper>
    </div>
  );
};

export default Team;