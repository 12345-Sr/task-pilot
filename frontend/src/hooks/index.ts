import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tasksRepository,
  progressRepository,
  subscriptionRepository,
  userRepository,
  apiClient,
  USE_MOCK_API,
} from '../api';
import { Alert } from 'react-native';
import { CreateTaskInput, UpdateTaskInput, Priority } from '../types';
import { useAppStore } from '../store';
import { NotificationService } from '../services/notifications/notification.service';
import { taskHistoryService } from '../services/history/taskHistory.service';
import { mapDbTask } from '../api/remote';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

export const QUERY_KEYS = {
  TODAY_TASKS: ['tasks', 'today'],
  ALL_TASKS: ['tasks', 'all'],
  TASK_HISTORY: ['tasks', 'history'],
  TASK: (id: string) => ['tasks', id],
  PROGRESS: ['progress', 'summary'],
  TODAY_PROGRESS: ['progress', 'today'],
  STREAK: ['progress', 'streak'],
  SUBSCRIPTION: ['subscription', 'status'],
  USER: ['user', 'me'],
};

// -------------------------------------------------------------
// TASKS HOOKS
// -------------------------------------------------------------
export function useTodayTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.TODAY_TASKS,
    queryFn: () => tasksRepository.getAll(),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TASK(id),
    queryFn: () => tasksRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => {
      const priorityMap: Record<string, any> = {
        high: 'URGENT',
        medium: 'MEDIUM',
        low: 'NORMAL',
        URGENT: 'URGENT',
        MEDIUM: 'MEDIUM',
        NORMAL: 'NORMAL',
        ZAROORI: 'URGENT',
        zaroori: 'URGENT',
        important: 'URGENT',
        IMPORTANT: 'URGENT',
      };

      const getLocalToday = () => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      };
      const getLocalTomorrow = () => {
        const n = new Date();
        n.setDate(n.getDate() + 1);
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      };

      let dateVal = input.date;
      if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        if (input.targetDate === 'kal' || input.targetDate === 'tomorrow') {
          dateVal = getLocalTomorrow();
        } else if (input.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) {
          dateVal = input.targetDate;
        } else {
          dateVal = getLocalToday();
        }
      }

      const payload: CreateTaskInput = {
        title: input.title,
        description: input.description,
        date: dateVal,
        targetDate: dateVal,
        time: input.reminderTime || input.time || '10:00 AM',
        priority: priorityMap[input.priority] || 'MEDIUM',
        reminderMinutes: 30,
      };
      return tasksRepository.create(payload);
    },
    onSuccess: (created: any) => {
      const userId = useAppStore.getState().user?.id;
      if (created) {
        taskHistoryService.recordCreatedTask(created, userId).catch(() => { });
      }
      useAppStore.getState().recordTaskCreation(created?.targetDate || created?.date);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ALL_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK_HISTORY });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROGRESS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_PROGRESS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input?: UpdateTaskInput } & Partial<UpdateTaskInput>) => {
      const { id, input, ...rest } = args;
      const payload: UpdateTaskInput = input || (rest as UpdateTaskInput);
      return tasksRepository.update(id, payload);
    },
    onSuccess: (updated: any, args) => {
      const id = typeof args === 'string' ? args : args.id;
      const userId = useAppStore.getState().user?.id;
      if (updated) {
        taskHistoryService.updateTaskInHistory(id, updated, userId).catch(() => { });
      }
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ALL_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK_HISTORY });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROGRESS });
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: string | { id: string; completed?: boolean; status?: 'COMPLETED' | 'MISSED' }) => {
      const id = typeof args === 'string' ? args : args.id;
      const completed = typeof args === 'object' ? args.completed : undefined;
      const status = typeof args === 'object' ? args.status : undefined;
      if (completed !== false) {
        NotificationService.cancelTaskAlerts(id).catch(() => { });
      }
      return tasksRepository.complete(id, completed, status);
    },
    onSuccess: (updated: any, args) => {
      const id = typeof args === 'string' ? args : args.id;
      const completed = typeof args === 'object' ? args.completed : undefined;
      const status = typeof args === 'object' ? args.status : undefined;
      const userId = useAppStore.getState().user?.id;
      taskHistoryService.updateTaskInHistory(
        id,
        {
          completed: completed !== false,
          confirmationStatus: status || (completed ? 'COMPLETED' : 'PENDING'),
        },
        userId
      ).catch(() => { });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ALL_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK_HISTORY });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROGRESS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_PROGRESS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STREAK });
    },
  });
}

