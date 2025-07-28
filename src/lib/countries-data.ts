export interface CountryData {
  name: string;
  code: string;
  dialCode: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  flag: string;
}

export const countriesData: CountryData[] = [
  {
    name: "Kenya",
    code: "KE",
    dialCode: "+254",
    currency: "KES",
    currencySymbol: "KES",
    timezone: "Africa/Nairobi",
    flag: "🇰🇪"
  },
  {
    name: "Uganda",
    code: "UG", 
    dialCode: "+256",
    currency: "UGX",
    currencySymbol: "USh",
    timezone: "Africa/Kampala",
    flag: "🇺🇬"
  },
  {
    name: "Tanzania",
    code: "TZ",
    dialCode: "+255",
    currency: "TZS",
    currencySymbol: "TSh",
    timezone: "Africa/Dar_es_Salaam",
    flag: "🇹🇿"
  },
  {
    name: "Rwanda",
    code: "RW",
    dialCode: "+250",
    currency: "RWF",
    currencySymbol: "FRw",
    timezone: "Africa/Kigali",
    flag: "🇷🇼"
  },
  {
    name: "Burundi",
    code: "BI",
    dialCode: "+257",
    currency: "BIF",
    currencySymbol: "FBu",
    timezone: "Africa/Bujumbura",
    flag: "🇧🇮"
  },
  {
    name: "South Sudan",
    code: "SS",
    dialCode: "+211",
    currency: "SSP",
    currencySymbol: "SS£",
    timezone: "Africa/Juba",
    flag: "🇸🇸"
  },
  {
    name: "Ethiopia",
    code: "ET",
    dialCode: "+251",
    currency: "ETB",
    currencySymbol: "Br",
    timezone: "Africa/Addis_Ababa",
    flag: "🇪🇹"
  },
  {
    name: "Somalia",
    code: "SO",
    dialCode: "+252",
    currency: "SOS",
    currencySymbol: "Sh",
    timezone: "Africa/Mogadishu",
    flag: "🇸🇴"
  },
  {
    name: "Nigeria",
    code: "NG",
    dialCode: "+234",
    currency: "NGN",
    currencySymbol: "₦",
    timezone: "Africa/Lagos",
    flag: "🇳🇬"
  },
  {
    name: "Ghana",
    code: "GH",
    dialCode: "+233",
    currency: "GHS",
    currencySymbol: "₵",
    timezone: "Africa/Accra",
    flag: "🇬🇭"
  },
  {
    name: "South Africa",
    code: "ZA",
    dialCode: "+27",
    currency: "ZAR",
    currencySymbol: "R",
    timezone: "Africa/Johannesburg",
    flag: "🇿🇦"
  },
  {
    name: "Egypt",
    code: "EG",
    dialCode: "+20",
    currency: "EGP",
    currencySymbol: "£E",
    timezone: "Africa/Cairo",
    flag: "🇪🇬"
  },
  {
    name: "Morocco",
    code: "MA",
    dialCode: "+212",
    currency: "MAD",
    currencySymbol: "DH",
    timezone: "Africa/Casablanca",
    flag: "🇲🇦"
  },
  {
    name: "Tunisia",
    code: "TN",
    dialCode: "+216",
    currency: "TND",
    currencySymbol: "DT",
    timezone: "Africa/Tunis",
    flag: "🇹🇳"
  },
  {
    name: "Algeria",
    code: "DZ",
    dialCode: "+213",
    currency: "DZD",
    currencySymbol: "DA",
    timezone: "Africa/Algiers",
    flag: "🇩🇿"
  },
  {
    name: "Libya",
    code: "LY",
    dialCode: "+218",
    currency: "LYD",
    currencySymbol: "LD",
    timezone: "Africa/Tripoli",
    flag: "🇱🇾"
  },
  {
    name: "Sudan",
    code: "SD",
    dialCode: "+249",
    currency: "SDG",
    currencySymbol: "ج.س",
    timezone: "Africa/Khartoum",
    flag: "🇸🇩"
  },
  {
    name: "United States",
    code: "US",
    dialCode: "+1",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/New_York",
    flag: "🇺🇸"
  },
  {
    name: "United Kingdom",
    code: "GB",
    dialCode: "+44",
    currency: "GBP",
    currencySymbol: "£",
    timezone: "Europe/London",
    flag: "🇬🇧"
  },
  {
    name: "Canada",
    code: "CA",
    dialCode: "+1",
    currency: "CAD",
    currencySymbol: "C$",
    timezone: "America/Toronto",
    flag: "🇨🇦"
  },
  {
    name: "Australia",
    code: "AU",
    dialCode: "+61",
    currency: "AUD",
    currencySymbol: "A$",
    timezone: "Australia/Sydney",
    flag: "🇦🇺"
  },
  {
    name: "India",
    code: "IN",
    dialCode: "+91",
    currency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    flag: "🇮🇳"
  },
  {
    name: "Other",
    code: "XX",
    dialCode: "+1",
    currency: "USD",
    currencySymbol: "$",
    timezone: "UTC",
    flag: "🌍"
  }
];

export const getCountryByCode = (code: string): CountryData | undefined => {
  return countriesData.find(country => country.code === code);
};

export const getCountryByName = (name: string): CountryData | undefined => {
  return countriesData.find(country => country.name === name);
};