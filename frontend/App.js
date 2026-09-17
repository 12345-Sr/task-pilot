import React, { useEffect } from 'react';
import { Platform, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import notifee, { EventType, TriggerType, AlarmType, AndroidCategory, AndroidImportance } from '@notifee/react-native';
import { queryClient } from './src/hooks';
import RootNavigator from './src/navigation/RootNavigator';
import { NotificationService } from './src/services/notifications/notification.service';

if (Platform.OS !== 'web' && LogBox && typeof LogBox.ignoreLogs === 'function') {
  LogBox.ignoreLogs([
    '[expo-notifications]',
    'expo-notifications functionality is not fully supported in Expo Go',
    'The method or property ServerRegistrationModule',
    'ServerRegistrationModule.getRegistrationInfoAsync',
    'Cannot connect to Expo CLI',
  ]);
}

export default function App() {
  useEffect(() => {
    NotificationService.init().catch(() => {});

    // Listen for alarm action presses while app is in foreground
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;
      if (type === EventType.ACTION_PRESS) {
        if (pressAction?.id === 'complete_task') {
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
        } else if (pressAction?.id === 'snooze_task') {
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
          const taskId = notification?.data?.taskId || Date.now();
          const taskTitle = notification?.data?.taskTitle || 'Task';
          await notifee.createTriggerNotification(
            {
              id: `alarm_${taskId}`,
              title: `⏰ Snoozed: ${taskTitle}`,
              body: `Aapka kaam "${taskTitle}" abhi complete karne ka samay hai!`,
              android: {
                channelId: 'task-alarms-v2',
                category: AndroidCategory.ALARM,
                importance: AndroidImportance.HIGH,
                sound: 'default',
                loopSound: true,
                ongoing: true,
                pressAction: { id: 'default', launchActivity: 'default' },
                fullScreenAction: { id: 'default', launchActivity: 'default' },
                actions: [
                  { title: '✅ Poora Ho Gaya', pressAction: { id: 'complete_task' } },
                  { title: '⏳ 5 Min Baad', pressAction: { id: 'snooze_task' } },
                ],
              },
              data: notification?.data,
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp: Date.now() + 5 * 60 * 1000,
              alarmManager: { type: AlarmType.SET_ALARM_CLOCK },
            }
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" backgroundColor="#EDF2F4" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
