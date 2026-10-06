import { apiClient } from '../client';
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  User,
  Subscription,
  ProgressSummary,
  Priority,
} from '../../types';
import {
  TasksRepository,
  ProgressRepository,
  UserRepository,
  SubscriptionRepository,
} from '../repository.interface';
import { useAppStore } from '../../store';
import { taskHistoryService } from '../../services/history/taskHistory.service';

export function parseTaskDate(val: any): string {
  if (!val) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return str.slice(0, 10);
}

export function mapDbTask(t: any): Task {
  if (!t) return {} as Task;
  const idStr = String(t.task_id || t.id || '');
  const isDone = t.status === 'done' || t.completed === true;
  const isMissed = t.status === 'missed';
  const confirmation = isDone ? 'COMPLETED' : isMissed ? 'MISSED' : 'PENDING';
  const rawDate = parseTaskDate(t.task_date || t.targetDate || t.date);
  const rawTime = t.task_time ? String(t.task_time).slice(0, 5) : (t.reminderTime || t.time || '10:00 AM');
  const pStr = String(t.priority || '').toUpperCase();
  const priorityVal: Priority =
    t.priority === 'important' || pStr === 'URGENT' || pStr === 'HIGH' || pStr === 'ZAROORI' || pStr === 'IMPORTANT'
      ? 'URGENT'
      : (pStr === 'NORMAL' || pStr === 'LOW' ? 'NORMAL' : 'MEDIUM');

  const titleStr = String(t.title || '').trim();
  const descMap = useAppStore.getState().taskDescriptions || {};
  const localDesc = descMap[idStr] || descMap[`${titleStr}_${rawDate}`] || descMap[titleStr] || '';
  const resolvedDesc = t.description || t.notes || localDesc || '';

  // Keep local description cache synced
  if (resolvedDesc) {
    if (idStr && !descMap[idStr]) {
      useAppStore.getState().setTaskDescription(idStr, resolvedDesc);
    }
    if (titleStr) {
      useAppStore.getState().setTaskDescription(`${titleStr}_${rawDate}`, resolvedDesc);
      useAppStore.getState().setTaskDescription(titleStr, resolvedDesc);
    }
  }

  return {
    id: idStr,
    userId: t.user_id || t.userId,
    title: titleStr,
    description: resolvedDesc,
    notes: resolvedDesc,
    date: rawDate,
    targetDate: rawDate,
    time: rawTime,
    deadlineTime: rawTime,
    reminderTime: rawTime,
    priority: priorityVal,
    completed: isDone,
    confirmationStatus: confirmation,
    createdAt: t.created_at || t.createdAt,
    updatedAt: t.updated_at || t.updatedAt,
  };
}

export const getTaskSortTime = (t: Task): number => {
  if (t.createdAt) {
    const ms = new Date(t.createdAt).getTime();
    if (!isNaN(ms) && ms > 0) return ms;
  }
  if ((t as any).createdAtTimestamp) {
    const ts = Number((t as any).createdAtTimestamp);
    if (!isNaN(ts) && ts > 0) return ts;
  }
  if (t.updatedAt) {
    const ms = new Date(t.updatedAt).getTime();
    if (!isNaN(ms) && ms > 0) return ms;
  }
  if (typeof t.id === 'string' && t.id.startsWith('task_')) {
    const parts = t.id.split('_');
    const ts = parseInt(parts[1], 10);
    if (!isNaN(ts) && ts > 0) return ts;
  }
  const num = parseInt(String(t.id), 10);
  if (!isNaN(num) && num > 0) return num;
  return 0;
};

