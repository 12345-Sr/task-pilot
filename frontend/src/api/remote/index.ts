import { apiClient } from '../client';
import { MockTasksRepository } from '../mock/mockTasks';
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

const fallbackTasks = new MockTasksRepository();

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

function mapDbTask(t: any): Task {
  if (!t) return {} as Task;
  const idStr = String(t.id || '');
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
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export class RemoteTasksRepository implements TasksRepository {
  async getToday(): Promise<Task[]> {
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const res: any = await apiClient.get(`/tasks?date=${today}`);
      const list = res?.tasks ?? res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map(mapDbTask);
      }
      return [];
    } catch (err: any) {
      return fallbackTasks.getToday();
    }
  }

  async getAll(): Promise<Task[]> {
    try {
      const res: any = await apiClient.get('/tasks');
      const list = res?.tasks ?? res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return list.map(mapDbTask);
      }
      return [];
    } catch (err: any) {
      return fallbackTasks.getAll();
    }
  }

  async getById(id: string): Promise<Task> {
    try {
      const res: any = await apiClient.get(`/tasks/${id}`);
      return mapDbTask(res?.task || res?.data || res);
    } catch (err) {
      return fallbackTasks.getById(id);
    }
  }

  async create(task: CreateTaskInput): Promise<Task> {
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
    const task_time = task.time || task.reminderTime || '10:00:00';
    const pStr = String(task.priority || '').toUpperCase();
    const isImportant =
      pStr === 'URGENT' ||
      pStr === 'HIGH' ||
      pStr === 'ZAROORI' ||
      pStr === 'IMPORTANT';
    const priority = isImportant ? 'important' : 'medium';

    const descValue = task.description || (task as any).notes || '';
    if (descValue && task.title) {
      useAppStore.getState().setTaskDescription(`${task.title.trim()}_${task_date}`, descValue);
      useAppStore.getState().setTaskDescription(task.title.trim(), descValue);
    }

    const payload = {
      title: task.title,
      description: descValue,
      notes: descValue,
      task_date,
      task_time,
      priority,
      repeat_monthly: task.repeatMonthly,
    };

    try {
      const res: any = await apiClient.post('/tasks', payload);
      const created = mapDbTask(res?.task || res?.data || res);
      // Ensure description is preserved even if the cloud API response omitted the field
      if (descValue) {
        created.description = descValue;
        if (created.id) {
          useAppStore.getState().setTaskDescription(String(created.id), descValue);
        }
      }
      // Sync local offline cache in parallel
      fallbackTasks.create({ ...task, date: task_date, targetDate: task_date, description: descValue }).catch(() => {});
      return created;
    } catch (err: any) {
      console.warn('[TASKS] API create fallback to local:', err?.message || err);
      const fallback = await fallbackTasks.create({ ...task, date: task_date, targetDate: task_date, description: descValue });
      if (fallback?.id && descValue) {
        useAppStore.getState().setTaskDescription(String(fallback.id), descValue);
      }
      return fallback;
    }
  }

  async update(id: string, task: UpdateTaskInput): Promise<Task> {
    const payload: any = {};
    if (task.title !== undefined) payload.title = task.title;
    if (task.description !== undefined || (task as any).notes !== undefined) {
      const dVal = task.description !== undefined ? task.description : (task as any).notes;
      payload.description = dVal;
      payload.notes = dVal;
    }
    if (task.date || task.targetDate) {
      const d = task.targetDate || task.date;
      payload.task_date = d?.includes('T') ? d.split('T')[0] : d;
    }
    if (task.time || task.reminderTime) {
      payload.task_time = task.time || task.reminderTime;
    }
    if (task.priority !== undefined) {
      const pStr = String(task.priority || '').toUpperCase();
      const isImportant =
        pStr === 'URGENT' ||
        pStr === 'HIGH' ||
        pStr === 'ZAROORI' ||
        pStr === 'IMPORTANT';
      payload.priority = isImportant ? 'important' : 'medium';
    }
    if (task.completed !== undefined) {
      payload.status = task.completed ? 'done' : null;
    }
    if (task.confirmationStatus !== undefined) {
      payload.status =
        task.confirmationStatus === 'COMPLETED'
          ? 'done'
          : task.confirmationStatus === 'MISSED'
          ? 'missed'
          : null;
    }

    const res: any = await apiClient.patch(`/tasks/${id}`, payload);
    return mapDbTask(res?.task || res?.data || res);
  }

  async complete(id: string, completed: boolean = true, status?: 'COMPLETED' | 'MISSED'): Promise<Task> {
    let backendStatus: 'done' | 'missed' | null = completed ? 'done' : null;
    if (status === 'COMPLETED') backendStatus = 'done';
    if (status === 'MISSED') backendStatus = 'missed';

    const res: any = await apiClient.patch(`/tasks/${id}`, { status: backendStatus });
    return mapDbTask(res?.task || res?.data || res);
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  }

  async repeatMonthly(id: string): Promise<{ success: boolean; count: number }> {
    try {
      const res: any = await apiClient.post(`/tasks/${id}/repeat-monthly`);
      return res;
    } catch (err: any) {
      console.warn('[TASKS] repeatMonthly API error, falling back to local simulation:', err?.message || err);
      return fallbackTasks.repeatMonthly(id);
    }
  }
}

