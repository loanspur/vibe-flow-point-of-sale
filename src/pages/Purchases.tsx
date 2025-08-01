import PurchaseManagement from '@/components/PurchaseManagement';
import { SafeWrapper } from '@/components/SafeWrapper';

export default function Purchases() {
  return (
    <SafeWrapper>
      <PurchaseManagement />
    </SafeWrapper>
  );
}