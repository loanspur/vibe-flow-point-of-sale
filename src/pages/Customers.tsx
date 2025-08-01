import ContactManagement from '@/components/ContactManagement';
import { SafeWrapper } from '@/components/SafeWrapper';

const Customers = () => {
  return (
    <div className="p-6">
      <SafeWrapper>
        <ContactManagement />
      </SafeWrapper>
    </div>
  );
};

export default Customers;