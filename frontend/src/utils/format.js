export const currency = (value) => {
  let selectedCurrency = 'USD';
  try {
    const saved = JSON.parse(localStorage.getItem('rms_settings') || '{}');
    selectedCurrency = saved.currency || selectedCurrency;
  } catch {
    selectedCurrency = 'USD';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(Number(value || 0));
};

export const compactDate = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
