import React, { useEffect } from 'react';
import { Platform, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { queryClient } from './src/hooks';
import RootNavigator from './src/navigation/RootNavigator';
import { NotificationService } from './src/services/notifications/notification.service';
import { useAppStore } from './src/store';
import FullScreenAlarmModal from './src/components/FullScreenAlarmModal';

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
  const { activeAlarm, setActiveAlarm, dismissActiveAlarm } = useAppStore();

  useEffect(() => {
    NotificationService.init().then(() => {
      const state = useAppStore.getState();
      if (state.morningReminderEnabled !== false) {
        NotificationService.scheduleMorningBriefing().catch(() => {});
      }
      if (state.eveningReminderEnabled !== false) {
        NotificationService.scheduleEveningReview().catch(() => {});
      }
    }).catch(() => {});

    // Listen for custom in-app alarm trigger events
    const unsubTrigger = NotificationService.onAlarmTriggered((data) => {
      if (data) {
        setActiveAlarm(data);
      }
    });

    // Check if app was launched from a lock-screen full-screen alarm notification
    try {
      const notifeeMod = require('@notifee/react-native');
      const notifee = notifeeMod.default || notifeeMod;
      if (notifee && typeof notifee.getInitialNotification === 'function') {
        notifee.getInitialNotification().then((initial) => {
          if (initial?.notification?.data?.type === 'EXACT_ALARM') {
            const data = initial.notification.data;
            setActiveAlarm({
              taskId: data.taskId,
              taskTitle: data.taskTitle || initial.notification.title || 'Kaam Ka Waqt Ho Gaya',
              deadlineTime: data.deadlineTime,
              soundId: data.soundId || 'classic_bell',
            });
          }
        }).catch(() => {});
      }
    } catch {}

    // Listen for alarm action presses and delivery events while app is in foreground
    let unsubscribeNotifee = () => {};
    try {
      const notifeeMod = require('@notifee/react-native');
      const notifee = notifeeMod.default || notifeeMod;
      const EventType = notifeeMod.EventType || {};
      const TriggerType = notifeeMod.TriggerType || {};
      const AlarmType = notifeeMod.AlarmType || {};
      const AndroidCategory = notifeeMod.AndroidCategory || {};

      if (notifee && typeof notifee.onForegroundEvent === 'function') {
        unsubscribeNotifee = notifee.onForegroundEvent(async ({ type, detail }) => {
          const { notification, pressAction } = detail;
          const isAlarm = notification?.data?.type === 'EXACT_ALARM';

          // When alarm rings or user taps the heads-up banner, open full-screen alarm immediately
          if (isAlarm && (type === EventType.DELIVERED || type === EventType.PRESS)) {
            const currentSound = notification?.data?.soundId || useAppStore.getState().selectedAlarmSound || 'classic_bell';
            setActiveAlarm({
              taskId: notification?.data?.taskId,
              taskTitle: notification?.data?.taskTitle || notification?.title || 'Kaam Ka Waqt Ho Gaya',
              deadlineTime: notification?.data?.deadlineTime,
              soundId: currentSound,
            });
          }

          if (type === EventType.ACTION_PRESS) {
            if (pressAction?.id === 'complete_task') {
              if (notification?.id) {
                await notifee.cancelNotification(notification.id).catch(() => {});
              }
              dismissActiveAlarm();
            } else if (pressAction?.id === 'snooze_task') {
              if (notification?.id) {
                await notifee.cancelNotification(notification.id).catch(() => {});
              }
              dismissActiveAlarm();
              const taskId = notification?.data?.taskId || Date.now();
              const taskTitle = notification?.data?.taskTitle || 'Task';
              const soundId = notification?.data?.soundId || 'classic_bell';
              const channelId = `task-alarm-${soundId}`;
              await notifee.createTriggerNotification(
                {
                  id: `alarm_${taskId}`,
                  title: `⏰ Snoozed: ${taskTitle}`,
                  body: `Aapka kaam "${taskTitle}" abhi complete karne ka samay hai!`,
                  android: {
                    channelId,
                    category: AndroidCategory.ALARM,
                    importance: notifeeMod.AndroidImportance?.HIGH || 4,
                    sound: soundId,
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
                  type: TriggerType.TIMESTAMP || 0,
                  timestamp: Date.now() + 5 * 60 * 1000,
                  alarmManager: { type: AlarmType.SET_ALARM_CLOCK || 0 },
                }
              ).catch(() => {});
            }
          }
        });
      }
    } catch (e) {
      // Ignored in Expo Go where Notifee native module is not present
    }

    // Also listen for Expo Notifications backup delivery
    const expoNotifSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification?.request?.content?.data;
      if (data?.type === 'EXACT_ALARM') {
        const currentSound = data.soundId || useAppStore.getState().selectedAlarmSound || 'classic_bell';
        setActiveAlarm({
          taskId: data.taskId,
          taskTitle: data.taskTitle || notification.request.content.title || 'Kaam Ka Waqt Ho Gaya',
          deadlineTime: data.deadlineTime,
          soundId: currentSound,
        });
      }
    });

    const expoRespSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type === 'EXACT_ALARM') {
        const currentSound = data.soundId || useAppStore.getState().selectedAlarmSound || 'classic_bell';
        setActiveAlarm({
          taskId: data.taskId,
          taskTitle: data.taskTitle || response.notification.request.content.title || 'Kaam Ka Waqt Ho Gaya',
          deadlineTime: data.deadlineTime,
          soundId: currentSound,
        });
      }
    });

    return () => {
      unsubTrigger();
      try {
        if (typeof unsubscribeNotifee === 'function') {
          unsubscribeNotifee();
        }
      } catch {}
      expoNotifSub.remove();
      expoRespSub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <RootNavigator />
        <FullScreenAlarmModal alarm={activeAlarm} onDismiss={dismissActiveAlarm} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
