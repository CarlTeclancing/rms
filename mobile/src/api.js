import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  return hostUri?.split(':')[0];
}

function getApiUrl() {
  if (configuredApiUrl && !configuredApiUrl.includes('localhost') && !configuredApiUrl.includes('127.0.0.1')) {
    return configuredApiUrl;
  }

  if (Platform.OS === 'web') {
    return configuredApiUrl || 'http://localhost:5000/api';
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    return `http://${expoHost}:5000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export const API_URL = getApiUrl();

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error(`Network request failed: ${url}`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }
  return data;
}

export const api = {
  settings: () => request('/public/settings'),
  menu: () => request('/public/menu'),
  flashSale: () => request('/public/flash-sale'),
  promotions: () => request('/public/promotions'),
  marketing: () => request('/public/marketing'),
  claimReward: (id, data) => request(`/public/marketing/${id}/claim`, { method: 'POST', body: JSON.stringify(data) }),
  customerSession: (data) => request('/public/customers/session', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/public/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  customerOrders: (id) => request(`/public/customers/${id}/orders`),
  order: (id) => request(`/public/orders/${id}`),
  driverRequests: (code) => request(`/public/drivers/${encodeURIComponent(code)}/requests`),
  acceptDelivery: (code, id) => request(`/public/drivers/${encodeURIComponent(code)}/orders/${id}/accept`, { method: 'POST' }),
  completeDelivery: (code, id) => request(`/public/drivers/${encodeURIComponent(code)}/orders/${id}/deliver`, { method: 'POST' }),
  updateDriverLocation: (code, id, data) => request(`/public/drivers/${encodeURIComponent(code)}/orders/${id}/location`, { method: 'PUT', body: JSON.stringify(data) }),
  mealReviews: (id) => request(`/public/menu/${id}/reviews`),
  createMealReview: (id, data) => request(`/public/menu/${id}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  createOrder: (data) => request('/public/orders', { method: 'POST', body: JSON.stringify(data) }),
  createReservation: (data) => request('/public/reservations', { method: 'POST', body: JSON.stringify(data) }),
  submitPromotionRequest: (data) => request('/public/promotions', { method: 'POST', body: JSON.stringify(data) })
};

export const uploadCustomerAvatar = async (file) => {
  const form = new FormData();
  form.append('image', {
    uri: file.uri,
    name: file.fileName || 'profile.jpg',
    type: file.mimeType || 'image/jpeg'
  });

  const url = `${API_URL}/public/upload/customer-avatar`;
  let response;

  try {
    response = await fetch(url, { method: 'POST', body: form });
  } catch (error) {
    throw new Error(`Network request failed: ${url}`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Upload failed');
  return data;
};

export const uploadPromotionImage = async (file) => {
  const form = new FormData();
  form.append('image', {
    uri: file.uri,
    name: file.fileName || 'promotion.jpg',
    type: file.mimeType || 'image/jpeg'
  });

  const url = `${API_URL}/public/upload/promotion-image`;
  let response;

  try {
    response = await fetch(url, { method: 'POST', body: form });
  } catch (error) {
    throw new Error(`Network request failed: ${url}`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Upload failed');
  return data;
};
