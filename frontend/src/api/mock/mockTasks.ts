import { Task, CreateTaskInput, UpdateTaskInput } from '../../types';
import { TasksRepository } from '../repository.interface';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

let tasksDatabase: Task[] = [
  {
    id: 'task_001',
    title: 'Client ko report bhejna',
    description: 'Report client ko mail karni hai.',
    date: todayStr(),
    time: '6:00 PM',
    priority: 'URGENT',
    completed: false,
    reminderMinutes: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task_002',
    title: 'Team meeting',
    description: 'Weekly sprint review on Google Meet.',
    date: todayStr(),
    time: '10:30 AM',
    priority: 'MEDIUM',
    completed: true,
    completedAt: new Date().toISOString(),
    reminderMinutes: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task_003',
    title: 'Invoice check karna',
    description: 'Vendor invoice cross verification with accounting.',
    date: todayStr(),
    time: '4:00 PM',
    priority: 'NORMAL',
    completed: false,
    reminderMinutes: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task_004',
    title: 'Presentation prepare karna',
    description: 'Product roadmap slide deck.',
    date: todayStr(),
    time: '11:00 AM',
    priority: 'URGENT',
    completed: false,
    reminderMinutes: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task_005',
    title: 'Client follow-up',
    description: 'Check in with Rohit regarding feedback.',
    date: todayStr(),
    time: '3:00 PM',
    priority: 'MEDIUM',
    completed: true,
    completedAt: new Date().toISOString(),
    reminderMinutes: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export class MockTasksRepository implements TasksRepository {
  async getToday(): Promise<Task[]> {
    await delay();
    return [...tasksDatabase];
  }

  async getAll(): Promise<Task[]> {
    await delay();
    return [...tasksDatabase];
  }

  async getById(id: string): Promise<Task> {
    await delay();
    const task = tasksDatabase.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    return { ...task };
  }

  async create(input: CreateTaskInput): Promise<Task> {
    await delay();
    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: input.title,
      description: input.description || (input as any).notes || '',
      date: input.date || todayStr(),
      time: input.time || '10:00 AM',
      priority: input.priority || 'NORMAL',
      completed: false,
      reminderMinutes: input.reminderMinutes || 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasksDatabase.unshift(newTask);

    if (input.repeatMonthly) {
      const baseDate = new Date(newTask.date || todayStr());
      for (let i = 1; i <= 29; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(baseDate.getDate() + i);
        const dateStr = nextDate.toISOString().slice(0, 10);
        tasksDatabase.push({
          ...newTask,
          id: `task_${Date.now()}_rep_${i}`,
          date: dateStr,
          targetDate: dateStr,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return newTask;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    await delay();
    const index = tasksDatabase.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Task not found');
    const updated = {
      ...tasksDatabase[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    tasksDatabase[index] = updated;
    return updated;
  }

  async complete(id: string, completed?: boolean, status?: 'COMPLETED' | 'MISSED'): Promise<Task> {
    await delay();
    const index = tasksDatabase.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Task not found');
    const wasCompleted = tasksDatabase[index].completed;
    const isDone = completed !== undefined ? completed : !wasCompleted;
    tasksDatabase[index].completed = isDone;
    tasksDatabase[index].confirmationStatus = status !== undefined ? status : (isDone ? 'COMPLETED' : 'PENDING');
    tasksDatabase[index].completedAt = isDone ? new Date().toISOString() : undefined;
    tasksDatabase[index].updatedAt = new Date().toISOString();
    return tasksDatabase[index];
  }

  async delete(id: string): Promise<void> {
    await delay();
    tasksDatabase = tasksDatabase.filter((t) => t.id !== id);
  }

  async repeatMonthly(id: string): Promise<{ success: boolean; count: number; tasks: Task[] }> {
    await delay();
    const source = tasksDatabase.find((t) => t.id === id);
    if (!source) throw new Error('Task not found');
    const baseDate = new Date(source.targetDate || source.date || todayStr());
    const created: Task[] = [];
    for (let i = 1; i <= 30; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(baseDate.getDate() + i);
      const dateStr = nextDate.toISOString().slice(0, 10);
      const newTask: Task = {
        ...source,
        id: `mock-rep-${Date.now()}-${i}`,
        date: dateStr,
        targetDate: dateStr,
        completed: false,
        confirmationStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tasksDatabase.push(newTask);
      created.push(newTask);
    }
    return { success: true, count: created.length, tasks: created };
  }
}
