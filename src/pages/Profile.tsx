import UserProfileSettings from '@/components/UserProfileSettings';
import DashboardHeader from '@/components/DashboardHeader';

const Profile = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto py-8">
        <UserProfileSettings />
      </div>
    </div>
  );
};

export default Profile;