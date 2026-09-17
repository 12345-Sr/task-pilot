import { registerRootComponent } from 'expo';
import notifee, { EventType, TriggerType, AlarmType, AndroidCategory, AndroidImportance } from '@notifee/react-native';
import App from './App';

// Handle background alarm actions (Complete, Snooze, Dismiss)
notifee.onBackgroundEvent(async ({ type, detail }) => {
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

registerRootComponent(App);
