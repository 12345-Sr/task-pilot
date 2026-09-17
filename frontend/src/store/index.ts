import { create } from 'zustand';
import { User, SupportedLanguage } from '../types';
import { setAuthHeader } from '../api/client';

export interface AppState {
  user: User | null;
  token: string | null;
  language: SupportedLanguage;
  isAuthenticated: boolean;
  isPremium: boolean;
  subscriptionInfo: { status: string; currentPeriodEnd: string | null; planPrice?: number } | null;
  paywallVisible: boolean;
  premiumStatusVisible: boolean;
  selectedTaskId: string | null;
  taskDescriptions: Record<string, string>;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLanguage: (language: SupportedLanguage) => void;
  setIsPremium: (isPremium: boolean) => void;
  setSubscriptionInfo: (info: { status: string; currentPeriodEnd: string | null; planPrice?: number } | null) => void;
  setPaywallVisible: (visible: boolean) => void;
  setPremiumStatusVisible: (visible: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setTaskDescription: (key: string, description: string) => void;
  freeUsageByDate: Record<string, number>;
  freeLifetimeCreated: number;
  setFreeLifetimeCreated: (count: number) => void;
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
  subscriptionInfo: null,
  paywallVisible: false,
  premiumStatusVisible: false,
  selectedTaskId: null,
  taskDescriptions: {},
  freeUsageByDate: {},
  freeLifetimeCreated: 0,

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
  setSubscriptionInfo: (subscriptionInfo) => set({ subscriptionInfo }),
  setPaywallVisible: (paywallVisible) => set({ paywallVisible }),
  setPremiumStatusVisible: (premiumStatusVisible) => set({ premiumStatusVisible }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
  setFreeLifetimeCreated: (count) =>
    set({ freeLifetimeCreated: Math.min(3, Math.max(0, count)) }),
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
      freeLifetimeCreated: Math.min(3, (state.freeLifetimeCreated || 0) + 1),
      freeUsageByDate: {
        ...state.freeUsageByDate,
        [key]: Math.min(3, (state.freeUsageByDate[key] || 0) + 1),
      },
    }));
  },
  recordTaskDeletion: (_dateStr) => {
    // Free users receive only 3 lifetime tasks total.
    // Deleting a created task does not restore the free creation quota.
  },
  getFreeUsage: (_dateStr, activeCount) => {
    const count = typeof activeCount === 'number'
      ? activeCount
      : (get().freeLifetimeCreated || 0);
    const used = Math.min(3, Math.max(0, count));
    return {
      used,
      total: 3,
      remaining: Math.max(0, 3 - used),
    };
  },
  logout: () => {
    setAuthHeader(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isPremium: false,
      subscriptionInfo: null,
      premiumStatusVisible: false,
    });
  },
}));

// Aliases for backwards compatibility
export const useAuthStore = useAppStore;
export const useUIStore = useAppStore;

export default useAppStore;
