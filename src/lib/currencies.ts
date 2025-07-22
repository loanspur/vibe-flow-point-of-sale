export const currencies = [
  // Major Global Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', region: 'North America' },
  { code: 'EUR', name: 'Euro', symbol: '€', region: 'Europe' },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', region: 'Europe' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', region: 'Asia' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', region: 'Europe' },
  
  // North America
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', region: 'North America' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', region: 'North America' },
  
  // Asia Pacific
  { code: 'CNY', name: 'Chinese Yuan Renminbi', symbol: '¥', region: 'Asia' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', region: 'Asia' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', region: 'Asia' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', region: 'Oceania' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', region: 'Oceania' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', region: 'Asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', region: 'Asia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', region: 'Asia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', region: 'Asia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', region: 'Asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', region: 'Asia' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', region: 'Asia' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', region: 'Asia' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', region: 'Asia' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', region: 'Asia' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', region: 'Asia' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', region: 'Asia' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', region: 'Asia' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', region: 'Asia' },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭', region: 'Asia' },
  
  // Middle East
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', region: 'Middle East' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', region: 'Middle East' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', region: 'Middle East' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', region: 'Middle East' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD', region: 'Middle East' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: '£', region: 'Middle East' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', region: 'Middle East' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', region: 'Middle East' },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', region: 'Middle East' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', region: 'Middle East' },
  
  // Europe
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', region: 'Europe' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', region: 'Europe' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', region: 'Europe' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', region: 'Europe' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', region: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', region: 'Europe' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', region: 'Europe' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', region: 'Europe' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', region: 'Europe' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'РСД', region: 'Europe' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', region: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', region: 'Europe' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', region: 'Europe' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', region: 'Europe' },
  
  // Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', region: 'Africa' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', region: 'Africa' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', region: 'Africa' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'Sh', region: 'Africa' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', region: 'Africa' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', region: 'Africa' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', region: 'Africa' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'Fr', region: 'Africa' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', region: 'Africa' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', region: 'Africa' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', region: 'Africa' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', region: 'Africa' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د', region: 'Africa' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', region: 'Africa' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', region: 'Africa' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$', region: 'Africa' },
  { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'L', region: 'Africa' },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L', region: 'Africa' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', region: 'Africa' },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK', region: 'Africa' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', region: 'Africa' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar', region: 'Africa' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', region: 'Africa' },
  { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨', region: 'Africa' },
  
  // South America
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', region: 'South America' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', region: 'South America' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', region: 'South America' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', region: 'South America' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', region: 'South America' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$', region: 'South America' },
  { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲', region: 'South America' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs', region: 'South America' },
  { code: 'VES', name: 'Venezuelan Bolívar Soberano', symbol: 'Bs.S', region: 'South America' },
  { code: 'GYD', name: 'Guyanese Dollar', symbol: 'G$', region: 'South America' },
  { code: 'SRD', name: 'Surinamese Dollar', symbol: '$', region: 'South America' },
  
  // Central America & Caribbean
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', region: 'Central America' },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L', region: 'Central America' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$', region: 'Central America' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', region: 'Central America' },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', region: 'Central America' },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$', region: 'Central America' },
  { code: 'SVC', name: 'Salvadoran Colón', symbol: '₡', region: 'Central America' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', region: 'Caribbean' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$', region: 'Caribbean' },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$', region: 'Caribbean' },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$', region: 'Caribbean' },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$', region: 'Caribbean' },
  { code: 'CUP', name: 'Cuban Peso', symbol: '$', region: 'Caribbean' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', region: 'Caribbean' },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G', region: 'Caribbean' },
  
  // Pacific
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', region: 'Pacific' },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', region: 'Pacific' },
  { code: 'WST', name: 'Samoan Tālā', symbol: 'WS$', region: 'Pacific' },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT', region: 'Pacific' },
  { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$', region: 'Pacific' },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K', region: 'Pacific' },
  { code: 'NCL', name: 'New Caledonian Franc', symbol: '₣', region: 'Pacific' },
  { code: 'XPF', name: 'CFP Franc', symbol: '₣', region: 'Pacific' },
  
  // Special & Digital
  { code: 'XAU', name: 'Gold (Troy Ounce)', symbol: 'oz t', region: 'Commodities' },
  { code: 'XAG', name: 'Silver (Troy Ounce)', symbol: 'oz t', region: 'Commodities' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', region: 'Cryptocurrency' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', region: 'Cryptocurrency' }
];

export const stockAccountingMethods = [
  { value: 'FIFO', label: 'FIFO (First In, First Out)' },
  { value: 'LIFO', label: 'LIFO (Last In, First Out)' },
  { value: 'WAC', label: 'Weighted Average Cost' },
  { value: 'SPECIFIC', label: 'Specific Identification' }
];

export const smsProviders = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'nexmo', label: 'Vonage (Nexmo)' },
  { value: 'textlocal', label: 'Textlocal' },
  { value: 'clicksend', label: 'ClickSend' },
  { value: 'msg91', label: 'MSG91' },
  { value: 'fast2sms', label: 'Fast2SMS' },
  { value: 'custom', label: 'Custom Provider' }
];

export const templateOptions = [
  { value: 'standard', label: 'Standard Template' },
  { value: 'modern', label: 'Modern Template' },
  { value: 'minimal', label: 'Minimal Template' },
  { value: 'classic', label: 'Classic Template' },
  { value: 'custom', label: 'Custom Template' }
];