import {
  RemoteTasksRepository,
  RemoteProgressRepository,
  RemoteUserRepository,
  RemoteSubscriptionRepository,
} from './remote';

export const tasksRepository = new RemoteTasksRepository();
export const progressRepository = new RemoteProgressRepository();
export const userRepository = new RemoteUserRepository();
export const subscriptionRepository = new RemoteSubscriptionRepository();

export * from './client';
export * from './repository.interface';