export function useTaskHistory(filterStatus: 'all' | 'done' | 'pending' | 'missed' = 'all', searchQuery: string = '') {
  const { user } = useAppStore();
  const userId = user?.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.TASK_HISTORY, filterStatus, searchQuery, userId || 'anon'],
    queryFn: async () => {
      let serverTasks: any[] = [];
      let serverStats: any = null;

      try {
        const params = new URLSearchParams();
        if (filterStatus !== 'all') params.append('status', filterStatus);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());

        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res: any = await apiClient.get(`/tasks/history${queryStr}`);
        serverTasks = res?.tasks || [];
        serverStats = res?.stats || null;
      } catch (histErr) {
        // Resilient fallback to /tasks (supported across all backend versions to fetch DB tasks)
        try {
          const res: any = await apiClient.get('/tasks');
          serverTasks = res?.tasks ?? res?.data ?? (Array.isArray(res) ? res : []);
        } catch (tasksErr) {
          serverTasks = [];
        }
      }

      const mappedServer = Array.isArray(serverTasks) ? serverTasks.map(mapDbTask) : [];
      const synced = await taskHistoryService.syncWithServer(mappedServer, userId);

      let filtered = synced;
      if (filterStatus !== 'all') {
        filtered = filtered.filter((t) => {
          const statusStr = String((t as any).status || t.confirmationStatus || '').toLowerCase();
          const isDone = t.completed || statusStr === 'completed' || statusStr === 'done';
          const isMissed = statusStr === 'missed';
          if (filterStatus === 'done') return isDone;
          if (filterStatus === 'missed') return isMissed;
          if (filterStatus === 'pending') return !isDone && !isMissed;
          return true;
        });
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.title?.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.notes?.toLowerCase().includes(q)
        );
      }

      const stats = serverStats || taskHistoryService.computeStats(synced);
      return {
        tasks: filtered,
        allTasks: synced,
        stats,
      };
    },
    staleTime: 1000 * 15,
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      NotificationService.cancelTaskAlerts(id).catch(() => { });
      return tasksRepository.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ALL_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROGRESS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_PROGRESS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STREAK });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION });
    },
  });
}

export function useRepeatTaskMonthly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksRepository.repeatMonthly(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ALL_TASKS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROGRESS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_PROGRESS });
    },
  });
}

// -------------------------------------------------------------
// PROGRESS HOOKS
// -------------------------------------------------------------
export function useWeeklyProgress() {
  return useQuery({
    queryKey: QUERY_KEYS.PROGRESS,
    queryFn: async () => {
      const p: any = await progressRepository.getProgress();
      return {
        streak: p.streak ?? 0,
        bestStreak: p.bestStreak ?? p.streak ?? 0,
        completionRate: p.completionRate ?? 0,
        totalCompleted: p.totalCompleted ?? p.completedTasks ?? 0,
        pendingTasks: p.pendingTasks ?? 0,
        bestDay: p.bestDay ?? null,
        weeklyDays: p.weeklyDays ?? p.weekDays ?? [
          { day: 'M', completed: 0, total: 0 },
          { day: 'T', completed: 0, total: 0 },
          { day: 'W', completed: 0, total: 0 },
          { day: 'T', completed: 0, total: 0 },
          { day: 'F', completed: 0, total: 0 },
          { day: 'S', completed: 0, total: 0 },
          { day: 'S', completed: 0, total: 0 },
        ],
      };
    },
  });
}

export function useTodayProgress() {
  return useQuery({
    queryKey: QUERY_KEYS.TODAY_PROGRESS,
    queryFn: () => progressRepository.getToday(),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: QUERY_KEYS.STREAK,
    queryFn: () => progressRepository.getStreak(),
  });
}

// -------------------------------------------------------------
// USER & AUTH HOOKS
// -------------------------------------------------------------
export function useUserProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.USER,
    queryFn: () => userRepository.getMe(),
  });
}

