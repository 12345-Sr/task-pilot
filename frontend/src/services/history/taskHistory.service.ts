import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../../types';
import { apiClient } from '../../api/client';

export interface TaskHistoryItem extends Task {
  createdAtTimestamp?: number;
  completedAtTimestamp?: number;
  isDeleted?: boolean;
  repeatMonthly?: boolean;
}

export interface TaskHistoryStats {
  totalCreated: number;
  totalCompleted: number;
  totalMissed: number;
  activeTasks: number;
  importantTasks: number;
  completionRate: number;
}

const STORAGE_PREFIX = '@task_pilot_created_history_';

class TaskHistoryService {
  private inMemoryCache: Record<string, TaskHistoryItem[]> = {};

  private getKey(userId?: string): string {
    return `${STORAGE_PREFIX}${userId || 'default'}`;
  }

  /**
   * Save or prepend a newly created task directly to local storage AND database
   */
  async recordCreatedTask(task: Task, userId?: string): Promise<TaskHistoryItem[]> {
    try {
      const key = this.getKey(userId);
      const existing = await this.getLocalHistory(userId);

      const now = new Date();
      const createdAtStr = task.createdAt || now.toISOString();
      const createdAtTime = new Date(createdAtStr).getTime() || now.getTime();

      const newItem: TaskHistoryItem = {
        ...task,
        createdAt: createdAtStr,
        createdAtTimestamp: createdAtTime,
      };

      // Deduplicate: if task already in history, replace it; otherwise prepend
      const filtered = existing.filter((t) => t.id !== task.id);
      const updated = [newItem, ...filtered];

      this.inMemoryCache[key] = updated;
      await AsyncStorage.setItem(key, JSON.stringify(updated));

      // Asynchronously store task creation in PostgreSQL database task_history table
      const descVal = task.description || (task as any).notes || '';
      apiClient.post('/tasks/history', {
        taskId: task.id,
        title: task.title,
        description: descVal,
        notes: descVal,
        task_date: task.date || task.targetDate,
        task_time: task.time || task.reminderTime,
        priority: task.priority,
        status: task.completed ? 'done' : (task.confirmationStatus === 'MISSED' ? 'missed' : 'pending'),
        action: 'CREATED',
        created_at: createdAtStr,
      }).catch(() => {
        // Silent fallback: task is already preserved directly in DB via POST /api/tasks
      });

      return updated;
    } catch (err) {
      console.warn('[TASK HISTORY] Failed to record created task:', err);
      return this.inMemoryCache[this.getKey(userId)] || [];
    }
  }

