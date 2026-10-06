import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Vibration,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SoundService, AlarmSoundId } from '../services/sound/sound.service';
import { useAppStore, ActiveAlarmData } from '../store';
import { useUpdateTask } from '../hooks';
import NotificationService from '../services/notifications/notification.service';

interface FullScreenAlarmModalProps {
  alarm: ActiveAlarmData | null;
  onDismiss: () => void;
}

export const FullScreenAlarmModal: React.FC<FullScreenAlarmModalProps> = ({
  alarm,
  onDismiss,
}) => {
  const { language, setTaskAlarmSound } = useAppStore();
  const updateTaskMutation = useUpdateTask();

  // Animation values for pulsing alarm rings
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Live digital clock time string
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  useEffect(() => {
    if (!alarm) return;

    // Start live clock interval
    const clockTimer = setInterval(() => {
      const d = new Date();
      setCurrentTimeStr(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);

    // Start sound loop
    const soundId: AlarmSoundId = alarm.soundId || useAppStore.getState().selectedAlarmSound || 'classic_bell';
    SoundService.startAlarmLoop(soundId).catch(() => {});

    // Start vibration pattern: 500ms on, 500ms off
    const VIBRATION_PATTERN = [500, 500, 500, 500];
    try {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    } catch {}

    // Pulsing circles animation
    const pulseLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim1, {
          toValue: 1.45,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim1, {
          toValue: 1,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(pulseAnim2, {
          toValue: 1.65,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 1,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Bell ringing shake animation
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );

    pulseLoop1.start();
    pulseLoop2.start();
    shakeLoop.start();

    return () => {
      clearInterval(clockTimer);
      SoundService.stopAlarmLoop().catch(() => {});
      try {
        Vibration.cancel();
      } catch {}
      pulseLoop1.stop();
      pulseLoop2.stop();
      shakeLoop.stop();
    };
  }, [alarm]);

  if (!alarm) return null;

  const soundMeta = SoundService.getSoundMeta(alarm.soundId || 'classic_bell');

  const handleStopAlarm = async () => {
    await SoundService.stopAlarmLoop();
    try {
      Vibration.cancel();
    } catch {}
    if (alarm.taskId) {
      await NotificationService.cancelTaskAlerts(alarm.taskId);
    }
    onDismiss();
  };

  const handleCompleteTask = async () => {
    await handleStopAlarm();
    if (alarm.taskId) {
      try {
        updateTaskMutation.mutate({
          id: alarm.taskId,
          completed: true,
          status: 'COMPLETED',
          confirmationStatus: 'COMPLETED',
        } as any);
      } catch (err) {
        console.warn('[FullScreenAlarm] Error completing task:', err);
      }
    }
  };

  const handleSnooze = async () => {
    await handleStopAlarm();
    const taskId = alarm.taskId || String(Date.now());
    const taskTitle = alarm.taskTitle || 'Task';
    const soundId = alarm.soundId || 'classic_bell';
    await NotificationService.snoozeTaskAlarm(taskId, taskTitle, 5, soundId);
  };

  return (
    <Modal
      visible={Boolean(alarm)}
      transparent={false}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={handleStopAlarm}
    >
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      <View style={styles.container}>
        {/* Ambient background glow */}
        <LinearGradient
          colors={['#0F172A', '#090D16', '#020617']}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.ringingBadge}>
            <View style={styles.pulsingDot} />
            <Text style={styles.ringingBadgeText}>
              {language === 'hi' ? 'अलार्म बज रहा है' : 'ALARM RINGING'}
            </Text>
          </View>
          <Text style={styles.clockText}>{currentTimeStr}</Text>
          {alarm.deadlineTime && (
            <Text style={styles.scheduledText}>
              {language === 'hi'
                ? `निर्धारित समय: ${alarm.deadlineTime}`
                : `Scheduled for ${alarm.deadlineTime}`}
            </Text>
          )}
        </View>

        {/* Center Ringing Animation & Task Details */}
        <View style={styles.centerSection}>
          <View style={styles.animWrap}>
            {/* Outer Ripple 2 */}
            <Animated.View
              style={[
                styles.rippleRing,
                styles.rippleRing2,
                { transform: [{ scale: pulseAnim2 }] },
              ]}
            />
            {/* Outer Ripple 1 */}
            <Animated.View
              style={[
                styles.rippleRing,
                styles.rippleRing1,
                { transform: [{ scale: pulseAnim1 }] },
              ]}
            />
            {/* Bell Icon Circle */}
            <Animated.View
              style={[
                styles.bellCircle,
                {
                  transform: [
                    {
                      rotate: shakeAnim.interpolate({
                        inputRange: [-10, 10],
                        outputRange: ['-15deg', '15deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.bellEmoji}>{soundMeta.emoji || '⏰'}</Text>
            </Animated.View>
          </View>

          {/* Sound Badge */}
          <View style={styles.soundBadge}>
            <Text style={styles.soundBadgeIcon}>🔊</Text>
            <Text style={styles.soundBadgeText}>
              {soundMeta.name} {language === 'hi' ? `(${soundMeta.nameHi})` : ''}
            </Text>
          </View>

          {/* Task Title */}
          <Text style={styles.taskTitle} numberOfLines={3}>
            {alarm.taskTitle}
          </Text>

          {/* Task Description / Notes */}
          {Boolean(alarm.description) && (
            <View style={styles.descCard}>
              <Text style={styles.descText} numberOfLines={2}>
                {alarm.description}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {/* Complete Task CTA (Big Emerald Button) */}
          <TouchableOpacity
            style={styles.completeBtn}
            activeOpacity={0.85}
            onPress={handleCompleteTask}
          >
            <LinearGradient
              colors={['#16A34A', '#15803D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.completeBtnGradient}
            >
              <Text style={styles.completeBtnIcon}>✅</Text>
              <Text style={styles.completeBtnText}>
                {language === 'hi' ? 'काम पूरा हो गया (बंद करें)' : 'Task Completed (Stop)'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Snooze & Stop Row */}
          <View style={styles.secondaryRow}>
            {/* 5 Min Snooze */}
            <TouchableOpacity
              style={styles.snoozeBtn}
              activeOpacity={0.8}
              onPress={handleSnooze}
            >
              <Text style={styles.snoozeBtnIcon}>⏳</Text>
              <Text style={styles.snoozeBtnText}>
                {language === 'hi' ? '5 मिनट बाद (Snooze)' : 'Snooze 5 Min'}
              </Text>
            </TouchableOpacity>

            {/* Stop Alarm */}
            <TouchableOpacity
              style={styles.stopBtn}
              activeOpacity={0.8}
              onPress={handleStopAlarm}
            >
              <Text style={styles.stopBtnIcon}>⏹️</Text>
              <Text style={styles.stopBtnText}>
                {language === 'hi' ? 'अलार्म रोकें' : 'Stop Alarm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default FullScreenAlarmModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 56 : 50,
    paddingBottom: Platform.OS === 'android' ? 36 : 42,
  },
  topHeader: {
    alignItems: 'center',
    gap: 6,
  },
  ringingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  ringingBadgeText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  clockText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
    marginTop: 6,
  },
  scheduledText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  centerSection: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  animWrap: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  rippleRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
  },
  rippleRing1: {
    width: 140,
    height: 140,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  rippleRing2: {
    width: 170,
    height: 170,
    borderColor: 'rgba(34, 197, 94, 0.22)',
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  bellCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E293B',
    borderWidth: 3,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  bellEmoji: {
    fontSize: 52,
  },
  soundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  soundBadgeIcon: {
    fontSize: 14,
  },
  soundBadgeText: {
    color: '#86EFAC',
    fontSize: 13,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    paddingHorizontal: 10,
  },
  descCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: '92%',
  },
  descText: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomActions: {
    gap: 14,
  },
  completeBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  completeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  completeBtnIcon: {
    fontSize: 20,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  snoozeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  snoozeBtnIcon: {
    fontSize: 16,
  },
  snoozeBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  stopBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 6,
  },
  stopBtnIcon: {
    fontSize: 15,
  },
  stopBtnText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
  },
});