export class RemoteProgressRepository implements ProgressRepository {
  async getProgress(): Promise<ProgressSummary> {
    const res: any = await apiClient.get('/tasks/stats/progress').catch(() => ({}));
    const total = Number(res?.total ?? 0);
    const done = Number(res?.done ?? 0);
    const streak = Number(res?.streakDays ?? 0);
    const bestStreak = Number(res?.bestStreak ?? streak);
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const weeklyDays = Array.isArray(res?.weeklyDays) && res.weeklyDays.length > 0
      ? res.weeklyDays
      : [
          { day: 'M', completed: 0, total: 0, active: true },
          { day: 'T', completed: 0, total: 0, active: true },
          { day: 'W', completed: 0, total: 0, active: true },
          { day: 'T', completed: 0, total: 0, active: true },
          { day: 'F', completed: 0, total: 0, active: true },
          { day: 'S', completed: 0, total: 0, active: true },
          { day: 'S', completed: 0, total: 0, active: true },
        ];

    return {
      streak,
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
    const today = new Date().toISOString().split('T')[0];
    const res: any = await apiClient.get(`/tasks?date=${today}`).catch(() => ({ tasks: [] }));
    const tasks: any[] = res?.tasks || res?.data || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
    };
  }

  async getStreak(): Promise<{ streak: number; consistencyDays: number }> {
    const res: any = await apiClient.get('/tasks/stats/progress').catch(() => ({}));
    const streak = Number(res?.streakDays ?? 0);
    return {
      streak,
      consistencyDays: streak,
    };
  }
}

export class RemoteUserRepository implements UserRepository {
  async getMe(): Promise<User> {
    const res: any = await apiClient.get('/auth/me');
    const u = res?.user || res?.data || res;
    const isPremium = Boolean(res?.isPremium || res?.subscription?.status === 'active' || u?.isPremium);
    useAppStore.getState().setIsPremium(isPremium);
    return {
      id: String(u.id || 'user_1'),
      name: u.name || 'User',
      email: u.email || 'user@example.com',
      language: u.language || 'hi',
    };
  }

  async updateLanguage(language: string): Promise<void> {
    await apiClient.patch('/auth/language', { language }).catch(() => {});
  }

  async updateProfile(name: string, email: string): Promise<User> {
    const res: any = await apiClient.patch('/auth/profile', { name, email }).catch(() => ({
      user: { name, email },
    }));
    const u = res?.user || res?.data || res;
    return {
      id: String(u.id || 'user_1'),
      name: u.name || name,
      email: u.email || email,
      language: u.language || 'hi',
    };
  }
}

export class RemoteSubscriptionRepository implements SubscriptionRepository {
  async getStatus(): Promise<Subscription> {
    const res: any = await apiClient.get('/subscription/status').catch(() => ({}));
    const isPremium = res?.status === 'active' || res?.isPremium === true;
    useAppStore.getState().setIsPremium(isPremium);
    return {
      id: 'sub_001',
      plan: isPremium ? 'PREMIUM' : 'FREE',
      status: isPremium ? 'active' : (res?.status || 'trial'),
      price: Number(res?.planPrice ?? 399),
      currency: res?.currency || 'INR',
      startedAt: new Date().toISOString(),
      expiresAt: res?.currentPeriodEnd || new Date(Date.now() + 30 * 86400000).toISOString(),
    };
  }

  async subscribe(plan: string): Promise<Subscription> {
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
  }

  async cancel(): Promise<Subscription> {
    const res: any = await apiClient.post('/subscription/cancel').catch(() => ({}));
    const sub = res?.subscription || res?.data || res;
    return {
      id: String(sub?.id || 'sub_free_001'),
      plan: 'FREE',
      status: 'cancelled',
      price: 0,
      currency: 'INR',
      expiresAt: sub?.current_period_end || new Date().toISOString(),
    };
  }
}
