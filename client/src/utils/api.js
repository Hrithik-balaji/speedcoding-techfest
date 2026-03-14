import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach student JWT
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  const adminToken = localStorage.getItem('sc_admin_token');
  if (adminToken) cfg.headers['x-admin-token'] = adminToken;
  return cfg;
});

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/')) {
      const wasAdminRequest = !!err.config.headers?.['x-admin-token'];
      if (wasAdminRequest) {
        // Admin token expired — clear admin state and redirect to admin login
        localStorage.removeItem('sc_admin_token');
        if (!window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin';
        }
      } else {
        // Student token expired — clear student state and redirect to student login
        localStorage.removeItem('sc_token');
        localStorage.removeItem('sc_student');
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
