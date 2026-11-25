import { create } from 'zustand';
import type { Dashboard, Dataset } from '../types';

interface DashboardState {
  datasets: Dataset[];
  dashboards: Dashboard[];
  currentDataset: Dataset | null;
  currentDashboard: Dashboard | null;
  activeFilters: Record<string, any>;
  isLoading: boolean;

  setDatasets: (datasets: Dataset[]) => void;
  addDataset: (dataset: Dataset) => void;
  updateDataset: (id: number, updates: Partial<Dataset>) => void;
  removeDataset: (id: number) => void;
  
  setDashboards: (dashboards: Dashboard[]) => void;
  addDashboard: (dashboard: Dashboard) => void;
  updateDashboard: (id: number, updates: Partial<Dashboard>) => void;
  removeDashboard: (id: number) => void;
  
  setCurrentDataset: (dataset: Dataset | null) => void;
  setCurrentDashboard: (dashboard: Dashboard | null) => void;
  setActiveFilters: (filters: Record<string, any>) => void;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  datasets: [],
  dashboards: [],
  currentDataset: null,
  currentDashboard: null,
  activeFilters: {},
  isLoading: false,

  setDatasets: (datasets) => set({ datasets }),
  addDataset: (dataset) => set((state) => ({ datasets: [dataset, ...state.datasets] })),
  updateDataset: (id, updates) => set((state) => ({
    datasets: state.datasets.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    currentDataset: state.currentDataset?.id === id ? { ...state.currentDataset, ...updates } : state.currentDataset,
  })),
  removeDataset: (id) => set((state) => ({
    datasets: state.datasets.filter((d) => d.id !== id),
    currentDataset: state.currentDataset?.id === id ? null : state.currentDataset,
  })),

  setDashboards: (dashboards) => set({ dashboards }),
  addDashboard: (dashboard) => set((state) => ({ dashboards: [dashboard, ...state.dashboards] })),
  updateDashboard: (id, updates) => set((state) => ({
    dashboards: state.dashboards.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    currentDashboard: state.currentDashboard?.id === id ? { ...state.currentDashboard, ...updates } : state.currentDashboard,
  })),
  removeDashboard: (id) => set((state) => ({
    dashboards: state.dashboards.filter((d) => d.id !== id),
    currentDashboard: state.currentDashboard?.id === id ? null : state.currentDashboard,
  })),

  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
  setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard }),
  setActiveFilters: (filters) => set({ activeFilters: filters }),
  updateFilter: (key, value) => set((state) => ({
    activeFilters: { ...state.activeFilters, [key]: value },
  })),
  clearFilters: () => set({ activeFilters: {} }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
