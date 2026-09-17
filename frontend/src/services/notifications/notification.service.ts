import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
  AlarmType,
} from '@notifee/react-native';
import { apiClient } from '../../api/client';

// Configure foreground appearance for standard expo notifications
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.warn('Could not initialize notification handler:', e);
}

export class NotificationService {
  private static isInitialized = false;
  private static hasCustomChannel = false;

  /**
   * Initializes notification channels for both Notifee (Full-Screen Alarm Clock)
   * and Expo Notifications with exact permissions.
   */
  static async init(): Promise<void> {
    if (this.isInitialized || Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
      // 1. Full-Screen Alarm Channel with Max Priority, Alarm Category & Looping Sound
      try {
        await notifee.createChannel({
          id: 'task-alarms-v2',
          name: 'TaskPilot Alarm Clock',
          description: 'High-visibility full screen alarms that ring at the exact scheduled second',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          vibration: true,
          sound: 'default',
          bypassDnd: true,
          lights: true,
          lightColor: '#16A34A',
        });
      } catch (err) {
        console.warn('[NOTIF] task-alarms-v2 channel creation warning:', err);
      }

      // 2. Advance Warning & Task Added Channel
      try {
        await notifee.createChannel({
          id: 'task-reminders',
          name: 'TaskPilot Reminders',
          description: 'Advance reminders and task added confirmations',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          vibration: true,
          sound: 'default',
        });
      } catch (err) {
        console.warn('[NOTIF] task-reminders channel creation warning:', err);
      }

      // 3. Fallback channel for Expo Notifications
      try {
        await Notifications.setNotificationChannelAsync('task-alerts', {
          name: 'Task Alerts & Reminders',
          description: 'Timely reminders and deadline alerts for your tasks',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          lightColor: '#16A34A',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
        this.hasCustomChannel = true;
      } catch (err) {
        console.warn('[NOTIF] Expo fallback channel notice:', err);
      }
    }

    // Request permissions
    try {
      await this.requestPermissions();
    } catch (e) {
      console.warn('Error requesting permissions:', e);
    }

    // Register push token with backend if available
    try {
      await this.syncPushToken();
    } catch {}

    this.isInitialized = true;
    console.log('[NOTIF] NotificationService successfully initialized.');
  }

  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      // 1. Notifee permission request (Android 13+ POST_NOTIFICATIONS)
      await notifee.requestPermission();

      // 2. Expo notifications permission check
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permissions:', e);
      return false;
    }
  }

  static async getDevicePushToken(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
      console.log('[PUSH] Running in Expo Go: Remote push token skipped. Local alerts are active.');
      return null;
    }

    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;

      try {
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        if (deviceTokenData?.data) {
          return deviceTokenData.data;
        }
      } catch {}

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        (Constants?.easConfig as any)?.projectId;

      const isUUID = projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

