import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is not set. The app will try localhost and API calls will fail in production.');
}

export const api = axios.create({
  baseURL: apiBaseUrl
});

const publicApi = axios.create({
  baseURL: apiBaseUrl
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rms_token');
      localStorage.removeItem('rms_user');
      window.dispatchEvent(new Event('rms:auth-expired'));
    }
    return Promise.reject(error);
  }
);

export const endpoints = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  dashboard: () => api.get('/dashboard/stats'),
  publicSettings: () => publicApi.get('/public/settings'),
  settings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  publicMenu: () => publicApi.get('/public/menu'),
  publicPromotions: () => publicApi.get('/public/promotions'),
  submitPromotionRequest: (data) => publicApi.post('/public/promotions', data),
  uploadPublicPromotionImage: (data) => publicApi.post('/public/upload/promotion-image', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  createOnlineOrder: (data) => publicApi.post('/public/orders', data),
  publicOnlineOrder: (id) => publicApi.get(`/public/orders/${id}`),
  createReservation: (data) => publicApi.post('/public/reservations', data),
  menuItems: (params) => api.get('/menu-items', { params }),
  createMenuItem: (data) => api.post('/menu-items', data),
  updateMenuItem: (id, data) => api.put(`/menu-items/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/menu-items/${id}`),
  menuCategories: () => api.get('/menu-categories'),
  ingredients: () => api.get('/ingredients'),
  stockItems: (params) => api.get('/stock-items', { params }),
  createStockItem: (data) => api.post('/stock-items', data),
  updateStockItem: (id, data) => api.put(`/stock-items/${id}`, data),
  deleteStockItem: (id) => api.delete(`/stock-items/${id}`),
  stockMovement: (data) => api.post('/stock-movements', data),
  stockMovements: () => api.get('/stock-movements'),
  sales: (params) => api.get('/sales', { params }),
  onlineOrders: () => api.get('/online-orders'),
  updateOnlineOrderStatus: (id, data) => api.put(`/online-orders/${id}/status`, data),
  reservations: () => api.get('/reservations'),
  updateReservationStatus: (id, data) => api.put(`/reservations/${id}/status`, data),
  createSale: (data) => api.post('/sales', data),
  expenses: (params) => api.get('/expenses', { params }),
  createExpense: (data) => api.post('/expenses', data),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  expenseCategories: () => api.get('/expense-categories'),
  uploadReceipt: (data) => api.post('/upload/receipt', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadImage: (data) => api.post('/upload/image', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  salesReport: (params) => api.get('/reports/sales', { params }),
  expensesReport: (params) => api.get('/reports/expenses', { params }),
  businessIntelligence: (params) => api.get('/analytics/business-intelligence', { params }),
  exportBusinessIntelligence: (params) => api.get('/reports/business-intelligence/export', { params, responseType: 'blob' }),
  promotions: (params) => api.get('/promotions', { params }),
  createPromotion: (data) => api.post('/promotions', data),
  updatePromotion: (id, data) => api.put(`/promotions/${id}`, data),
  deletePromotion: (id) => api.delete(`/promotions/${id}`),
  users: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  roles: () => api.get('/roles'),
  suppliers: () => api.get('/suppliers')
};
