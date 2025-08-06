import { BusinessSettingsEnhanced } from '@/components/BusinessSettingsEnhanced';

const Settings = () => {
  console.log('🏪 Settings page component is rendering!');
  console.log('🏪 Current URL:', window.location.href);
  console.log('🏪 Current timestamp:', new Date().toISOString());
  
  return (
    <div className="min-h-screen">
      <BusinessSettingsEnhanced />
    </div>
  );
};

export default Settings;