      const tokenData = await Notifications.getExpoPushTokenAsync(
        isUUID ? { projectId } : undefined
      );
      return tokenData?.data || null;
    } catch (e) {
      return null;
    }
  }

  static async getExpoPushToken(): Promise<string | null> {
    return this.getDevicePushToken();
  }

  static async syncPushToken(): Promise<void> {
    try {
      const token = await this.getDevicePushToken();
      if (token) {
        await apiClient.patch('/auth/push-token', { pushToken: token }).catch(() => {});
      }
    } catch {}
  }

  /**
   * LEVEL 2 FULL-SCREEN ALARM & ZERO-DELAY EXACT TIME SCHEDULING:
   * 1. Exact-Time Alarm using AlarmManager.setAlarmClock (Zero-Delay, millisecond precision, fires even in Doze mode)
   * 2. Full-Screen Intent on lock screen (wakes screen, shows alarm view with Done & Snooze buttons)
   * 3. Looping sound until dismissed or snoozed
   * 4. Advance Warning (10 minutes before, or 2 minutes before if scheduled < 10m ahead)
   */
  static async scheduleTaskAlerts(
    taskTitle: string,
    taskDate: string,
    deadlineTime: string,
    taskId?: string | number
  ): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      await this.init();

      const deadlineDate = this.parseDateTime(taskDate, deadlineTime);
      if (!deadlineDate) {
        console.warn('Could not parse task date/time:', taskDate, deadlineTime);
        return false;
      }

      const now = Date.now();
      const diffMs = deadlineDate.getTime() - now;

      console.log(`[EXACT ALARM] Scheduling "${taskTitle}" due at:`, deadlineDate, `(${Math.round(diffMs / 1000)}s from now)`);

      if (diffMs <= 0) {
        console.log('[ALERT] Target time is in the past, skipping future schedule.');
        return false;
      }

      const cleanTaskId = String(taskId || Math.abs(Math.sin(deadlineDate.getTime()) * 1000000 | 0));
      const alarmId = `alarm_${cleanTaskId}`;
      const warningId = `warning_${cleanTaskId}`;

      // Ensure channel exists
      try {
        await notifee.createChannel({
          id: 'task-alarms-v2',
          name: 'TaskPilot Alarm Clock',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          vibration: true,
          sound: 'default',
          bypassDnd: true,
          lights: true,
          lightColor: '#16A34A',
        });
      } catch {}

      // 1. ZERO-DELAY EXACT ALARM CLOCK (Android AlarmManager.setAlarmClock)
      // Rings at the exact second, bypasses Doze mode, launches full-screen intent on lockscreen
      await notifee.createTriggerNotification(
        {
          id: alarmId,
          title: `⏰ Kaam Ka Waqt Ho Gaya: ${taskTitle}`,
          body: `Aapka kaam "${taskTitle}" (${deadlineTime}) complete karne ka theek waqt ho gaya hai!`,
          android: {
            channelId: 'task-alarms-v2',
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            sound: 'default',
            loopSound: true,
            ongoing: true,
            autoCancel: false,
            color: '#16A34A',
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            fullScreenAction: {
              id: 'default',
              launchActivity: 'default',
            },
            actions: [
              {
                title: '✅ Poora Ho Gaya',
                pressAction: { id: 'complete_task' },
              },
              {
                title: '⏳ 5 Min Baad',
                pressAction: { id: 'snooze_task' },
              },
            ],
          },
          data: {
            taskId: cleanTaskId,
            taskTitle,
            deadlineTime,
            type: 'EXACT_ALARM',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: deadlineDate.getTime(),
          alarmManager: {
            type: AlarmType.SET_ALARM_CLOCK,
          },
        }
      );

      console.log(`[EXACT ALARM REGISTERED] Id: ${alarmId} set at exact millisecond (${deadlineDate.toISOString()}) with SET_ALARM_CLOCK`);

      // 2. Intelligent Advance Warning:
      // If task is scheduled > 10m away: warning fires 10 minutes prior
      // If task is scheduled 3 to 10m away (e.g. quick testing): warning fires 2 minutes prior
      const tenMinBeforeMs = deadlineDate.getTime() - 10 * 60 * 1000;
      const twoMinBeforeMs = deadlineDate.getTime() - 2 * 60 * 1000;

      let advanceMs = 0;
      let warningTitle = '';
      let warningBody = '';

      if (tenMinBeforeMs > now + 15000) {
        advanceMs = tenMinBeforeMs;
        warningTitle = `⏳ 10 Min Baaki: ${taskTitle}`;
        warningBody = `Dhyan dein! "${taskTitle}" ke liye sirf 10 minute baaki hain (${deadlineTime}).`;
      } else if (twoMinBeforeMs > now + 15000) {
        advanceMs = twoMinBeforeMs;
        warningTitle = `⏳ 2 Min Baaki: ${taskTitle}`;
        warningBody = `Dhyan dein! "${taskTitle}" ke liye sirf 2 minute baaki hain (${deadlineTime}).`;
      }

      if (advanceMs > 0) {
        try {
          await notifee.createChannel({
            id: 'task-reminders',
            name: 'TaskPilot Reminders',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            vibration: true,
            sound: 'default',
          });
        } catch {}

        await notifee.createTriggerNotification(
          {
            id: warningId,
            title: warningTitle,
            body: warningBody,
            android: {
              channelId: 'task-reminders',
              category: AndroidCategory.REMINDER,
              importance: AndroidImportance.HIGH,
              sound: 'default',
              pressAction: {
                id: 'default',
                launchActivity: 'default',
              },
            },
            data: {
              taskId: cleanTaskId,
              taskTitle,
              type: 'ADVANCE_WARNING',
            },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: advanceMs,
            alarmManager: {
              type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
            },
          }
        );
        console.log(`[ADVANCE WARNING REGISTERED] Id: ${warningId} set for timestamp ${new Date(advanceMs).toLocaleTimeString()}`);
      }

      return true;
    } catch (err) {
      console.error('Error scheduling task exact alarm:', err);
      return false;
    }
  }

  /**
   * Cancels both exact alarm and warning for a task
   */
  static async cancelTaskAlerts(taskId: string | number): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const cleanId = String(taskId);
      await notifee.cancelNotification(`alarm_${cleanId}`);
      await notifee.cancelNotification(`warning_${cleanId}`);
      console.log(`[ALARM CANCELLED] For task ${cleanId}`);
    } catch (e) {
      console.warn('Error cancelling task alert:', e);
    }
  }

  /**
   * Fires an immediate push notification confirming a task was added.
   * Uses dual delivery (Notifee + Expo fallback) to guarantee appearance!
   */
  static async sendTaskAddedNotification(
    taskTitle: string,
    taskDate?: string,
    reminderTime?: string,
    localizedTitle?: string,
    localizedBody?: string
  ): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      await this.init();

      const title = localizedTitle || `✅ Kaam Joda Gaya: ${taskTitle}`;
      let body = localizedBody
        ? `${localizedBody}: "${taskTitle}"`
        : `"${taskTitle}" aapke schedule mein safalta-poorvak add ho gaya hai.`;

      if (reminderTime) {
        body += ` (⏰ Reminder: ${reminderTime})`;
      }

      let delivered = false;

      // 1. Try Notifee native notification
      try {
        await notifee.createChannel({
          id: 'task-reminders',
          name: 'TaskPilot Reminders',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          vibration: true,
          sound: 'default',
        });

        await notifee.displayNotification({
          title,
          body,
          android: {
            channelId: 'task-reminders',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            color: '#16A34A',
            pressAction: { id: 'default', launchActivity: 'default' },
          },
        });
        delivered = true;
      } catch (notifeeErr) {
        console.warn('[NOTIF] Notifee display notice, attempting Expo fallback:', notifeeErr);
      }

      // 2. Fallback to Expo Notifications if needed
      if (!delivered) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            badge: 1,
            data: {
              type: 'TASK_ADDED',
              title: taskTitle,
              date: taskDate,
              time: reminderTime,
            },
          },
          trigger: null,
        });
      }

      console.log(`[NOTIF] Task added notification delivered for "${taskTitle}"`);
      return true;
    } catch (err) {
      console.error('Error firing task added notification:', err);
      return false;
    }
  }

  /**
   * Fires an immediate notification alerting a free user that their
   * 3-task free tier is exhausted.
   */
  static async sendQuotaLimitNotification(
    localizedTitle?: string,
    localizedBody?: string
  ): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      await this.init();

      const title = localizedTitle || '⚠️ Free Tier Limit Reached';
      const body =
        localizedBody ||
        'Your free tier is over (3/3 tasks used). Upgrade to Pro to create new tasks and receive reminder alerts!';

      try {
        await notifee.createChannel({
          id: 'task-reminders',
          name: 'TaskPilot Reminders',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });
        await notifee.displayNotification({
          title,
          body,
          android: {
            channelId: 'task-reminders',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            pressAction: { id: 'default' },
          },
        });
      } catch {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            badge: 1,
          },
          trigger: null,
        });
      }

      return true;
    } catch (err) {
      console.warn('[NOTIF] Error delivering quota limit notification:', err);
      return false;
    }
  }

  /**
   * Fires a local notification with custom title and body.
   */
  static async sendLocalNotification(
    title: string,
    body: string,
    delaySeconds: number = 1
  ): Promise<boolean> {
    try {
      await this.init();
      if (Platform.OS === 'web') return false;

      if (delaySeconds <= 1) {
        await notifee.displayNotification({
          title,
          body,
          android: {
            channelId: 'task-reminders',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            pressAction: { id: 'default' },
          },
        });
      } else {
        await notifee.createTriggerNotification(
          {
            title,
            body,
            android: {
              channelId: 'task-reminders',
              importance: AndroidImportance.HIGH,
              sound: 'default',
              pressAction: { id: 'default' },
            },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: Date.now() + delaySeconds * 1000,
            alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
          }
        );
      }
      return true;
    } catch (err) {
      console.warn('[NOTIF] sendLocalNotification failed:', err);
      return false;
    }
  }

  /**
   * Fires a test full-screen alarm in N seconds (default 5s)
   * so the user can verify sound, screen-wake, and action buttons immediately!
   */
  static async triggerTestAlert(seconds: number = 5): Promise<boolean> {
    try {
      await this.init();

      const triggerTimestamp = Date.now() + seconds * 1000;

      await notifee.createChannel({
        id: 'task-alarms-v2',
        name: 'TaskPilot Alarm Clock',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        vibration: true,
        sound: 'default',
        bypassDnd: true,
        lights: true,
        lightColor: '#16A34A',
      });

      await notifee.createTriggerNotification(
        {
          id: 'test_alarm_check',
          title: '⏰ TEST ALARM: TaskPilot Alert!',
          body: `Yeh test alarm ${seconds} second baad baja hai! Sound loop karega jab tak aap Poora ya Dismiss na dabayein.`,
          android: {
            channelId: 'task-alarms-v2',
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            sound: 'default',
            loopSound: true,
            ongoing: true,
            autoCancel: false,
            color: '#16A34A',
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            fullScreenAction: {
              id: 'default',
              launchActivity: 'default',
            },
            actions: [
              {
                title: '✅ Poora Ho Gaya',
                pressAction: { id: 'complete_task' },
              },
              {
                title: '⏳ 5 Min Baad',
                pressAction: { id: 'snooze_task' },
              },
            ],
          },
          data: {
            taskId: 'test_task',
            taskTitle: 'Test Task Alert',
            type: 'TEST_ALARM',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTimestamp,
          alarmManager: {
            type: AlarmType.SET_ALARM_CLOCK,
          },
        }
      );

      console.log(`[TEST EXACT ALARM] Scheduled for ${seconds}s from now.`);
      return true;
    } catch (err) {
      console.error('Error triggering test alert:', err);
      return false;
    }
  }

  /**
   * Date parser supporting:
   * "2026-09-08", "aaj", "kal", "today", "tomorrow" and "09:30 AM", "05:40:00", or "17:40"
   */
  private static parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
      let targetDate = new Date();
      const lowerDate = (dateStr || '').trim().toLowerCase();
      if (lowerDate === 'kal' || lowerDate === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (lowerDate !== 'aaj' && lowerDate !== 'today' && lowerDate.includes('-')) {
        const [y, m, day] = dateStr.split('-').map((v) => parseInt(v, 10));
        if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
          targetDate = new Date(y, m - 1, day);
        }
      }

      const isPM = /pm/i.test(timeStr);
      const isAM = /am/i.test(timeStr);
      const clean = timeStr.replace(/am|pm/gi, '').trim();
      const parts = clean.split(':').map((v) => parseInt(v, 10));
      let hours = parts[0] !== undefined && !isNaN(parts[0]) ? parts[0] : 9;
      const minutes = parts[1] !== undefined && !isNaN(parts[1]) ? parts[1] : 0;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
      return targetDate;
    } catch {
      return null;
    }
  }
}

export default NotificationService;
