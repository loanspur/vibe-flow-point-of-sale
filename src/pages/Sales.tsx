import SalesManagement from '@/components/SalesManagement';
import { SafeWrapper } from '@/components/SafeWrapper';

export default function Sales() {
  return (
    <SafeWrapper>
      <SalesManagement />
    </SafeWrapper>
  );
}