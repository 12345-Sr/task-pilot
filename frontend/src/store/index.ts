import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, SupportedLanguage } from '../types';
import { setAuthHeader } from '../api/client';
import { AlarmSoundId } from '../services/sound/sound.service';

export interface ActiveAlarmData {
  taskId?: string;
  taskTitle: string;
  deadlineTime?: string;
  soundId?: AlarmSoundId;
  description?: string;
}

export interface AppState {
  user: User | null;
  token: string | null;
  language: SupportedLanguage;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasCompletedOnboarding: boolean;
  streak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  isHydrated: boolean;
  isPremium: boolean;
  subscriptionInfo: { status: string; currentPeriodEnd: string | null; planPrice?: number } | null;
  paywallVisible: boolean;
  premiumStatusVisible: boolean;
  selectedTaskId: string | null;
  taskDescriptions: Record<string, string>;
  freeUsageByDate: Record<string, number>;
  freeLifetimeCreated: number;
  selectedAlarmSound: AlarmSoundId;
  taskAlarmSounds: Record<string, AlarmSoundId>;
  activeAlarm: ActiveAlarmData | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLanguage: (language: SupportedLanguage) => void;
  setGuestMode: () => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setStreak: (count: number) => void;
  incrementStreakToday: () => void;
  resetStreakToday: () => void;
  setIsHydrated: (hydrated: boolean) => void;
  setIsPremium: (isPremium: boolean) => void;
  setSubscriptionInfo: (info: { status: string; currentPeriodEnd: string | null; planPrice?: number } | null) => void;
  setPaywallVisible: (visible: boolean) => void;
  setPremiumStatusVisible: (visible: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setTaskDescription: (key: string, description: string) => void;
  setFreeLifetimeCreated: (count: number) => void;
  setSelectedAlarmSound: (sound: AlarmSoundId) => void;
  setTaskAlarmSound: (taskId: string, sound: AlarmSoundId) => void;
  setActiveAlarm: (alarm: ActiveAlarmData | null) => void;
  dismissActiveAlarm: () => void;
  recordTaskCreation: (dateStr?: string) => void;
  recordTaskDeletion: (dateStr?: string) => void;
  getFreeUsage: (dateStr?: string, activeCount?: number) => { used: number; total: number; remaining: number };
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      language: 'hi',
      isAuthenticated: false,
      isGuest: false,
      hasCompletedOnboarding: false,
      streak: 1,
      bestStreak: 1,
      lastActiveDate: null,
      isHydrated: false,
      isPremium: false,
      subscriptionInfo: null,
      paywallVisible: false,
      premiumStatusVisible: false,
      selectedTaskId: null,
      taskDescriptions: {},
      freeUsageByDate: {},
      freeLifetimeCreated: 0,
      selectedAlarmSound: 'classic_bell',
      taskAlarmSounds: {},
      activeAlarm: null,

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
      setGuestMode: () => {
        const lang = get().language || 'hi';
        set({
          isGuest: true,
          hasCompletedOnboarding: true,
          isAuthenticated: false,
          user: {
            id: 'local_user',
            name: '',
            email: '',
            language: lang,
          },
        });
      },
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
      setStreak: (count) =>
        set((state) => ({
          streak: count,
          bestStreak: Math.max(count, state.bestStreak || count),
        })),
      incrementStreakToday: () => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const lastActive = get().lastActiveDate;

        if (lastActive === todayStr) {
          // Already active today, streak is maintained
          return;
        }

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        const current = get().streak || 0;
        let newStreak = 1;
        if (lastActive === yStr) {
          newStreak = current + 1;
        } else if (!lastActive) {
          newStreak = 1;
        } else {
          newStreak = 1;
        }

        set((state) => ({
          streak: newStreak,
          bestStreak: Math.max(newStreak, state.bestStreak || newStreak),
          lastActiveDate: todayStr,
        }));
      },
      resetStreakToday: () => {
        set(() => ({
          streak: 0,
        }));
      },
      setIsHydrated: (isHydrated) => set({ isHydrated }),
      setIsPremium: (isPremium) => set({ isPremium }),
      setSubscriptionInfo: (subscriptionInfo) => set({ subscriptionInfo }),
      setPaywallVisible: (paywallVisible) => set({ paywallVisible }),
      setPremiumStatusVisible: (premiumStatusVisible) => set({ premiumStatusVisible }),
      setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
      setFreeLifetimeCreated: (count) =>
        set(() => ({
          freeLifetimeCreated: Math.min(3, Math.max(0, count || 0)),
        })),
      setSelectedAlarmSound: (sound) => set({ selectedAlarmSound: sound }),
      setTaskAlarmSound: (taskId, sound) =>
        set((state) => ({
          taskAlarmSounds: { ...state.taskAlarmSounds, [String(taskId)]: sound },
        })),
      setActiveAlarm: (alarm) => set({ activeAlarm: alarm }),
      dismissActiveAlarm: () => set({ activeAlarm: null }),
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
          freeLifetimeCreated: Math.min(3, Math.max(1, (state.freeLifetimeCreated || 0) + 1)),
          freeUsageByDate: {
            ...state.freeUsageByDate,
            [key]: Math.min(3, (state.freeUsageByDate[key] || 0) + 1),
          },
        }));
      },
      recordTaskDeletion: (_dateStr) => {
        // Free users quota
      },
      getFreeUsage: (_dateStr, activeCount) => {
        const currentRecorded = get().freeLifetimeCreated || 0;
        const count = Math.max(currentRecorded, typeof activeCount === 'number' ? activeCount : 0);
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
          isGuest: false,
          hasCompletedOnboarding: false,
          isPremium: false,
          subscriptionInfo: null,
          premiumStatusVisible: false,
        });
      },
    }),
    {
      name: '@task_alert_app_store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsHydrated(true);
          if (state.token) {
            setAuthHeader(state.token);
          }
        }
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        language: state.language,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        streak: state.streak,
        bestStreak: state.bestStreak,
        lastActiveDate: state.lastActiveDate,
        isPremium: state.isPremium,
        subscriptionInfo: state.subscriptionInfo,
        taskDescriptions: state.taskDescriptions,
        freeUsageByDate: state.freeUsageByDate,
        freeLifetimeCreated: state.freeLifetimeCreated,
        selectedAlarmSound: state.selectedAlarmSound,
        taskAlarmSounds: state.taskAlarmSounds,
      }),
    }
  )
);

// Aliases for backwards compatibility
export const useAuthStore = useAppStore;
export const useUIStore = useAppStore;

export default useAppStore;
