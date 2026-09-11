import { ProgressSummary } from '../../types';
import { ProgressRepository } from '../repository.interface';

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export class MockProgressRepository implements ProgressRepository {
  async getProgress(): Promise<ProgressSummary> {
    await delay();
    return {
      streak: 0,
      bestStreak: 0,
      completionRate: 0,
      completedTasks: 0,
      totalCompleted: 0,
      pendingTasks: 0,
      importantTasks: 0,
      bestDay: '-',
      weekDays: [
        { day: 'M', completed: 0, total: 0, active: true },
        { day: 'T', completed: 0, total: 0, active: true },
        { day: 'W', completed: 0, total: 0, active: true },
        { day: 'T', completed: 0, total: 0, active: true },
        { day: 'F', completed: 0, total: 0, active: true },
        { day: 'S', completed: 0, total: 0, active: true },
        { day: 'S', completed: 0, total: 0, active: true },
      ],
    };
  }

  async getToday(): Promise<{ totalTasks: number; completedTasks: number; completionPercentage: number }> {
    await delay();
    return {
      totalTasks: 0,
      completedTasks: 0,
      completionPercentage: 0,
    };
  }

  async getStreak(): Promise<{ streak: number; consistencyDays: number }> {
    await delay();
    return {
      streak: 0,
      consistencyDays: 0,
    };
  }
}
