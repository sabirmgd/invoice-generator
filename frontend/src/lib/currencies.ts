export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  // Popular
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  // Middle East
  { code: 'SAR', symbol: '\u0631.\u0633', name: 'Saudi Riyal', decimals: 2 },
  { code: 'AED', symbol: '\u062F.\u0625', name: 'UAE Dirham', decimals: 2 },
  { code: 'QAR', symbol: '\u0631.\u0642', name: 'Qatari Riyal', decimals: 2 },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', decimals: 3 },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', decimals: 3 },
  { code: 'OMR', symbol: '\u0631.\u0639', name: 'Omani Rial', decimals: 3 },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', decimals: 3 },
  { code: 'EGP', symbol: 'E\u00A3', name: 'Egyptian Pound', decimals: 2 },
  { code: 'ILS', symbol: '\u20AA', name: 'Israeli Shekel', decimals: 2 },
  { code: 'TRY', symbol: '\u20BA', name: 'Turkish Lira', decimals: 2 },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', decimals: 2 },
  // Asia
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen', decimals: 0 },
  { code: 'CNY', symbol: '\u00A5', name: 'Chinese Yuan', decimals: 2 },
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee', decimals: 2 },
  { code: 'KRW', symbol: '\u20A9', name: 'South Korean Won', decimals: 0 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', decimals: 2 },
  { code: 'THB', symbol: '\u0E3F', name: 'Thai Baht', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  { code: 'PHP', symbol: '\u20B1', name: 'Philippine Peso', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0 },
  { code: 'VND', symbol: '\u20AB', name: 'Vietnamese Dong', decimals: 0 },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', decimals: 2 },
  { code: 'BDT', symbol: '\u09F3', name: 'Bangladeshi Taka', decimals: 2 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', decimals: 2 },
  // Europe
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2 },
  { code: 'PLN', symbol: 'z\u0142', name: 'Polish Zloty', decimals: 2 },
  { code: 'CZK', symbol: 'K\u010D', name: 'Czech Koruna', decimals: 2 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', decimals: 0 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimals: 2 },
  { code: 'RUB', symbol: '\u20BD', name: 'Russian Ruble', decimals: 2 },
  // Americas
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimals: 2 },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', decimals: 2 },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', decimals: 0 },
  { code: 'COP', symbol: 'CO$', name: 'Colombian Peso', decimals: 0 },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2 },
  // Africa
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
  { code: 'NGN', symbol: '\u20A6', name: 'Nigerian Naira', decimals: 2 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2 },
  { code: 'GHS', symbol: 'GH\u20B5', name: 'Ghanaian Cedi', decimals: 2 },
];

export const CURRENCY_GROUPS = [
  { label: 'Popular', codes: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF'] },
  { label: 'Middle East', codes: ['SAR', 'AED', 'QAR', 'BHD', 'KWD', 'OMR', 'JOD', 'EGP', 'ILS', 'TRY', 'MAD'] },
  { label: 'Asia', codes: ['JPY', 'CNY', 'INR', 'KRW', 'SGD', 'HKD', 'TWD', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'PKR', 'BDT', 'LKR'] },
  { label: 'Europe', codes: ['SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'RUB'] },
  { label: 'Americas', codes: ['BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN'] },
  { label: 'Africa', codes: ['ZAR', 'NGN', 'KES', 'GHS'] },
];

const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    const info = CURRENCY_MAP[currencyCode];
    if (info) {
      return `${info.symbol} ${Number(amount).toFixed(info.decimals)}`;
    }
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
}
