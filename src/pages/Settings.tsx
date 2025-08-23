import { BusinessSettingsEnhanced } from '@/components/BusinessSettingsEnhanced';
import { debugLog } from '@/utils/debug';

const Settings = () => {
  debugLog('Settings page rendering');
  
  return (
    <div className="min-h-screen">
      <BusinessSettingsEnhanced />
    </div>
  );
};

export default Settings;