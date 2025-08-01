import AccountingModule from '@/components/AccountingModule';
import { SafeWrapper } from '@/components/SafeWrapper';

export default function Accounting() {
  return (
    <SafeWrapper>
      <AccountingModule />
    </SafeWrapper>
  );
}