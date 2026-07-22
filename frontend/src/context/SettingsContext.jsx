import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints } from '../services/api.js';

const defaults = {
  restaurantName: 'ChopASAP',
  shortName: 'ChopASAP',
  currency: 'XAF',
  deliveryFee: '1000',
  publicOrdering: true,
  reservations: true,
  supportPhone: '+237671286999'
};

const SettingsContext = createContext(null);

const normalizeStoredSettings = (settings = {}) => ({
  ...defaults,
  ...settings,
  restaurantName: settings.restaurantName === 'Restaurant Management System' ? defaults.restaurantName : settings.restaurantName || defaults.restaurantName,
  shortName: settings.shortName === 'Restaurant MS' ? defaults.shortName : settings.shortName || defaults.shortName,
  currency: settings.currency === 'USD' ? defaults.currency : settings.currency || defaults.currency,
  deliveryFee: String(settings.deliveryFee === '0' || settings.deliveryFee === 0 ? defaults.deliveryFee : settings.deliveryFee || defaults.deliveryFee),
  supportPhone: settings.supportPhone === '+237 600 000 000' ? defaults.supportPhone : settings.supportPhone || defaults.supportPhone
});

const normalizeApiSettings = (settings = {}) => ({
  ...defaults,
  ...settings,
  deliveryFee: String(settings.deliveryFee ?? defaults.deliveryFee)
});

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => {
    const saved = localStorage.getItem('rms_settings');
    if (!saved) return defaults;
    const normalized = normalizeStoredSettings(JSON.parse(saved));
    localStorage.setItem('rms_settings', JSON.stringify(normalized));
    return normalized;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    endpoints.publicSettings()
      .then((response) => {
        if (!active) return;
        const merged = normalizeApiSettings(response.data);
        localStorage.setItem('rms_settings', JSON.stringify(merged));
        setSettingsState(merged);
      })
      .catch(() => {
        if (active && !localStorage.getItem('rms_settings')) {
          localStorage.setItem('rms_settings', JSON.stringify(defaults));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateSettings = async (next) => {
    const merged = { ...settings, ...next };
    const response = await endpoints.updateSettings(merged);
    const saved = normalizeApiSettings(response.data);
    localStorage.setItem('rms_settings', JSON.stringify(saved));
    setSettingsState(saved);
    window.dispatchEvent(new Event('rms:settings-updated'));
    return saved;
  };

  const value = useMemo(() => ({ settings, updateSettings, loading }), [settings, loading]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
