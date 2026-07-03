import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
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
  publicMenu: () => api.get('/public/menu'),
  createOnlineOrder: (data) => api.post('/public/orders', data),
  createReservation: (data) => api.post('/public/reservations', data),
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
  salesReport: (params) => api.get('/reports/sales', { params }),
  expensesReport: (params) => api.get('/reports/expenses', { params }),
  users: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  roles: () => api.get('/roles'),
  suppliers: () => api.get('/suppliers')
};
