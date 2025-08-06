import { BusinessSettingsEnhanced } from "./BusinessSettingsEnhanced";

export const BusinessSettings = () => {
  console.log('🏢 BusinessSettings wrapper component is rendering!');
  console.log('🏢 Current URL:', window.location.href);
  
  return (
    <div className="min-h-screen">
      <BusinessSettingsEnhanced />
    </div>
  );
};