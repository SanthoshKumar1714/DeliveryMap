import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dropmap_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dropmap_admin_token');
      localStorage.removeItem('dropmap_admin_partner');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (phone, pin) => api.post('/partners/login', { phone, pin }),
};
export const partnerAPI = {
  getAll: () => api.get('/partners'),
  getPending: () => api.get('/partners/pending'),
  approve: (id) => api.post(`/partners/${id}/approve`),
  reject: (id) => api.post(`/partners/${id}/reject`),
  setRole: (id, role) => api.post(`/partners/${id}/role`, { role }),
  disable: (id) => api.post(`/partners/${id}/disable`),
  enable: (id) => api.post(`/partners/${id}/enable`),
  delete: (id) => api.delete(`/partners/${id}`),
  getLocations: () => api.get('/partners/locations'),
};


export const locationAPI = {
  getPending: () => api.get('/locations/pending'),
  getAll: (params) => api.get('/locations', { params }),
  approve: (id) => api.post(`/locations/${id}/approve`),
  reject: (id, reason) => api.post(`/locations/${id}/reject`, { reason }),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
};

export const editRequestAPI = {
  getPending: () => api.get('/edit-requests/pending'),
  approve: (id) => api.post(`/edit-requests/${id}/approve`),
  reject: (id, reason) => api.post(`/edit-requests/${id}/reject`, { reason }),
};

export const settingsAPI = {
  getApprovalMode: () => api.get('/settings/approval-mode'),
  toggleApprovalMode: () => api.post('/settings/approval-mode/toggle'),
};

export default api;