export class RemoteTasksRepository implements TasksRepository {
  async getToday(): Promise<Task[]> {
    const all = await this.getAll();
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return all
      .filter((task) => {
        const taskDate = task.targetDate || task.date;
        return !taskDate || taskDate === todayIso || (taskDate < todayIso && !task.completed);
      })
      .sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a));
  }

  async getAll(): Promise<Task[]> {
    const userId = useAppStore.getState().user?.id;
    const token = useAppStore.getState().token;

    if (token) {
      try {
        const res: any = await apiClient.get('/tasks');
        if (typeof res?.lifetime_tasks_created === 'number') {
          useAppStore.getState().setFreeLifetimeCreated(res.lifetime_tasks_created);
        }
        const list = res?.tasks ?? res?.data ?? (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          const mapped = list.map(mapDbTask);
          await taskHistoryService.syncWithServer(mapped, userId);
          const historyTasks = await taskHistoryService.getLocalHistory(userId);
          const deletedSet = new Set(historyTasks.filter((t) => t.deletedFromToday).map((t) => t.id));
          return mapped
            .filter((t) => !deletedSet.has(t.id))
            .sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a));
        }
      } catch (err: any) {
        // Fallback to local storage
      }
    }

    // Load from local AsyncStorage (seeded with helpful friendly tasks if first time)
    const local = await taskHistoryService.getOrInitLocalHistory(userId);
    return local
      .filter((t) => !t.deletedFromToday)
      .sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a));
  }

  async getById(id: string): Promise<Task> {
    const userId = useAppStore.getState().user?.id;
    const token = useAppStore.getState().token;

    if (token) {
      try {
        const res: any = await apiClient.get(`/tasks/${id}`);
        return mapDbTask(res?.task || res?.data || res);
      } catch (err) {}
    }

    const localList = await taskHistoryService.getLocalHistory(userId);
    const found = localList.find((t) => t.id === id);
    if (found) return found;

    return {
      id,
      title: 'Task',
      date: new Date().toISOString().slice(0, 10),
      time: '10:00 AM',
      priority: 'MEDIUM',
      completed: false,
    };
  }

  async create(task: CreateTaskInput): Promise<Task> {
    const userId = useAppStore.getState().user?.id;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    const tomorrowStr = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;

    let rawDate = task.date || task.targetDate || todayStr;
    if (rawDate === 'kal' || rawDate === 'tomorrow') {
      rawDate = tomorrowStr;
    } else if (rawDate === 'aaj' || rawDate === 'today' || !/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      rawDate = todayStr;
    }
    const task_date = rawDate.slice(0, 10);
    const task_time = task.time || task.reminderTime || '10:00 AM';
    const pStr = String(task.priority || '').toUpperCase();
    const isImportant =
      pStr === 'URGENT' ||
      pStr === 'HIGH' ||
      pStr === 'ZAROORI' ||
      pStr === 'IMPORTANT';
    const priority: Priority = isImportant ? 'URGENT' : 'MEDIUM';

    const descValue = task.description || (task as any).notes || '';
    if (descValue && task.title) {
      useAppStore.getState().setTaskDescription(`${task.title.trim()}_${task_date}`, descValue);
      useAppStore.getState().setTaskDescription(task.title.trim(), descValue);
    }

    const localId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const localTask: Task = {
      id: localId,
      userId: userId || 'local_user',
      title: task.title.trim(),
      description: descValue,
      notes: descValue,
      date: task_date,
      targetDate: task_date,
      time: task_time,
      reminderTime: task_time,
      priority,
      completed: false,
      confirmationStatus: 'PENDING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 1. Immediately save to persistent local storage & store quota
    await taskHistoryService.recordCreatedTask(localTask, userId);
    useAppStore.getState().recordTaskCreation(task_date);

    // 2. If authenticated, sync with cloud backend in parallel
    const token = useAppStore.getState().token;
    if (token) {
      try {
        const payload = {
          title: task.title,
          description: descValue,
          notes: descValue,
          task_date,
          task_time,
          priority: isImportant ? 'important' : 'medium',
          repeat_monthly: task.repeatMonthly,
        };
        const res: any = await apiClient.post('/tasks', payload);
        if (typeof res?.lifetime_tasks_created === 'number') {
          useAppStore.getState().setFreeLifetimeCreated(res.lifetime_tasks_created);
        }
        if (res?.task) {
          const serverMapped = mapDbTask(res.task);
          await taskHistoryService.updateTaskInHistory(localId, serverMapped, userId);
          return serverMapped;
        }
      } catch (err: any) {
        const status = err?.response?.status || err?.status;
        if (status === 402 || err?.response?.data?.reason === 'free_limit_reached') {
          throw err;
        }
      }
    }

    return localTask;
  }

  async update(id: string, task: UpdateTaskInput): Promise<Task> {
    const userId = useAppStore.getState().user?.id;
    const token = useAppStore.getState().token;

    // 1. Update in local storage
    const updates: Partial<Task> = {};
    if (task.title !== undefined) updates.title = task.title;
    if (task.description !== undefined) updates.description = task.description;
    if (task.date || task.targetDate) {
      const d = task.targetDate || task.date;
      updates.date = d?.includes('T') ? d.split('T')[0] : d;
      updates.targetDate = updates.date;
    }
    if (task.time || task.reminderTime) {
      updates.time = task.time || task.reminderTime;
      updates.reminderTime = updates.time;
    }
    if (task.priority !== undefined) updates.priority = task.priority;
    if (task.completed !== undefined) updates.completed = task.completed;
    if (task.confirmationStatus !== undefined) updates.confirmationStatus = task.confirmationStatus;

    await taskHistoryService.updateTaskInHistory(id, updates, userId);

    // 2. Sync to cloud if authenticated
    if (token) {
      try {
        const payload: any = {};
        if (task.title !== undefined) payload.title = task.title;
        if (task.description !== undefined) payload.description = task.description;
        if (updates.date) payload.task_date = updates.date;
        if (updates.time) payload.task_time = updates.time;
        if (task.priority !== undefined) {
          const pStr = String(task.priority).toUpperCase();
          payload.priority = pStr === 'URGENT' || pStr === 'HIGH' || pStr === 'ZAROORI' ? 'important' : 'medium';
        }
        if (task.completed !== undefined) payload.status = task.completed ? 'done' : null;
        if (task.confirmationStatus !== undefined) {
          payload.status = task.confirmationStatus === 'COMPLETED' ? 'done' : task.confirmationStatus === 'MISSED' ? 'missed' : null;
        }
        const res: any = await apiClient.patch(`/tasks/${id}`, payload);
        if (res?.task) {
          return mapDbTask(res.task);
        }
      } catch (e) {}
    }

    const localList = await taskHistoryService.getLocalHistory(userId);
    return localList.find((t) => t.id === id) || (updates as Task);
  }

  async complete(id: string, completed: boolean = true, status?: 'COMPLETED' | 'MISSED'): Promise<Task> {
    const userId = useAppStore.getState().user?.id;
    const token = useAppStore.getState().token;
    const confirmation = status || (completed ? 'COMPLETED' : 'PENDING');
    const isDone = completed || confirmation === 'COMPLETED';

    // 1. Maintain streak if task completed, or reset to 0 if missed
    if (isDone) {
      useAppStore.getState().incrementStreakToday();
    } else if (confirmation === 'MISSED') {
      useAppStore.getState().resetStreakToday();
    }

    // 2. Update locally immediately
    await taskHistoryService.updateTaskInHistory(id, {
      completed: isDone,
      confirmationStatus: confirmation,
      completedAt: isDone ? new Date().toISOString() : undefined,
    }, userId);

    // 3. Sync to server if authenticated
    if (token) {
      let backendStatus: 'done' | 'missed' | null = isDone ? 'done' : null;
      if (confirmation === 'MISSED') backendStatus = 'missed';
      apiClient.patch(`/tasks/${id}`, { status: backendStatus }).catch(() => {});
    }

    const localList = await taskHistoryService.getLocalHistory(userId);
    return localList.find((t) => t.id === id) || { id, title: '', completed: isDone, confirmationStatus: confirmation } as any;
  }

  async delete(id: string): Promise<void> {
    const userId = useAppStore.getState().user?.id;
    const token = useAppStore.getState().token;

    // Do NOT delete from History! Keep in history and only remove from Today's screen
    await taskHistoryService.markDeletedFromToday(id, userId);

    if (token) {
      apiClient.delete(`/tasks/${id}`).catch(() => {});
    }
  }

  async repeatMonthly(id: string): Promise<{ success: boolean; count: number }> {
    const userId = useAppStore.getState().user?.id;
    const localList = await taskHistoryService.getLocalHistory(userId);
    const task = localList.find((t) => t.id === id);

    if (task) {
      const baseDate = new Date(task.date || new Date());
      for (let i = 1; i <= 29; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(baseDate.getDate() + i);
        const dateStr = nextDate.toISOString().slice(0, 10);
        await taskHistoryService.recordCreatedTask({
          ...task,
          id: `task_${Date.now()}_rep_${i}`,
          date: dateStr,
          targetDate: dateStr,
          createdAt: new Date().toISOString(),
        }, userId);
      }
    }

    const token = useAppStore.getState().token;
    if (token) {
      apiClient.post(`/tasks/${id}/repeat-monthly`).catch(() => {});
    }

    return { success: true, count: 29 };
  }
}

