import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string } | undefined;
    return data?.detail || error.message || 'An error occurred';
  }
  return String(error);
};

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string; full_name?: string; company?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { full_name?: string; company?: string; username?: string }) =>
    api.put('/auth/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
};

// Datasets API
export const datasetsApi = {
  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    }),
  list: () => api.get('/datasets/'),
  get: (id: number) => api.get(`/datasets/${id}`),
  preview: (id: number, page = 1, pageSize = 50) =>
    api.get(`/datasets/${id}/preview?page=${page}&page_size=${pageSize}`),
  delete: (id: number) => api.delete(`/datasets/${id}`),
  exportCsv: (id: number) => `${API_BASE}/datasets/${id}/export/csv`,
  exportExcel: (id: number) => `${API_BASE}/datasets/${id}/export/excel`,
  selectSheet: (id: number, sheetName: string) => {
    const fd = new FormData();
    fd.append('sheet_name', sheetName);
    return api.post(`/datasets/${id}/select-sheet`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Dashboards API
export const dashboardsApi = {
  list: () => api.get('/dashboards/'),
  get: (id: number) => api.get(`/dashboards/${id}`),
  create: (data: { dataset_id: number; name: string; description?: string; theme?: string }) =>
    api.post('/dashboards/', data),
  update: (id: number, data: Partial<{
    name: string; description: string; kpis: any[]; charts: any[];
    filters: object; theme: string; layout: object;
  }>) => api.put(`/dashboards/${id}`, data),
  delete: (id: number) => api.delete(`/dashboards/${id}`),
  togglePublic: (id: number) => api.post(`/dashboards/${id}/toggle-public`),
  exportPdf: (id: number) => `${API_BASE}/dashboards/${id}/export/pdf`,
  getPublic: (token: string) => api.get(`/dashboards/public/${token}`),
};

// Analytics API
export const analyticsApi = {
  chat: (datasetId: number, question: string, history?: Array<{ role: string; content: string }>) =>
    api.post('/analytics/chat', { dataset_id: datasetId, question, history }),
  insights: (datasetId: number) =>
    api.get(`/analytics/insights/${datasetId}`),
  chartData: (data: {
    dataset_id: number;
    chart_id: string;
    chart_type: string;
    x_axis?: string;
    y_axis?: string;
    category_col?: string;
    filters?: object;
    top_n?: number;
  }) => api.post('/analytics/chart-data', data),
  summary: (datasetId: number) =>
    api.get(`/analytics/summary/${datasetId}`),
  correlations: (datasetId: number) =>
    api.get(`/analytics/correlations/${datasetId}`),
};
