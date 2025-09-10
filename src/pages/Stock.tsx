import { StockManagement } from '@/components/StockManagement';
import { SafeWrapper } from '@/components/SafeWrapper';

const Stock = () => {
  return (
    <SafeWrapper>
      <StockManagement />
    </SafeWrapper>
  );
};

export default Stock;
