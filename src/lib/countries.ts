export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  currencyName: string;
  timezone: string;
  region: string;
  flag: string;
}

export const countries: Country[] = [
  // North America
  { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', currencyName: 'US Dollar', timezone: 'America/New_York', region: 'North America', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', currency: 'CAD', currencySymbol: 'C$', currencyName: 'Canadian Dollar', timezone: 'America/Toronto', region: 'North America', flag: '🇨🇦' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', currencySymbol: '$', currencyName: 'Mexican Peso', timezone: 'America/Mexico_City', region: 'North America', flag: '🇲🇽' },

  // Europe
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£', currencyName: 'British Pound Sterling', timezone: 'Europe/London', region: 'Europe', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Berlin', region: 'Europe', flag: '🇩🇪' },
  { code: 'FR', name: 'France', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Paris', region: 'Europe', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Rome', region: 'Europe', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Madrid', region: 'Europe', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Amsterdam', region: 'Europe', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Brussels', region: 'Europe', flag: '🇧🇪' },
  { code: 'AT', name: 'Austria', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Vienna', region: 'Europe', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', currencySymbol: 'Fr', currencyName: 'Swiss Franc', timezone: 'Europe/Zurich', region: 'Europe', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', currencySymbol: 'kr', currencyName: 'Swedish Krona', timezone: 'Europe/Stockholm', region: 'Europe', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', currency: 'NOK', currencySymbol: 'kr', currencyName: 'Norwegian Krone', timezone: 'Europe/Oslo', region: 'Europe', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', currencySymbol: 'kr', currencyName: 'Danish Krone', timezone: 'Europe/Copenhagen', region: 'Europe', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Helsinki', region: 'Europe', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', currency: 'PLN', currencySymbol: 'zł', currencyName: 'Polish Złoty', timezone: 'Europe/Warsaw', region: 'Europe', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', currencySymbol: 'Kč', currencyName: 'Czech Koruna', timezone: 'Europe/Prague', region: 'Europe', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', currencySymbol: 'Ft', currencyName: 'Hungarian Forint', timezone: 'Europe/Budapest', region: 'Europe', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', currency: 'RON', currencySymbol: 'lei', currencyName: 'Romanian Leu', timezone: 'Europe/Bucharest', region: 'Europe', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', currencySymbol: 'лв', currencyName: 'Bulgarian Lev', timezone: 'Europe/Sofia', region: 'Europe', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatia', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Zagreb', region: 'Europe', flag: '🇭🇷' },
  { code: 'RS', name: 'Serbia', currency: 'RSD', currencySymbol: 'РСД', currencyName: 'Serbian Dinar', timezone: 'Europe/Belgrade', region: 'Europe', flag: '🇷🇸' },
  { code: 'IS', name: 'Iceland', currency: 'ISK', currencySymbol: 'kr', currencyName: 'Icelandic Króna', timezone: 'Europe/Reykjavik', region: 'Europe', flag: '🇮🇸' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Dublin', region: 'Europe', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Lisbon', region: 'Europe', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', currency: 'EUR', currencySymbol: '€', currencyName: 'Euro', timezone: 'Europe/Athens', region: 'Europe', flag: '🇬🇷' },
  { code: 'RU', name: 'Russia', currency: 'RUB', currencySymbol: '₽', currencyName: 'Russian Ruble', timezone: 'Europe/Moscow', region: 'Europe', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', currencySymbol: '₴', currencyName: 'Ukrainian Hryvnia', timezone: 'Europe/Kiev', region: 'Europe', flag: '🇺🇦' },
  { code: 'BY', name: 'Belarus', currency: 'BYN', currencySymbol: 'Br', currencyName: 'Belarusian Ruble', timezone: 'Europe/Minsk', region: 'Europe', flag: '🇧🇾' },

  // Asia
  { code: 'CN', name: 'China', currency: 'CNY', currencySymbol: '¥', currencyName: 'Chinese Yuan Renminbi', timezone: 'Asia/Shanghai', region: 'Asia', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', currency: 'JPY', currencySymbol: '¥', currencyName: 'Japanese Yen', timezone: 'Asia/Tokyo', region: 'Asia', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', currencySymbol: '₩', currencyName: 'South Korean Won', timezone: 'Asia/Seoul', region: 'Asia', flag: '🇰🇷' },
  { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', currencyName: 'Indian Rupee', timezone: 'Asia/Mumbai', region: 'Asia', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', currencySymbol: 'S$', currencyName: 'Singapore Dollar', timezone: 'Asia/Singapore', region: 'Asia', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', currencySymbol: 'HK$', currencyName: 'Hong Kong Dollar', timezone: 'Asia/Hong_Kong', region: 'Asia', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', currencySymbol: 'NT$', currencyName: 'Taiwan Dollar', timezone: 'Asia/Taipei', region: 'Asia', flag: '🇹🇼' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', currencySymbol: 'RM', currencyName: 'Malaysian Ringgit', timezone: 'Asia/Kuala_Lumpur', region: 'Asia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', currency: 'THB', currencySymbol: '฿', currencyName: 'Thai Baht', timezone: 'Asia/Bangkok', region: 'Asia', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', currencySymbol: '₫', currencyName: 'Vietnamese Dong', timezone: 'Asia/Ho_Chi_Minh', region: 'Asia', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', currencySymbol: '₱', currencyName: 'Philippine Peso', timezone: 'Asia/Manila', region: 'Asia', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', currencySymbol: 'Rp', currencyName: 'Indonesian Rupiah', timezone: 'Asia/Jakarta', region: 'Asia', flag: '🇮🇩' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', currencySymbol: '₨', currencyName: 'Pakistani Rupee', timezone: 'Asia/Karachi', region: 'Asia', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', currencySymbol: '৳', currencyName: 'Bangladeshi Taka', timezone: 'Asia/Dhaka', region: 'Asia', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', currencySymbol: '₨', currencyName: 'Sri Lankan Rupee', timezone: 'Asia/Colombo', region: 'Asia', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', currencySymbol: '₨', currencyName: 'Nepalese Rupee', timezone: 'Asia/Kathmandu', region: 'Asia', flag: '🇳🇵' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK', currencySymbol: 'K', currencyName: 'Myanmar Kyat', timezone: 'Asia/Yangon', region: 'Asia', flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR', currencySymbol: '៛', currencyName: 'Cambodian Riel', timezone: 'Asia/Phnom_Penh', region: 'Asia', flag: '🇰🇭' },
  { code: 'LA', name: 'Laos', currency: 'LAK', currencySymbol: '₭', currencyName: 'Lao Kip', timezone: 'Asia/Vientiane', region: 'Asia', flag: '🇱🇦' },
  { code: 'BN', name: 'Brunei', currency: 'BND', currencySymbol: 'B$', currencyName: 'Brunei Dollar', timezone: 'Asia/Brunei', region: 'Asia', flag: '🇧🇳' },

  // Middle East
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', currencySymbol: 'د.إ', currencyName: 'UAE Dirham', timezone: 'Asia/Dubai', region: 'Middle East', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencySymbol: '﷼', currencyName: 'Saudi Riyal', timezone: 'Asia/Riyadh', region: 'Middle East', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', currencySymbol: '﷼', currencyName: 'Qatari Riyal', timezone: 'Asia/Qatar', region: 'Middle East', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', currencySymbol: 'د.ك', currencyName: 'Kuwaiti Dinar', timezone: 'Asia/Kuwait', region: 'Middle East', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', currencySymbol: '.د.ب', currencyName: 'Bahraini Dinar', timezone: 'Asia/Bahrain', region: 'Middle East', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', currency: 'OMR', currencySymbol: '﷼', currencyName: 'Omani Rial', timezone: 'Asia/Muscat', region: 'Middle East', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan', currency: 'JOD', currencySymbol: 'JD', currencyName: 'Jordanian Dinar', timezone: 'Asia/Amman', region: 'Middle East', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', currencySymbol: '£', currencyName: 'Lebanese Pound', timezone: 'Asia/Beirut', region: 'Middle East', flag: '🇱🇧' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', currencySymbol: 'ع.د', currencyName: 'Iraqi Dinar', timezone: 'Asia/Baghdad', region: 'Middle East', flag: '🇮🇶' },
  { code: 'IR', name: 'Iran', currency: 'IRR', currencySymbol: '﷼', currencyName: 'Iranian Rial', timezone: 'Asia/Tehran', region: 'Middle East', flag: '🇮🇷' },
  { code: 'IL', name: 'Israel', currency: 'ILS', currencySymbol: '₪', currencyName: 'Israeli New Shekel', timezone: 'Asia/Jerusalem', region: 'Middle East', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', currencySymbol: '₺', currencyName: 'Turkish Lira', timezone: 'Europe/Istanbul', region: 'Middle East', flag: '🇹🇷' },

  // Africa
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', currencySymbol: 'R', currencyName: 'South African Rand', timezone: 'Africa/Johannesburg', region: 'Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', currencySymbol: '₦', currencyName: 'Nigerian Naira', timezone: 'Africa/Lagos', region: 'Africa', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', currencySymbol: '£', currencyName: 'Egyptian Pound', timezone: 'Africa/Cairo', region: 'Africa', flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya', currency: 'KES', currencySymbol: 'KES', currencyName: 'Kenyan Shilling', timezone: 'Africa/Nairobi', region: 'Africa', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', currencySymbol: '₵', currencyName: 'Ghanaian Cedi', timezone: 'Africa/Accra', region: 'Africa', flag: '🇬🇭' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', currencySymbol: 'USh', currencyName: 'Ugandan Shilling', timezone: 'Africa/Kampala', region: 'Africa', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', currencySymbol: 'TSh', currencyName: 'Tanzanian Shilling', timezone: 'Africa/Dar_es_Salaam', region: 'Africa', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', currencySymbol: 'Fr', currencyName: 'Rwandan Franc', timezone: 'Africa/Kigali', region: 'Africa', flag: '🇷🇼' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', currencySymbol: 'Br', currencyName: 'Ethiopian Birr', timezone: 'Africa/Addis_Ababa', region: 'Africa', flag: '🇪🇹' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', currencySymbol: 'د.م.', currencyName: 'Moroccan Dirham', timezone: 'Africa/Casablanca', region: 'Africa', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisia', currency: 'TND', currencySymbol: 'د.ت', currencyName: 'Tunisian Dinar', timezone: 'Africa/Tunis', region: 'Africa', flag: '🇹🇳' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD', currencySymbol: 'د.ج', currencyName: 'Algerian Dinar', timezone: 'Africa/Algiers', region: 'Africa', flag: '🇩🇿' },
  { code: 'LY', name: 'Libya', currency: 'LYD', currencySymbol: 'ل.د', currencyName: 'Libyan Dinar', timezone: 'Africa/Tripoli', region: 'Africa', flag: '🇱🇾' },
  { code: 'AO', name: 'Angola', currency: 'AOA', currencySymbol: 'Kz', currencyName: 'Angolan Kwanza', timezone: 'Africa/Luanda', region: 'Africa', flag: '🇦🇴' },
  { code: 'BW', name: 'Botswana', currency: 'BWP', currencySymbol: 'P', currencyName: 'Botswana Pula', timezone: 'Africa/Gaborone', region: 'Africa', flag: '🇧🇼' },
  { code: 'NA', name: 'Namibia', currency: 'NAD', currencySymbol: 'N$', currencyName: 'Namibian Dollar', timezone: 'Africa/Windhoek', region: 'Africa', flag: '🇳🇦' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', currencySymbol: 'ZK', currencyName: 'Zambian Kwacha', timezone: 'Africa/Lusaka', region: 'Africa', flag: '🇿🇲' },
  { code: 'MW', name: 'Malawi', currency: 'MWK', currencySymbol: 'MK', currencyName: 'Malawian Kwacha', timezone: 'Africa/Blantyre', region: 'Africa', flag: '🇲🇼' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN', currencySymbol: 'MT', currencyName: 'Mozambican Metical', timezone: 'Africa/Maputo', region: 'Africa', flag: '🇲🇿' },
  { code: 'MG', name: 'Madagascar', currency: 'MGA', currencySymbol: 'Ar', currencyName: 'Malagasy Ariary', timezone: 'Indian/Antananarivo', region: 'Africa', flag: '🇲🇬' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR', currencySymbol: '₨', currencyName: 'Mauritian Rupee', timezone: 'Indian/Mauritius', region: 'Africa', flag: '🇲🇺' },
  { code: 'SC', name: 'Seychelles', currency: 'SCR', currencySymbol: '₨', currencyName: 'Seychellois Rupee', timezone: 'Indian/Mahe', region: 'Africa', flag: '🇸🇨' },
  { code: 'SN', name: 'Senegal', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Dakar', region: 'Africa', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Abidjan', region: 'Africa', flag: '🇨🇮' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Ouagadougou', region: 'Africa', flag: '🇧🇫' },
  { code: 'ML', name: 'Mali', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Bamako', region: 'Africa', flag: '🇲🇱' },
  { code: 'NE', name: 'Niger', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Niamey', region: 'Africa', flag: '🇳🇪' },
  { code: 'BJ', name: 'Benin', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Porto-Novo', region: 'Africa', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Lome', region: 'Africa', flag: '🇹🇬' },
  { code: 'GN', name: 'Guinea', currency: 'GNF', currencySymbol: 'Fr', currencyName: 'Guinean Franc', timezone: 'Africa/Conakry', region: 'Africa', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF', currencySymbol: 'CFA', currencyName: 'West African CFA Franc', timezone: 'Africa/Bissau', region: 'Africa', flag: '🇬🇼' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLE', currencySymbol: 'Le', currencyName: 'Sierra Leonean Leone', timezone: 'Africa/Freetown', region: 'Africa', flag: '🇸🇱' },
  { code: 'LR', name: 'Liberia', currency: 'LRD', currencySymbol: 'L$', currencyName: 'Liberian Dollar', timezone: 'Africa/Monrovia', region: 'Africa', flag: '🇱🇷' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', currencySymbol: 'FCFA', currencyName: 'Central African CFA Franc', timezone: 'Africa/Douala', region: 'Africa', flag: '🇨🇲' },
  { code: 'CF', name: 'Central African Republic', currency: 'XAF', currencySymbol: 'FCFA', currencyName: 'Central African CFA Franc', timezone: 'Africa/Bangui', region: 'Africa', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', currency: 'XAF', currencySymbol: 'FCFA', currencyName: 'Central African CFA Franc', timezone: 'Africa/Ndjamena', region: 'Africa', flag: '🇹🇩' },
  { code: 'CG', name: 'Republic of the Congo', currency: 'XAF', currencySymbol: 'FCFA', currencyName: 'Central African CFA Franc', timezone: 'Africa/Brazzaville', region: 'Africa', flag: '🇨🇬' },
  { code: 'CD', name: 'Democratic Republic of the Congo', currency: 'CDF', currencySymbol: 'Fr', currencyName: 'Congolese Franc', timezone: 'Africa/Kinshasa', region: 'Africa', flag: '🇨🇩' },
  { code: 'GA', name: 'Gabon', currency: 'XAF', currencySymbol: 'FCFA', currencyName: 'Central African CFA Franc', timezone: 'Africa/Libreville', region: 'Africa', flag: '🇬🇦' },
  { code: 'GQ', name: 'Equatorial Guinea', currency: 'XAF', currencySymbol: 'FCFA', currencyName: 'Central African CFA Franc', timezone: 'Africa/Malabo', region: 'Africa', flag: '🇬🇶' },
  { code: 'ST', name: 'São Tomé and Príncipe', currency: 'STN', currencySymbol: 'Db', currencyName: 'São Tomé and Príncipe Dobra', timezone: 'Africa/Sao_Tome', region: 'Africa', flag: '🇸🇹' },
  { code: 'SD', name: 'Sudan', currency: 'SDG', currencySymbol: 'ج.س.', currencyName: 'Sudanese Pound', timezone: 'Africa/Khartoum', region: 'Africa', flag: '🇸🇩' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP', currencySymbol: '£', currencyName: 'South Sudanese Pound', timezone: 'Africa/Juba', region: 'Africa', flag: '🇸🇸' },
  { code: 'BI', name: 'Burundi', currency: 'BIF', currencySymbol: 'Fr', currencyName: 'Burundian Franc', timezone: 'Africa/Bujumbura', region: 'Africa', flag: '🇧🇮' },
  { code: 'DJ', name: 'Djibouti', currency: 'DJF', currencySymbol: 'Fr', currencyName: 'Djiboutian Franc', timezone: 'Africa/Djibouti', region: 'Africa', flag: '🇩🇯' },
  { code: 'ER', name: 'Eritrea', currency: 'ERN', currencySymbol: 'Nfk', currencyName: 'Eritrean Nakfa', timezone: 'Africa/Asmara', region: 'Africa', flag: '🇪🇷' },
  { code: 'SO', name: 'Somalia', currency: 'SOS', currencySymbol: 'Sh', currencyName: 'Somali Shilling', timezone: 'Africa/Mogadishu', region: 'Africa', flag: '🇸🇴' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'USD', currencySymbol: '$', currencyName: 'US Dollar', timezone: 'Africa/Harare', region: 'Africa', flag: '🇿🇼' },
  { code: 'SZ', name: 'Eswatini', currency: 'SZL', currencySymbol: 'L', currencyName: 'Swazi Lilangeni', timezone: 'Africa/Mbabane', region: 'Africa', flag: '🇸🇿' },
  { code: 'LS', name: 'Lesotho', currency: 'LSL', currencySymbol: 'L', currencyName: 'Lesotho Loti', timezone: 'Africa/Maseru', region: 'Africa', flag: '🇱🇸' },
  { code: 'CV', name: 'Cape Verde', currency: 'CVE', currencySymbol: '$', currencyName: 'Cape Verdean Escudo', timezone: 'Atlantic/Cape_Verde', region: 'Africa', flag: '🇨🇻' },
  { code: 'KM', name: 'Comoros', currency: 'KMF', currencySymbol: 'Fr', currencyName: 'Comorian Franc', timezone: 'Indian/Comoro', region: 'Africa', flag: '🇰🇲' },

  // South America
  { code: 'BR', name: 'Brazil', currency: 'BRL', currencySymbol: 'R$', currencyName: 'Brazilian Real', timezone: 'America/Sao_Paulo', region: 'South America', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', currencySymbol: '$', currencyName: 'Argentine Peso', timezone: 'America/Buenos_Aires', region: 'South America', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', currency: 'CLP', currencySymbol: '$', currencyName: 'Chilean Peso', timezone: 'America/Santiago', region: 'South America', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', currency: 'COP', currencySymbol: '$', currencyName: 'Colombian Peso', timezone: 'America/Bogota', region: 'South America', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', currency: 'PEN', currencySymbol: 'S/', currencyName: 'Peruvian Sol', timezone: 'America/Lima', region: 'South America', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', currencySymbol: '$', currencyName: 'Uruguayan Peso', timezone: 'America/Montevideo', region: 'South America', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', currencySymbol: '₲', currencyName: 'Paraguayan Guaraní', timezone: 'America/Asuncion', region: 'South America', flag: '🇵🇾' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', currencySymbol: 'Bs', currencyName: 'Bolivian Boliviano', timezone: 'America/La_Paz', region: 'South America', flag: '🇧🇴' },
  { code: 'VE', name: 'Venezuela', currency: 'VES', currencySymbol: 'Bs.S', currencyName: 'Venezuelan Bolívar Soberano', timezone: 'America/Caracas', region: 'South America', flag: '🇻🇪' },
  { code: 'GY', name: 'Guyana', currency: 'GYD', currencySymbol: 'G$', currencyName: 'Guyanese Dollar', timezone: 'America/Guyana', region: 'South America', flag: '🇬🇾' },
  { code: 'SR', name: 'Suriname', currency: 'SRD', currencySymbol: '$', currencyName: 'Surinamese Dollar', timezone: 'America/Paramaribo', region: 'South America', flag: '🇸🇷' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', currencySymbol: '$', currencyName: 'US Dollar', timezone: 'America/Guayaquil', region: 'South America', flag: '🇪🇨' },

  // Central America & Caribbean
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', currencySymbol: 'Q', currencyName: 'Guatemalan Quetzal', timezone: 'America/Guatemala', region: 'Central America', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', currency: 'HNL', currencySymbol: 'L', currencyName: 'Honduran Lempira', timezone: 'America/Tegucigalpa', region: 'Central America', flag: '🇭🇳' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', currencySymbol: 'C$', currencyName: 'Nicaraguan Córdoba', timezone: 'America/Managua', region: 'Central America', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', currencySymbol: '₡', currencyName: 'Costa Rican Colón', timezone: 'America/Costa_Rica', region: 'Central America', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama', currency: 'PAB', currencySymbol: 'B/.', currencyName: 'Panamanian Balboa', timezone: 'America/Panama', region: 'Central America', flag: '🇵🇦' },
  { code: 'BZ', name: 'Belize', currency: 'BZD', currencySymbol: 'BZ$', currencyName: 'Belize Dollar', timezone: 'America/Belize', region: 'Central America', flag: '🇧🇿' },
  { code: 'SV', name: 'El Salvador', currency: 'USD', currencySymbol: '$', currencyName: 'US Dollar', timezone: 'America/El_Salvador', region: 'Central America', flag: '🇸🇻' },
  { code: 'JM', name: 'Jamaica', currency: 'JMD', currencySymbol: 'J$', currencyName: 'Jamaican Dollar', timezone: 'America/Jamaica', region: 'Caribbean', flag: '🇯🇲' },
  { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD', currencySymbol: 'TT$', currencyName: 'Trinidad and Tobago Dollar', timezone: 'America/Port_of_Spain', region: 'Caribbean', flag: '🇹🇹' },
  { code: 'BB', name: 'Barbados', currency: 'BBD', currencySymbol: 'Bds$', currencyName: 'Barbadian Dollar', timezone: 'America/Barbados', region: 'Caribbean', flag: '🇧🇧' },
  { code: 'BS', name: 'Bahamas', currency: 'BSD', currencySymbol: 'B$', currencyName: 'Bahamian Dollar', timezone: 'America/Nassau', region: 'Caribbean', flag: '🇧🇸' },
  { code: 'CU', name: 'Cuba', currency: 'CUP', currencySymbol: '$', currencyName: 'Cuban Peso', timezone: 'America/Havana', region: 'Caribbean', flag: '🇨🇺' },
  { code: 'DO', name: 'Dominican Republic', currency: 'DOP', currencySymbol: 'RD$', currencyName: 'Dominican Peso', timezone: 'America/Santo_Domingo', region: 'Caribbean', flag: '🇩🇴' },
  { code: 'HT', name: 'Haiti', currency: 'HTG', currencySymbol: 'G', currencyName: 'Haitian Gourde', timezone: 'America/Port-au-Prince', region: 'Caribbean', flag: '🇭🇹' },

  // Oceania
  { code: 'AU', name: 'Australia', currency: 'AUD', currencySymbol: 'A$', currencyName: 'Australian Dollar', timezone: 'Australia/Sydney', region: 'Oceania', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', currencySymbol: 'NZ$', currencyName: 'New Zealand Dollar', timezone: 'Pacific/Auckland', region: 'Oceania', flag: '🇳🇿' },
  { code: 'FJ', name: 'Fiji', currency: 'FJD', currencySymbol: 'FJ$', currencyName: 'Fijian Dollar', timezone: 'Pacific/Fiji', region: 'Oceania', flag: '🇫🇯' },
  { code: 'TO', name: 'Tonga', currency: 'TOP', currencySymbol: 'T$', currencyName: 'Tongan Paʻanga', timezone: 'Pacific/Tongatapu', region: 'Oceania', flag: '🇹🇴' },
  { code: 'WS', name: 'Samoa', currency: 'WST', currencySymbol: 'WS$', currencyName: 'Samoan Tālā', timezone: 'Pacific/Apia', region: 'Oceania', flag: '🇼🇸' },
  { code: 'VU', name: 'Vanuatu', currency: 'VUV', currencySymbol: 'VT', currencyName: 'Vanuatu Vatu', timezone: 'Pacific/Efate', region: 'Oceania', flag: '🇻🇺' },
  { code: 'SB', name: 'Solomon Islands', currency: 'SBD', currencySymbol: 'SI$', currencyName: 'Solomon Islands Dollar', timezone: 'Pacific/Guadalcanal', region: 'Oceania', flag: '🇸🇧' },
  { code: 'PG', name: 'Papua New Guinea', currency: 'PGK', currencySymbol: 'K', currencyName: 'Papua New Guinean Kina', timezone: 'Pacific/Port_Moresby', region: 'Oceania', flag: '🇵🇬' }
];

// Popular countries for quick access
export const popularCountries = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'CN', 'IN', 'BR', 'SG', 'AE'
];

// Get country by code
export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => country.code === code);
};

// Get countries by region
export const getCountriesByRegion = (region: string): Country[] => {
  return countries.filter(country => country.region === region);
};

// Get all unique regions
export const getRegions = (): string[] => {
  return [...new Set(countries.map(country => country.region))].sort();
};

// Search countries by name or currency
export const searchCountries = (query: string): Country[] => {
  const lowercaseQuery = query.toLowerCase();
  return countries.filter(country =>
    country.name.toLowerCase().includes(lowercaseQuery) ||
    country.currency.toLowerCase().includes(lowercaseQuery) ||
    country.currencyName.toLowerCase().includes(lowercaseQuery)
  );
};