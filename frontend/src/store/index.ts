import { create } from 'zustand';
import { User, SupportedLanguage } from '../types';
import { setAuthHeader } from '../api/client';

export interface AppState {
  user: User | null;
  token: string | null;
  language: SupportedLanguage;
  isAuthenticated: boolean;
  isPremium: boolean;
  paywallVisible: boolean;
  selectedTaskId: string | null;
  taskDescriptions: Record<string, string>;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLanguage: (language: SupportedLanguage) => void;
  setIsPremium: (isPremium: boolean) => void;
  setPaywallVisible: (visible: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setTaskDescription: (key: string, description: string) => void;
  freeUsageByDate: Record<string, number>;
  recordTaskCreation: (dateStr?: string) => void;
  recordTaskDeletion: (dateStr?: string) => void;
  getFreeUsage: (dateStr?: string, activeCount?: number) => { used: number; total: number; remaining: number };
  logout: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: null,
  language: 'hi',
  isAuthenticated: false,
  isPremium: false,
  paywallVisible: false,
  selectedTaskId: null,
  taskDescriptions: {},
  freeUsageByDate: {},

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => {
    setAuthHeader(token);
    set({ token, isAuthenticated: !!token });
  },
  setLanguage: (language) => {
    set((state) => ({
      language,
      user: state.user ? { ...state.user, language } : null,
    }));
    try {
      const { apiClient } = require('../api/client');
      apiClient.patch('/auth/language', { language }).catch(() => {});
    } catch (e) {}
  },
  setIsPremium: (isPremium) => set({ isPremium }),
  setPaywallVisible: (paywallVisible) => set({ paywallVisible }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
  setTaskDescription: (key, description) =>
    set((state) => ({
      taskDescriptions: {
        ...state.taskDescriptions,
        [key]: description,
      },
    })),
  recordTaskCreation: (dateStr) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const key = (dateStr || today).slice(0, 10);
    set((state) => ({
      freeUsageByDate: {
        ...state.freeUsageByDate,
        [key]: Math.min(3, (state.freeUsageByDate[key] || 0) + 1),
      },
    }));
  },
  recordTaskDeletion: (dateStr) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const key = (dateStr || today).slice(0, 10);
    set((state) => ({
      freeUsageByDate: {
        ...state.freeUsageByDate,
        [key]: Math.max(0, (state.freeUsageByDate[key] || 1) - 1),
      },
    }));
  },
  getFreeUsage: (dateStr, activeCount) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const key = (dateStr || today).slice(0, 10);
    
    let used: number;
    if (typeof activeCount === 'number') {
      used = Math.min(3, Math.max(0, activeCount));
      const currentStored = get().freeUsageByDate[key];
      if (currentStored !== used) {
        set((state) => ({
          freeUsageByDate: {
            ...state.freeUsageByDate,
            [key]: used,
          },
        }));
      }
    } else {
      used = Math.min(3, Math.max(0, get().freeUsageByDate[key] || 0));
    }

    return {
      used,
      total: 3,
      remaining: Math.max(0, 3 - used),
    };
  },
  logout: () => {
    setAuthHeader(null);
    set({ user: null, token: null, isAuthenticated: false, isPremium: false });
  },
}));

// Aliases for backwards compatibility
export const useAuthStore = useAppStore;
export const useUIStore = useAppStore;

export default useAppStore;