  /**
   * Update an existing task in local history (e.g. marked completed, missed, edited)
   */
  async updateTaskInHistory(
    taskId: string,
    updates: Partial<TaskHistoryItem>,
    userId?: string
  ): Promise<TaskHistoryItem[]> {
    try {
      const key = this.getKey(userId);
      const existing = await this.getLocalHistory(userId);

      const updated = existing.map((item) => {
        if (item.id === taskId) {
          const isNowCompleted = updates.completed === true || updates.confirmationStatus === 'COMPLETED';
          return {
            ...item,
            ...updates,
            completedAt: isNowCompleted ? (updates.completedAt || new Date().toISOString()) : item.completedAt,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });

      this.inMemoryCache[key] = updated;
      await AsyncStorage.setItem(key, JSON.stringify(updated));

      // Persist status or details change to DB task_history table
      const isDone = updates.completed === true || updates.confirmationStatus === 'COMPLETED';
      const isMissed = updates.confirmationStatus === 'MISSED';
      const statusStr = isDone ? 'done' : isMissed ? 'missed' : updates.completed === false ? 'pending' : undefined;
      const dVal = updates.description || (updates as any)?.notes;

      apiClient.post('/tasks/history', {
        taskId,
        title: updates.title,
        description: dVal,
        notes: dVal,
        task_date: updates.date || updates.targetDate,
        task_time: updates.time || updates.reminderTime,
        priority: updates.priority,
        status: statusStr,
        action: isDone ? 'COMPLETED' : isMissed ? 'MISSED' : 'UPDATED',
      }).catch(() => {});

      return updated;
    } catch (err) {
      console.warn('[TASK HISTORY] Failed to update task in history:', err);
      return this.inMemoryCache[this.getKey(userId)] || [];
    }
  }

  /**
   * Retrieve all locally saved created tasks from AsyncStorage
   */
  async getLocalHistory(userId?: string): Promise<TaskHistoryItem[]> {
    const key = this.getKey(userId);
    if (this.inMemoryCache[key]) {
      return this.inMemoryCache[key];
    }

    try {
      const json = await AsyncStorage.getItem(key);
      if (json) {
        const parsed: TaskHistoryItem[] = JSON.parse(json);
        if (Array.isArray(parsed)) {
          // Sort descending by created timestamp
          parsed.sort((a, b) => {
            const timeA = a.createdAtTimestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAtTimestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          });
          this.inMemoryCache[key] = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[TASK HISTORY] Failed to read history from AsyncStorage:', err);
    }
    return [];
  }

  /**
   * Merge server history tasks into local storage, preserving locally created items
   */
  async syncWithServer(serverTasks: Task[], userId?: string): Promise<TaskHistoryItem[]> {
    try {
      const key = this.getKey(userId);
      const local = await this.getLocalHistory(userId);

      const map = new Map<string, TaskHistoryItem>();

      // Populate with local items first
      local.forEach((item) => {
        if (item.id) map.set(item.id, item);
      });

      // Merge / update with server items
      serverTasks.forEach((sTask) => {
        const existing = map.get(sTask.id);
        const createdAtStr = sTask.createdAt || existing?.createdAt || new Date().toISOString();
        const createdAtTime = new Date(createdAtStr).getTime();

        const merged: TaskHistoryItem = {
          ...(existing || {}),
          ...sTask,
          createdAt: createdAtStr,
          createdAtTimestamp: createdAtTime,
          completed: sTask.completed ?? existing?.completed ?? false,
          confirmationStatus: sTask.confirmationStatus || existing?.confirmationStatus,
        };
        map.set(sTask.id, merged);
      });

      const mergedList = Array.from(map.values());
      mergedList.sort((a, b) => {
        const timeA = a.createdAtTimestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAtTimestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      this.inMemoryCache[key] = mergedList;
      await AsyncStorage.setItem(key, JSON.stringify(mergedList));
      return mergedList;
    } catch (err) {
      console.warn('[TASK HISTORY] Failed to sync with server:', err);
      return this.getLocalHistory(userId);
    }
  }

  /**
   * Compute stats over a given list of task history items
   */
  computeStats(tasks: TaskHistoryItem[]): TaskHistoryStats {
    const totalCreated = tasks.length;
    let totalCompleted = 0;
    let totalMissed = 0;
    let activeTasks = 0;
    let importantTasks = 0;

    tasks.forEach((t) => {
      const isDone = t.completed === true || t.confirmationStatus === 'COMPLETED';
      const isMissed = t.confirmationStatus === 'MISSED';
      const pStr = String(t.priority || '').toUpperCase();
      const isImp = pStr === 'URGENT' || pStr === 'ZAROORI' || pStr === 'HIGH' || pStr === 'IMPORTANT';

      if (isImp) importantTasks++;

      if (isDone) {
        totalCompleted++;
      } else if (isMissed) {
        totalMissed++;
      } else {
        activeTasks++;
      }
    });

    const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

    return {
      totalCreated,
      totalCompleted,
      totalMissed,
      activeTasks,
      importantTasks,
      completionRate,
    };
  }

  /**
   * Clear history for a specific user
   */
  async clearHistory(userId?: string): Promise<void> {
    try {
      const key = this.getKey(userId);
      delete this.inMemoryCache[key];
      await AsyncStorage.removeItem(key);
    } catch (e) { }
  }
}

export const taskHistoryService = new TaskHistoryService();
export default taskHistoryService;
