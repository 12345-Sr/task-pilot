import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  User,
  Subscription,
  ProgressSummary,
} from '../types';

export interface TasksRepository {
  getToday(): Promise<Task[]>;
  getAll(): Promise<Task[]>;
  getById(id: string): Promise<Task>;
  create(task: CreateTaskInput): Promise<Task>;
  update(id: string, task: UpdateTaskInput): Promise<Task>;
  complete(id: string, completed?: boolean, status?: 'COMPLETED' | 'MISSED'): Promise<Task>;
  delete(id: string): Promise<void>;
  repeatMonthly(id: string): Promise<{ success: boolean; count: number; tasks?: Task[] }>;
}

export interface ProgressRepository {
  getProgress(): Promise<ProgressSummary>;
  getToday(): Promise<{ totalTasks: number; completedTasks: number; completionPercentage: number }>;
  getStreak(): Promise<{ streak: number; consistencyDays: number }>;
}

export interface UserRepository {
  getMe(): Promise<User>;
  updateLanguage(language: string): Promise<void>;
  updateProfile(name: string, email: string): Promise<User>;
}

export interface SubscriptionRepository {
  getStatus(): Promise<Subscription>;
  subscribe(plan: string): Promise<Subscription>;
  cancel(): Promise<Subscription>;
}
