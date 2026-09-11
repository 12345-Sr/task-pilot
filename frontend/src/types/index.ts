export type Priority =
  | 'ZAROORI'
  | 'MEDIUM'
  | 'NORMAL'
  | 'URGENT'
  | 'high'
  | 'medium'
  | 'low';

export type SupportedLanguage =
  | 'hi'
  | 'en'
  | 'mr'
  | 'bn'
  | 'ta'
  | 'te'
  | 'gu'
  | 'pa';

export type TaskStatus = 'PENDING' | 'COMPLETED' | 'MISSED' | 'OVERDUE';

export interface Task {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  notes?: string;
  date?: string;
  targetDate?: string;
  time?: string;
  deadlineTime?: string;
  reminderTime?: string;
  priority: Priority;
  completed: boolean;
  confirmationStatus?: 'PENDING' | 'COMPLETED' | 'MISSED'; // ✓ / ✗
  morningAlertSent?: boolean;
  twoHourAlertSent?: boolean;
  oneHourAlertSent?: boolean;
  completedAt?: string;
  reminderMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  notes?: string;
  date?: string;
  targetDate?: string;
  time?: string;
  deadlineTime?: string;
  reminderTime?: string;
  priority: Priority;
  reminderMinutes?: number;
  repeatMonthly?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  notes?: string;
  date?: string;
  targetDate?: string;
  time?: string;
  deadlineTime?: string;
  reminderTime?: string;
  priority?: Priority;
  completed?: boolean;
  confirmationStatus?: 'PENDING' | 'COMPLETED' | 'MISSED';
  reminderMinutes?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  language: string;
  pushToken?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  plan: 'FREE' | 'PREMIUM';
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  price: number;
  currency: string;
  startedAt?: string;
  expiresAt?: string;
}

export interface DailyProgress {
  date: string;
  totalTasks: number;
  completedTasks: number;
  missedTasks?: number;
  completionPercentage: number;
  streak: number;
}

export interface ProgressSummary {
  streak: number;
  bestStreak?: number;
  completionRate: number;
  completedTasks: number;
  totalCompleted?: number;
  pendingTasks: number;
  importantTasks: number;
  bestDay: string;
  weekDays: Array<{
    day: string;
    completed: number;
    total: number;
    active?: boolean;
  }>;
  weeklyDays?: Array<{
    day: string;
    completed: number;
    total: number;
    active?: boolean;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
