import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { useCreateTask, useTodayTasks } from '../hooks';
import { Priority } from '../types';
import PriorityChip from '../components/PriorityChip';
import PaywallModal from '../components/PaywallModal';
import TimeSliderPicker, { getNextValidFutureTime, isTimeInPast } from '../components/TimeSliderPicker';
import DatePickerCard from '../components/DatePickerCard';
import NotificationService from '../services/notifications/notification.service';
import { taskHistoryService } from '../services/history/taskHistory.service';
import AlarmSoundPicker from '../components/AlarmSoundPicker';
import { AlarmSoundId } from '../services/sound/sound.service';

export const AddTaskScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, isPremium, paywallVisible, setPaywallVisible, getFreeUsage, selectedAlarmSound, setTaskAlarmSound } = useAppStore();
  const { data: existingTasks } = useTodayTasks();
  const createTaskMutation = useCreateTask();

  const { used: freeUsed } = getFreeUsage();

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedDate, setSelectedDate] = useState(getTodayStr);
  const [reminderTime, setReminderTime] = useState(() => {
    const next = getNextValidFutureTime();
    return `${next.hourStr}:${next.minuteStr} ${next.period}`;
  });
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [remindBefore, setRemindBefore] = useState(true);
  const [remindAtTime, setRemindAtTime] = useState(true);
  const [selectedSound, setSelectedSound] = useState<AlarmSoundId>(selectedAlarmSound || 'classic_bell');

  const handleSaveTask = () => {
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg(t(language, 'enter_task_title_error'));
      return;
    }

    // Time is mandatory - validate for past time if selectedDate is today
    const parts = reminderTime.replace(/am|pm/gi, '').trim().split(':');
    const isPM = /pm/i.test(reminderTime);
    const hStr = parts[0] || '09';
    const mStr = parts[1] || '00';
    if (isTimeInPast(hStr, mStr, isPM ? 'PM' : 'AM', selectedDate)) {
      setErrorMsg(
        language === 'hi'
          ? '⚠️ Aaj ke liye beeta hua samay nahi chuna ja sakta. Kripya aage ka samay chunein.'
          : '⚠️ Cannot schedule a past time for today. Please pick a future time.'
      );
      return;
    }

    const { used: freeUsed } = useAppStore.getState().getFreeUsage();
    if (!isPremium && freeUsed >= 3) {
      NotificationService.sendQuotaLimitNotification(
        language === 'hi' ? '⚠️ Free Tier Limit Pura Ho Gaya' : '⚠️ Free Tier Limit Reached',
        language === 'hi'
          ? 'Aapke 3 free tasks poore ho chuke hain. Naye tasks aur reminder alerts ke liye Pro me upgrade karein.'
          : 'Your free tier is over (3/3 tasks used). Upgrade to Pro to create new tasks and receive reminder alerts.'
      );
      setPaywallVisible(true);
      return;
    }

    const taskTitle = title.trim();
    const taskDesc = description.trim();
    if (taskDesc) {
      useAppStore.getState().setTaskDescription(taskTitle, taskDesc);
      useAppStore.getState().setTaskDescription(`${taskTitle}_${selectedDate}`, taskDesc);
    }

    createTaskMutation.mutate(
      {
        title: taskTitle,
        description: taskDesc,
        notes: taskDesc,
        priority: priority.toUpperCase() as any,
        targetDate: selectedDate,
        date: selectedDate,
        reminderTime: reminderTime,
        time: reminderTime,
        repeatMonthly: Boolean(repeatMonthly),
        alarmSound: selectedAlarmSound || 'classic_bell',
      },
      {
        onSuccess: async (createdTask: any) => {
          const soundToUse = selectedAlarmSound || 'classic_bell';
          if (createdTask?.id) {
            setTaskAlarmSound(String(createdTask.id), soundToUse);
            if (taskDesc) {
              useAppStore.getState().setTaskDescription(String(createdTask.id), taskDesc);
            }
          }
          await NotificationService.sendTaskAddedNotification(
            taskTitle,
            selectedDate,
            reminderTime,
            `✅ ${t(language, 'task_added_success')}: ${taskTitle}`,
            t(language, 'task_added_msg')
          );

          if (remindAtTime || remindBefore) {
            await NotificationService.scheduleTaskAlerts(
              taskTitle,
              selectedDate,
              reminderTime,
              createdTask?.id,
              soundToUse
            );
          }

          setTitle('');
          setDescription('');
          setRepeatMonthly(false);
          Alert.alert(
            t(language, 'task_added_success'),
            t(language, 'task_added_msg'),
            [
              {
                text: 'OK',
                onPress: () => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('TodayTab');
                  }
                },
              },
            ]
          );
        },
        onError: (err: any) => {
          const status = err?.response?.status || err?.status;
          const isQuota = status === 402 || err?.response?.data?.reason === 'free_limit_reached';
          if (isQuota) {
            useAppStore.getState().setFreeLifetimeCreated(3);
            NotificationService.sendQuotaLimitNotification(
              language === 'hi' ? '⚠️ Free Tier Limit Pura Ho Gaya' : '⚠️ Free Tier Limit Reached',
              language === 'hi'
                ? 'Aapke 3 free tasks poore ho chuke hain. Naye tasks aur reminder alerts ke liye Pro me upgrade karein.'
                : 'Your free tier is over (3/3 tasks used). Upgrade to Pro to create new tasks and receive reminder alerts.'
            );
            setPaywallVisible(true);
          }
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Error saving task. Please try again.';
          setErrorMsg(msg);
        },
      }
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Create New Task
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 24) + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Title Input matching Mockup Screen 4 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Task Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task name"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Notes (Optional) matching Mockup Screen 4 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any additional details..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Target Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t(language, 'select_date_heading')}</Text>
            <DatePickerCard
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              language={language}
            />
          </View>

          {/* Reminder Section with Sliding Time Picker */}
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderHeaderLeft}>
                <Text style={styles.reminderTitle}>{t(language, 'reminder_time_heading')}</Text>
                <Text style={styles.reminderSubtitle}>
                  {`${reminderTime} ${t(language, 'alert_at_time')}`}
                </Text>
              </View>
            </View>

            {/* 3-Column Time Slider Picker */}
            <TimeSliderPicker
              value={reminderTime}
              onChange={setReminderTime}
              language={language}
              selectedDate={selectedDate}
            />
          </View>

          {/* Priority Picker matching Mockup Screen 4 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t(language, 'priority_label')}</Text>
            <View style={styles.priorityRow}>
              {(['ZAROORI', 'MEDIUM', 'NORMAL'] as Priority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.7}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityOption,
                    priority === p && styles.priorityOptionActive,
                  ]}
                >
                  <PriorityChip priority={p} selected={priority === p} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reminders Checkboxes matching Mockup Screen 4 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reminders</Text>
            <View style={styles.remindersCard}>
              <TouchableOpacity
                style={styles.reminderCheckRow}
                onPress={() => setRemindBefore(!remindBefore)}
                activeOpacity={0.8}
              >
                <View style={[styles.reminderCheckbox, remindBefore && styles.reminderCheckboxActive]}>
                  {remindBefore && <Text style={styles.reminderCheckmark}>✓</Text>}
                </View>
                <Text style={styles.reminderCheckLabel}>
                  {language === 'hi' ? '10 minute pehle alert' : '10 minutes before deadline'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reminderCheckRow}
                onPress={() => setRemindAtTime(!remindAtTime)}
                activeOpacity={0.8}
              >
                <View style={[styles.reminderCheckbox, remindAtTime && styles.reminderCheckboxActive]}>
                  {remindAtTime && <Text style={styles.reminderCheckmark}>✓</Text>}
                </View>
                <Text style={styles.reminderCheckLabel}>
                  {language === 'hi' ? `Theek samay par alert (${reminderTime})` : `At exact time (${reminderTime})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Alarm sound indicator (configured centrally in Settings > Sound section) */}
          {(remindAtTime || remindBefore) && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F0FDF4',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: '#BBF7D0',
              marginBottom: 16,
              gap: 10,
            }}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>
                  {language === 'hi' ? 'अलार्म आवाज: ' : 'Alarm Sound: '}
                  {(selectedAlarmSound || 'classic_bell').replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={{ fontSize: 11, color: '#15803D', marginTop: 1 }}>
                  {language === 'hi' ? 'साउंड सेटिंग्स सेक्शन से बदल सकते हैं' : 'Configured in Settings > Sound section'}
                </Text>
              </View>
            </View>
          )}

          {/* Direct Save CTA Button */}
          <TouchableOpacity
            style={[styles.saveButtonTouch, createTaskMutation.isPending && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleSaveTask}
            disabled={createTaskMutation.isPending}
          >
            <LinearGradient
              colors={['#0D5C3A', '#15803D']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.saveButton}
            >
              {createTaskMutation.isPending ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>
                  Save Task
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: spacing.xs,
    width: 40,
  },
  backBtnText: {
    fontSize: 22,
    color: colors.textPrimary,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.softRed,
    borderColor: colors.urgentRed,
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.urgentRed,
    textAlign: 'center',
  },
  freeStepNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  freeStepNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  freeStepNoticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeStepNoticeIconWrapFinal: {
    backgroundColor: '#FEE2E2',
  },
  freeStepNoticeIcon: {
    fontSize: 16,
  },
  freeStepNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#92400E',
  },
  freeStepNoticeSub: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '500',
    marginTop: 1,
  },
  freeStepNoticeBadge: {
    backgroundColor: '#B45309',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  freeStepNoticeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityOption: {
    flex: 1,
    borderRadius: radius.md,
  },
  priorityOptionActive: {
    transform: [{ scale: 1.02 }],
  },
  reminderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  reminderHeaderLeft: {
    gap: 2,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reminderSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryOrange,
  },
  importantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  importantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  importantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  alertNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  alertNoteIcon: {
    fontSize: 14,
  },
  alertNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 16,
  },
  boldTime: {
    fontWeight: '800',
    color: colors.primaryOrange,
  },
  saveButtonTouch: {
    borderRadius: radius.md,
    marginTop: spacing.md,
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  saveButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  remindersCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  reminderCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderCheckboxActive: {
    backgroundColor: '#0D5C3A',
    borderColor: '#0D5C3A',
  },
  reminderCheckmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  reminderCheckLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalIcon: {
    fontSize: 22,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 8,
  },
  modalScrollView: {
    flexGrow: 0,
    maxHeight: 320,
  },
  modalScrollContent: {
    paddingVertical: 2,
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewRowCol: {
    gap: 4,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  previewValueTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewDescText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  modalEditBtn: {
    flex: 1,
    height: 46,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  modalSubmitBtnTouch: {
    flex: 1.3,
    height: 46,
    borderRadius: radius.md,
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  modalSubmitBtn: {
    flex: 1,
    height: 46,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  proFeatureCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  proFeatureCardActive: {
    backgroundColor: '#FEF3C7',
    borderColor: colors.primaryOrange,
  },
  proFeatureInfo: {
    flex: 1,
  },
  proFeatureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  proFeatureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  proPill: {
    backgroundColor: colors.primaryOrange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  proPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  proFeatureSub: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  quickPresetsWrap: {
    marginBottom: spacing.sm,
  },
  quickPresetsHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  presetChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  presetChipIcon: {
    fontSize: 14,
  },
  presetChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  presetChipTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
});

export default AddTaskScreen;
