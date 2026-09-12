import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from '../../api/client';

// Configure how notifications appear when app is in foreground
// Removed deprecated 'shouldShowAlert' to eliminate console warnings
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
   * Initializes notification channel (with graceful fallback for Expo Go)
   * and requests user permissions.
   */
  static async init(): Promise<void> {
    if (this.isInitialized || Platform.OS === 'web') return;

    // 1. Android Notification Channel setup with graceful catch for Expo Go Android
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('task-alerts', {
          name: 'Task Alerts & Reminders',
          description: 'Timely reminders and deadline alerts for your tasks',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500, 200, 500],
          sound: 'default',
          lightColor: '#C5A059',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
        this.hasCustomChannel = true;
      } catch {
        // Expo Go on Android doesn't support custom channel providers; system uses default channel safely
        console.log('[NOTIF] Using default Android notification channel for Expo Go.');
        this.hasCustomChannel = false;
      }
    }

    // 2. Request user permissions (mandatory for Android 13+ and iOS)
    try {
      await this.requestPermissions();
    } catch (e) {
      console.warn('Error requesting permissions:', e);
    }

    // 3. Register push token with backend if available
    try {
      await this.syncPushToken();
    } catch {}

    this.isInitialized = true;
    console.log('NotificationService successfully initialized.');
  }

  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
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
    // In Expo Go, push tokens (FCM & EAS remote tokens) require standalone development build or valid EAS UUID.
    // Skip remote token retrieval in Expo Go to avoid unhandled rejection and show graceful status.
    if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
      console.log('[PUSH] Running in Expo Go: Remote push token skipped. Local alerts are active.');
      return null;
    }

    try {
      const granted = await this.requestPermissions();
      if (!granted) return null;

      // 1. Try native FCM device push token first (Firebase Cloud Messaging)
      try {
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        if (deviceTokenData?.data) {
          console.log('[FCM] Native device push token retrieved:', deviceTokenData.data);
          return deviceTokenData.data;
        }
      } catch (fcmErr) {
        console.log('[FCM] Native device token not directly available, checking Expo token:', fcmErr);
      }

      // 2. Fallback to Expo push token if valid EAS UUID exists
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        (Constants?.easConfig as any)?.projectId;

      // Only pass projectId if it looks like a valid UUID (not dummy string)
      const isUUID = projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

      const tokenData = await Notifications.getExpoPushTokenAsync(
        isUUID ? { projectId } : undefined
      );
      return tokenData?.data || null;
    } catch (e) {
      console.log('[PUSH] Remote token skipped (local device alerts active).', e);
      return null;
    }
  }

  static async getExpoPushToken(): Promise<string | null> {
    return this.getDevicePushToken();
  }

  /**
   * Syncs the device push token with the backend PostgreSQL database
   */
  static async syncPushToken(): Promise<void> {
    try {
      const token = await this.getDevicePushToken();
      if (token) {
        await apiClient.patch('/auth/push-token', { pushToken: token }).catch(() => {});
        console.log('[PUSH] Token synced with backend:', token);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Schedules:
   * 1. Exact-Time Alert at the task deadline (Loud chime, vibration, banner)
   * 2. 10-Minute Advance Warning (fires exactly 10 minutes before deadline if scheduled > 10m ahead)
   */
  static async scheduleTaskAlerts(
    taskTitle: string,
    taskDate: string,
    deadlineTime: string
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
      const diffSec = Math.round(diffMs / 1000);

      console.log(`[ALERT SCHEDULING] "${taskTitle}" due at:`, deadlineDate, `(${diffSec}s from now)`);

      if (diffSec <= 0) {
        console.log('[ALERT] Target time is in the past, skipping future schedule.');
        return false;
      }

      // 1. Exact-Time Deadline Alert
      const exactTrigger: any = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, diffSec),
        ...(this.hasCustomChannel ? { channelId: 'task-alerts' } : {}),
      };

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ Kaam Ka Waqt Ho Gaya: ${taskTitle}`,
          body: `Aapka kaam "${taskTitle}" (${deadlineTime}) complete karne ka theek waqt ho gaya hai!`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 200, 500, 200, 500],
          badge: 1,
        },
        trigger: exactTrigger,
      });

      console.log(`[EXACT ALERT REGISTERED] Id: ${notifId} set for exact deadline (+${diffSec}s)`);

      // 2. 10-Minute Advance Reminder (fires exactly 10 minutes before deadline)
      const tenMinBeforeSec = diffSec - 10 * 60;
      if (tenMinBeforeSec > 10) {
        const earlyTrigger: any = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: tenMinBeforeSec,
          ...(this.hasCustomChannel ? { channelId: 'task-alerts' } : {}),
        };

        const earlyId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏳ 10 Min Baaki: ${taskTitle}`,
            body: `Dhyan dein! "${taskTitle}" ke liye sirf 10 minute baaki hain (${deadlineTime}).`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 300, 200, 300],
          },
          trigger: earlyTrigger,
        });

        console.log(`[10-MIN ADVANCE ALERT REGISTERED] Id: ${earlyId} set for 10 min before (+${tenMinBeforeSec}s)`);
      }

      return true;
    } catch (err) {
      console.error('Error scheduling task alert:', err);
      return false;
    }
  }

  /**
   * Fires an immediate push notification confirming a task was added.
   * Delivers immediate banner, sound, and vibration feedback.
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

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 150, 250],
          badge: 1,
          data: {
            type: 'TASK_ADDED',
            title: taskTitle,
            date: taskDate,
            time: reminderTime,
          },
        },
        trigger: null, // null trigger schedules and fires IMMEDIATELY!
      });

      console.log(`[NOTIF] Task added immediate notification delivered: "${taskTitle}"`);
      return true;
    } catch (err) {
      console.error('Error firing task added notification:', err);
      return false;
    }
  }

  /**
   * Fires an immediate push notification alerting a free user that their
   * 3-task free tier is exhausted and Pro is required for new tasks/reminders.
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

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 300, 200, 300],
          badge: 1,
          data: {
            type: 'QUOTA_EXCEEDED',
          },
        },
        trigger: null,
      });

      console.log('[NOTIF] Quota limit notification delivered');
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
      const trigger: any =
        Platform.OS === 'web'
          ? null
          : {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.max(1, delaySeconds),
              ...(this.hasCustomChannel ? { channelId: 'task-alerts' } : {}),
            };

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          badge: 1,
        },
        trigger,
      });
      return true;
    } catch (err) {
      console.warn('[NOTIF] sendLocalNotification failed:', err);
      return false;
    }
  }

  /**
   * Fires a test alert in N seconds (default 5s) so the user can verify sound, banner, and vibration!
   * Includes both system notification and an in-app alert backup.
   */
  static async triggerTestAlert(seconds: number = 5): Promise<boolean> {
    try {
      await this.init();

      const trigger: any = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, seconds),
        ...(this.hasCustomChannel ? { channelId: 'task-alerts' } : {}),
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Alert Check: Kaam Kar Raha Hai!',
          body: `Yeh test alert ${seconds} second baad baja hai. Aapke task alerts bilkul tayar hain! ⏰`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 200, 500, 200, 500],
          badge: 1,
        },
        trigger,
      });

      // Also trigger backend push if online and token exists
      apiClient.post('/auth/test-push').catch(() => {});

      // In-app backup chime / confirmation when timer expires
      setTimeout(() => {
        Alert.alert(
          '⏰ ALARM: Alert Successful!',
          'Aapke phone par test alert safalta-poorvak trigger ho gaya hai! Task reminders theek samay par bajenge.',
          [{ text: 'Theek Hai' }]
        );
      }, seconds * 1000);

      console.log(`[TEST ALERT] Scheduled for ${seconds}s from now.`);
      return true;
    } catch (err) {
      console.error('Error triggering test alert:', err);
      return false;
    }
  }

  /**
   * Robust Date parser supporting:
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
