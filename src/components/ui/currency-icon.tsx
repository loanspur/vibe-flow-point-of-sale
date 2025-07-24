import { 
  DollarSign, 
  Euro, 
  PoundSterling,
  CircleDollarSign,
  Banknote,
  Coins
} from 'lucide-react';

export interface CurrencyIconProps {
  currency?: string;
  className?: string;
  size?: number;
}

export const getCurrencyIcon = (currency: string = 'USD') => {
  const currencyIcons: { [key: string]: typeof DollarSign } = {
    'USD': DollarSign,
    'EUR': Euro,
    'GBP': PoundSterling,
    'KES': Coins,
    'NGN': Banknote,
    'ZAR': CircleDollarSign,
    'UGX': Coins,
    'TZS': Coins,
    'RWF': Coins,
    'CAD': DollarSign,
    'AUD': DollarSign,
    'JPY': Coins,
    'CNY': Coins,
    'INR': Banknote,
    'BRL': DollarSign,
  };

  return currencyIcons[currency] || DollarSign;
};

export const CurrencyIcon: React.FC<CurrencyIconProps> = ({ 
  currency = 'USD', 
  className = 'w-4 h-4',
  size 
}) => {
  const IconComponent = getCurrencyIcon(currency);
  
  return <IconComponent className={className} size={size} />;
};