export class RemoteProgressRepository implements ProgressRepository {
  async getProgress(): Promise<ProgressSummary> {
    const userId = useAppStore.getState().user?.id;
    const token = useAppStore.getState().token;
    const localTasks = await taskHistoryService.getLocalHistory(userId);

    const total = localTasks.length;
    const done = localTasks.filter((t) => t.completed || t.confirmationStatus === 'COMPLETED').length;
    const currentStreak = Math.max(useAppStore.getState().streak || 1, done > 0 ? 1 : 0);
    const bestStreak = Math.max(currentStreak, useAppStore.getState().bestStreak || currentStreak);
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    const daysLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const currentDayIdx = (new Date().getDay() + 6) % 7; // Monday = 0
    const weeklyDays = daysLabels.map((day, idx) => ({
      day,
      completed: done > 0 && idx <= currentDayIdx ? Math.min(done, 1) : 0,
      total: Math.max(1, total),
      active: idx <= currentDayIdx,
    }));

    if (token) {
      try {
        const res: any = await apiClient.get('/tasks/stats/progress');
        if (res && typeof res === 'object') {
          const sTotal = Number(res?.total ?? total);
          const sDone = Number(res?.done ?? done);
          const sStreak = Number(res?.streakDays ?? currentStreak);
          return {
            streak: Math.max(currentStreak, sStreak),
            bestStreak: Math.max(bestStreak, Number(res?.bestStreak ?? bestStreak)),
            completionRate: sTotal > 0 ? Math.round((sDone / sTotal) * 100) : completionRate,
            completedTasks: sDone,
            totalCompleted: sDone,
            pendingTasks: Math.max(0, sTotal - sDone),
            importantTasks: 0,
            bestDay: sDone > 0 ? 'Today' : '-',
            weekDays: Array.isArray(res?.weeklyDays) && res.weeklyDays.length > 0 ? res.weeklyDays : weeklyDays,
          };
        }
      } catch (e) {}
    }

    return {
      streak: currentStreak,
      bestStreak,
      completionRate,
      completedTasks: done,
      totalCompleted: done,
      pendingTasks: Math.max(0, total - done),
      importantTasks: 0,
      bestDay: done > 0 ? 'Today' : '-',
      weekDays: weeklyDays,
    };
  }

