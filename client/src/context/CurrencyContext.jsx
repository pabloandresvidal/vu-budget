import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
];

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState('USD');

  useEffect(() => {
    if (user) {
      api.getProfile().then(p => {
        if (p.currency) setCurrencyState(p.currency);
      }).catch(() => {});
    }
  }, [user]);

  function formatCurrency(n) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
    }).format(n || 0);
  }

  async function setCurrency(newCurrency) {
    setCurrencyState(newCurrency);
    try {
      await api.updateProfile({ currency: newCurrency });
    } catch (e) {
      console.error('Failed to save currency preference', e);
    }
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

export { CURRENCIES };
