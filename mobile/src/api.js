const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
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
  customerSession: (data) => request('/public/customers/session', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/public/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  customerOrders: (id) => request(`/public/customers/${id}/orders`),
  order: (id) => request(`/public/orders/${id}`),
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

  const response = await fetch(`${API_URL}/public/upload/customer-avatar`, {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
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

  const response = await fetch(`${API_URL}/public/upload/promotion-image`, {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Upload failed');
  return data;
};