  async getToday(): Promise<{ totalTasks: number; completedTasks: number; completionPercentage: number }> {
    const userId = useAppStore.getState().user?.id;
    const localTasks = await taskHistoryService.getLocalHistory(userId);
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayTasks = localTasks.filter((t) => {
      const taskDate = t.targetDate || t.date;
      return !taskDate || taskDate === todayIso;
    });

    const totalTasks = todayTasks.length;
    const completedTasks = todayTasks.filter((t) => t.completed || t.confirmationStatus === 'COMPLETED').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
    };
  }

  async getStreak(): Promise<{ streak: number; consistencyDays: number }> {
    const streak = useAppStore.getState().streak || 1;
    return {
      streak,
      consistencyDays: streak,
    };
  }
}

export class RemoteUserRepository implements UserRepository {
  async getMe(): Promise<User> {
    const token = useAppStore.getState().token;
    const lang = useAppStore.getState().language || 'hi';

    if (token) {
      try {
        const res: any = await apiClient.get('/auth/me');
        const u = res?.user || res?.data || res;
        if (u) {
          const isPremium = Boolean(res?.isPremium || res?.subscription?.status === 'active' || u?.isPremium);
          useAppStore.getState().setIsPremium(isPremium);
          const userObj: User = {
            id: String(u.id || 'user_1'),
            name: u.name || 'User',
            email: u.email || '',
            language: u.language || lang,
          };
          useAppStore.getState().setUser(userObj);
          return userObj;
        }
      } catch (e) {
        // Handled silently
      }
    }

    const cached = useAppStore.getState().user;
    return cached || {
      id: '',
      name: '',
      email: '',
      language: lang,
    };
  }

  async updateLanguage(language: string): Promise<void> {
    const token = useAppStore.getState().token;
    if (token) {
      await apiClient.patch('/auth/language', { language }).catch(() => {});
    }
  }

