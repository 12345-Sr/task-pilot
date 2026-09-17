import { registerRootComponent } from 'expo';
import App from './App';

// Handle background alarm actions (Complete, Snooze, Dismiss) for standalone builds
try {
  const notifeeMod = require('@notifee/react-native');
  const notifee = notifeeMod.default || notifeeMod;
  const EventType = notifeeMod.EventType || {};
  const TriggerType = notifeeMod.TriggerType || {};
  const AlarmType = notifeeMod.AlarmType || {};
  const AndroidCategory = notifeeMod.AndroidCategory || {};

  if (notifee && typeof notifee.onBackgroundEvent === 'function') {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;
      if (type === EventType.ACTION_PRESS) {
        if (pressAction?.id === 'complete_task') {
          if (notification?.id) {
            await notifee.cancelNotification(notification.id).catch(() => {});
          }
        } else if (pressAction?.id === 'snooze_task') {
          if (notification?.id) {
            await notifee.cancelNotification(notification.id).catch(() => {});
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
                importance: notifeeMod.AndroidImportance?.HIGH || 4,
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
  // Gracefully ignored in Expo Go where Notifee native binary is not available
}

registerRootComponent(App);
