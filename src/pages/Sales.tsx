import { useState, useCallback } from 'react';
import SalesManagement from '@/components/SalesManagement';
import { SafeWrapper } from '@/components/SafeWrapper';
import { useAuth } from '@/contexts/AuthContext';

export default function Sales() {
  const { tenantId } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Disabled auto-refresh and realtime to prevent continuous loading issues
  // useAutoRefresh({ interval: 30000, onRefresh: handleRefresh, visibilityBased: true, enabled: false });

  // useRealtimeRefresh({
  //   tables: ['sales', 'sales_items', 'customers', 'ar_ap_payments', 'payment_history'],
  //   tenantId,
  //   onChange: handleRefresh,
  //   enabled: false,
  // });

  return (
    <SafeWrapper>
      <SalesManagement key={`sales-${refreshKey}`} />
    </SafeWrapper>
  );
}