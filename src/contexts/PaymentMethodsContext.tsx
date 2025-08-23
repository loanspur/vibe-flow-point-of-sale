import React, { createContext, useContext, ReactNode } from 'react';
import { usePaymentMethods, PaymentMethod } from '@/hooks/usePaymentMethods';

interface PaymentMethodsContextType {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const PaymentMethodsContext = createContext<PaymentMethodsContextType | undefined>(undefined);

export const PaymentMethodsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const paymentMethodsData = usePaymentMethods();

  return (
    <PaymentMethodsContext.Provider value={paymentMethodsData}>
      {children}
    </PaymentMethodsContext.Provider>
  );
};

export const usePaymentMethodsContext = () => {
  const context = useContext(PaymentMethodsContext);
  if (context === undefined) {
    throw new Error('usePaymentMethodsContext must be used within a PaymentMethodsProvider');
  }
  return context;
};