export function useLogin() {
  const { setToken, setUser, setLanguage, setIsPremium } = useAppStore();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res: any = await apiClient.post('/auth/login', credentials);
      const { token, user, isPremium, subscription } = res?.data || res;
      setToken(token);
      setUser(user);
      const isPro = Boolean(isPremium || subscription?.status === 'active' || user?.isPremium);
      setIsPremium(isPro);
      if (user?.language) {
        setLanguage(user.language as any);
      }
      return { user, token, isPremium: isPro };
    },
  });
}

export function useSendRegisterOtp() {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const res: any = await apiClient.post('/auth/send-register-otp', data);
      return res?.data || res;
    },
  });
}

export function useVerifyRegisterOtp() {
  return useMutation({
    mutationFn: async (data: { email: string; otp: string }) => {
      const res: any = await apiClient.post('/auth/verify-register-otp', data);
      return res?.data || res;
    },
  });
}

export function useRegister() {
  const { setToken, setUser, language, setIsPremium } = useAppStore();
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; otp?: string; language?: string }) => {
      const res: any = await apiClient.post('/auth/register', {
        ...data,
        language: data.language || language || 'en',
      });
      const { token, user } = res?.data || res;
      setToken(token);
      setUser(user);
      setIsPremium(false);
      return { user, token };
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const res: any = await apiClient.post('/auth/forgot-password', data);
      return res?.data || res;
    },
  });
}

export function useVerifyResetOtp() {
  return useMutation({
    mutationFn: async (data: { email: string; otp: string }) => {
      const res: any = await apiClient.post('/auth/verify-reset-otp', data);
      return res?.data || res;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { email: string; otp: string; newPassword: string }) => {
      const res: any = await apiClient.post('/auth/reset-password', data);
      return res?.data || res;
    },
  });
}

// -------------------------------------------------------------
// SUBSCRIPTION HOOKS
// -------------------------------------------------------------
export function useSubscription() {
  const { setIsPremium, setSubscriptionInfo, setFreeLifetimeCreated, setPaywallVisible, language } = useAppStore();
  return useQuery({
    queryKey: QUERY_KEYS.SUBSCRIPTION,
    queryFn: async () => {
      const sub = await subscriptionRepository.getStatus();
      const isPro = sub?.status === 'active' || (sub as any)?.isPremium === true;
      setIsPremium(isPro);
      setSubscriptionInfo({
        status: sub?.status || (isPro ? 'active' : 'free'),
        currentPeriodEnd: (sub as any)?.currentPeriodEnd || null,
        planPrice: (sub as any)?.planPrice || 399,
      });
      if (typeof (sub as any)?.dailyUsed === 'number') {
        setFreeLifetimeCreated((sub as any).dailyUsed);
      }
      if ((sub as any)?.expired === true) {
        NotificationService.sendQuotaLimitNotification(
          language === 'hi' ? '⚠️ Pro Plan Expire Ho Gaya' : '⚠️ Pro Plan Expired',
          language === 'hi'
            ? 'Aapka Pro subscription expire ho gaya hai. Aap wapas Free tier par aa gaye hain. Naye tasks aur reminder alerts pane ke liye Pro upgrade karein.'
            : 'Your Pro plan has expired and returned to the Free tier. Upgrade to Pro to create new tasks and receive reminder alerts.'
        );
        Alert.alert(
          language === 'hi' ? '⚠️ Pro Plan Expire Ho Gaya' : '⚠️ Pro Plan Expired',
          language === 'hi'
            ? 'Aapka Pro plan expire ho gaya hai. Aap wapas Free tier (3 tasks limit) par aa gaye hain. Naye tasks aur reminder alerts ke liye Pro me upgrade karein.'
            : 'Your Pro plan has expired and returned to the Free tier (3 tasks limit). Upgrade to Pro to continue creating tasks and receiving alerts.',
          [
            { text: language === 'hi' ? 'Baad me' : 'Later', style: 'cancel' },
            {
              text: language === 'hi' ? 'Abhi Upgrade Karein' : 'Upgrade to Pro',
              onPress: () => setPaywallVisible(true),
            },
          ]
        );
      }
      return sub;
    },
    staleTime: 30000,
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  const { setIsPremium } = useAppStore();
  return useMutation({
    mutationFn: async (plan: string) => {
      const res = await subscriptionRepository.subscribe(plan);
      setIsPremium(true);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION });
    },
  });
}

export const useUpgradeSubscription = useSubscribe;
