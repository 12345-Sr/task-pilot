import { USE_MOCK_API } from './client';
import {
  TasksRepository,
  ProgressRepository,
  UserRepository,
  SubscriptionRepository,
} from './repository.interface';
import { MockTasksRepository } from './mock/mockTasks';
import { MockProgressRepository } from './mock/mockProgress';
import { MockUserRepository, MockSubscriptionRepository } from './mock/mockUser';
import {
  RemoteTasksRepository,
  RemoteProgressRepository,
  RemoteUserRepository,
  RemoteSubscriptionRepository,
} from './remote';

export const tasksRepository: TasksRepository = USE_MOCK_API
  ? new MockTasksRepository()
  : new RemoteTasksRepository();

export const progressRepository: ProgressRepository = USE_MOCK_API
  ? new MockProgressRepository()
  : new RemoteProgressRepository();

export const userRepository: UserRepository = USE_MOCK_API
  ? new MockUserRepository()
  : new RemoteUserRepository();

export const subscriptionRepository: SubscriptionRepository = USE_MOCK_API
  ? new MockSubscriptionRepository()
  : new RemoteSubscriptionRepository();

export * from './client';
export * from './repository.interface';
