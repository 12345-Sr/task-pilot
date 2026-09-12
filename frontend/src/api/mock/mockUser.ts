import { User, Subscription } from '../../types';
import { UserRepository, SubscriptionRepository } from '../repository.interface';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

let currentUser: User = {
  id: 'user_rohan_001',
  name: 'Rohan Sharma',
  email: 'rohan@example.com',
  language: 'hi',
  createdAt: new Date().toISOString(),
};

let currentSubscription: Subscription = {
  id: 'sub_trial_001',
  plan: 'FREE',
  status: 'trial',
  price: 399,
  currency: 'INR',
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
};

export class MockUserRepository implements UserRepository {
  async getMe(): Promise<User> {
    await delay();
    return { ...currentUser };
  }

  async updateLanguage(language: string): Promise<void> {
    await delay();
    currentUser.language = language;
  }

  async updateProfile(name: string, email: string): Promise<User> {
    await delay();
    currentUser = { ...currentUser, name, email };
    return { ...currentUser };
  }
}

export class MockSubscriptionRepository implements SubscriptionRepository {
  async getStatus(): Promise<Subscription> {
    await delay();
    return { ...currentSubscription };
  }

  async subscribe(plan: string): Promise<Subscription> {
    await delay();
    currentSubscription = {
      ...currentSubscription,
      plan: 'PREMIUM',
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    return { ...currentSubscription };
  }

  async cancel(): Promise<Subscription> {
    await delay();
    currentSubscription = {
      ...currentSubscription,
      status: 'cancelled',
    };
    return { ...currentSubscription };
  }
}
