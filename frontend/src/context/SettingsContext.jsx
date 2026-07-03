import { createContext, useContext, useMemo, useState } from 'react';

const defaults = {
  restaurantName: 'Restaurant Management System',
  shortName: 'Restaurant MS',
  currency: 'USD',
  deliveryFee: '0',
  publicOrdering: true,
  reservations: true,
  supportPhone: '+237 600 000 000'
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => {
    const saved = localStorage.getItem('rms_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const updateSettings = (next) => {
    const merged = { ...settings, ...next };
    localStorage.setItem('rms_settings', JSON.stringify(merged));
    setSettingsState(merged);
  };

  const value = useMemo(() => ({ settings, updateSettings }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
