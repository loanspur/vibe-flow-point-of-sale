import { BusinessSettingsEnhanced } from '@/components/BusinessSettingsEnhanced';

const TenantSettings = () => {
  console.log('🏢 TenantSettings page is LOADING!');
  console.log('🏢 Current URL:', window.location.href);
  return <BusinessSettingsEnhanced />;
};

export default TenantSettings;