  async updateProfile(name: string, email: string): Promise<User> {
    const token = useAppStore.getState().token;
    const lang = useAppStore.getState().language || 'hi';

    if (token) {
      try {
        const res: any = await apiClient.patch('/auth/profile', { name, email });
        const u = res?.user || res?.data || res;
        return {
          id: String(u.id || 'user_1'),
          name: u.name || name,
          email: u.email || email,
          language: u.language || lang,
        };
      } catch (e) {}
    }

    const updatedUser: User = {
      id: useAppStore.getState().user?.id || 'local_user',
      name,
      email,
      language: lang,
    };
    useAppStore.getState().setUser(updatedUser);
    return updatedUser;
  }

  async deleteAccount(): Promise<void> {
    const token = useAppStore.getState().token;
    if (token) {
      try {
        await apiClient.delete('/auth/delete-account');
      } catch (err) {
        // Fallback to POST if server / reverse proxy intercepts DELETE
        await apiClient.post('/auth/delete-account', {});
      }
    }
  }
}

export class RemoteSubscriptionRepository implements SubscriptionRepository {
  async getStatus(): Promise<Subscription & { dailyUsed?: number; dailyLimit?: number; expired?: boolean }> {
    const isPrem = useAppStore.getState().isPremium;
    const { used } = useAppStore.getState().getFreeUsage();
    const token = useAppStore.getState().token;

    if (token) {
      try {
        const res: any = await apiClient.get('/subscription/status');
        if (res && typeof res === 'object') {
          const isPremium = res?.status === 'active' || res?.isPremium === true;
          useAppStore.getState().setIsPremium(isPremium);
          const dailyUsed = typeof res?.dailyUsed === 'number' ? res.dailyUsed : used;
          useAppStore.getState().setFreeLifetimeCreated(dailyUsed);
          return {
            id: 'sub_001',
            plan: isPremium ? 'PREMIUM' : 'FREE',
            status: isPremium ? 'active' : (res?.status || 'trial'),
            price: Number(res?.planPrice ?? 399),
            currency: res?.currency || 'INR',
            startedAt: new Date().toISOString(),
            expiresAt: res?.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
            dailyUsed,
            dailyLimit: res?.dailyLimit ?? 3,
            expired: Boolean(res?.expired),
          };
        }
      } catch (e) {}
    }

    return {
      id: 'sub_001',
      plan: isPrem ? 'PREMIUM' : 'FREE',
      status: isPrem ? 'active' : 'trial',
      price: 399,
      currency: 'INR',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      dailyUsed: used,
      dailyLimit: 3,
      expired: false,
    };
  }

  async subscribe(plan: string): Promise<Subscription> {
    const token = useAppStore.getState().token;
    if (token) {
      try {
        const res: any = await apiClient.post('/subscription/subscribe', { payment_provider: plan || 'manual' });
        const sub = res?.subscription || res?.data || res;
        useAppStore.getState().setIsPremium(true);
        return {
          id: String(sub?.id || 'sub_premium_001'),
          plan: 'PREMIUM',
          status: 'active',
          price: Number(sub?.plan_price ?? 399),
          currency: sub?.currency || 'INR',
          startedAt: sub?.current_period_start || new Date().toISOString(),
          expiresAt: sub?.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
        };
      } catch (e) {}
    }

    useAppStore.getState().setIsPremium(true);
    return {
      id: 'sub_premium_001',
      plan: 'PREMIUM',
      status: 'active',
      price: 399,
      currency: 'INR',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
  }

  async cancel(): Promise<Subscription> {
    const token = useAppStore.getState().token;
    if (token) {
      try {
        const res: any = await apiClient.post('/subscription/cancel');
        const sub = res?.subscription || res?.data || res;
        return {
          id: String(sub?.id || 'sub_free_001'),
          plan: 'FREE',
          status: 'cancelled',
          price: 0,
          currency: 'INR',
          expiresAt: sub?.current_period_end || new Date().toISOString(),
        };
      } catch (e) {}
    }

    return {
      id: 'sub_free_001',
      plan: 'FREE',
      status: 'cancelled',
      price: 0,
      currency: 'INR',
      expiresAt: new Date().toISOString(),
    };
  }
}
