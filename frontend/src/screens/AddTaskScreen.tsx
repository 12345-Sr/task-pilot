import React, { useState } from 'react';
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

export const AddTaskScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, isPremium, paywallVisible, setPaywallVisible } = useAppStore();
  const { data: existingTasks } = useTodayTasks();
  const createTaskMutation = useCreateTask();

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
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  const handleToggleRepeatMonthly = () => {
    if (!isPremium) {
      setPaywallVisible(true);
      return;
    }
    setRepeatMonthly((prev) => !prev);
  };

  const handleReviewTask = () => {
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg(t(language, 'enter_task_title_error'));
      return;
    }

    if (reminderEnabled) {
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

    // Open confirmation preview popup with all task details
    setIsConfirmModalVisible(true);
  };

  const handleConfirmAndSave = () => {
    setIsConfirmModalVisible(false);

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
        reminderTime: reminderEnabled ? reminderTime : undefined,
        time: reminderEnabled ? reminderTime : undefined,
        repeatMonthly: Boolean(repeatMonthly),
      },
      {
        onSuccess: async (createdTask: any) => {
          useAppStore.getState().recordTaskCreation(selectedDate);
          if (createdTask?.id && taskDesc) {
            useAppStore.getState().setTaskDescription(String(createdTask.id), taskDesc);
          }
          // 1. Immediate system notification confirming task has been added
          await NotificationService.sendTaskAddedNotification(
            taskTitle,
            selectedDate,
            reminderEnabled ? reminderTime : undefined,
            `✅ ${t(language, 'task_added_success')}: ${taskTitle}`,
            t(language, 'task_added_msg')
          );

          // 2. Schedule future deadline / alert if reminder is enabled
          if (reminderEnabled) {
            await NotificationService.scheduleTaskAlerts(taskTitle, selectedDate, reminderTime);
          }
          const wasRepeated = repeatMonthly;
          setTitle('');
          setDescription('');
          setRepeatMonthly(false);
          Alert.alert(
            t(language, 'task_added_success'),
            wasRepeated ? t(language, 'repeat_monthly_success') : t(language, 'task_added_msg'),
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
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {language === 'hi' ? 'Naya Kaam' : t(language, 'add_task_title')}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {language === 'hi' ? 'Kal ke liye ek kaam jodein' : t(language, 'tagline')}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 24) + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t(language, 'task_title_label')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t(language, 'task_title_placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t(language, 'notes_label')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t(language, 'notes_placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Priority Picker */}
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

          {/* Target Date Picker (Today, Tomorrow, and Other Date) */}
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
                  {reminderEnabled ? `${reminderTime} ${t(language, 'alert_at_time')}` : t(language, 'alert_off')}
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            {reminderEnabled && (
              <>
                {/* 3-Column Time Slider Picker */}
                <TimeSliderPicker
                  value={reminderTime}
                  onChange={setReminderTime}
                  language={language}
                  selectedDate={selectedDate}
                />

                {/* Focused Task Alert Note */}
                <View style={styles.alertNoteBox}>
                  <Text style={styles.alertNoteIcon}>🔔</Text>
                  <Text style={styles.alertNoteText}>
                    {language === 'hi'
                      ? `Is kaam ke 2 alerts aayenge: 10 minute pehle warning aur theek samay (${reminderTime}) par alert.`
                      : `2 alerts will sound for this task: 10 minutes before and at the exact scheduled time (${reminderTime}).`}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Pro Feature: Repeat Daily for Whole Month */}
          <TouchableOpacity
            style={[
              styles.proFeatureCard,
              repeatMonthly && styles.proFeatureCardActive,
            ]}
            activeOpacity={0.85}
            onPress={handleToggleRepeatMonthly}
          >
            <View style={styles.proFeatureInfo}>
              <View style={styles.proFeatureTitleRow}>
                <Text style={styles.proFeatureTitle}>
                  {t(language, 'repeat_monthly_title')}
                </Text>
                {!isPremium && (
                  <View style={styles.proPill}>
                    <Text style={styles.proPillText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.proFeatureSub}>
                {t(language, 'repeat_monthly_sub')}
              </Text>
            </View>
            <Switch
              value={repeatMonthly}
              onValueChange={handleToggleRepeatMonthly}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </TouchableOpacity>

          {/* Review & Save CTA */}
          <TouchableOpacity
            style={[styles.saveButton, createTaskMutation.isPending && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleReviewTask}
            disabled={createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.saveButtonText}>
                {language === 'hi' ? 'Kaam Jodo' : t(language, 'save_task')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Task Confirmation & Preview Modal Popup */}
      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Text style={styles.modalIcon}>📋</Text>
              </View>
              <Text style={styles.modalTitle}>{t(language, 'confirm_task_popup_title')}</Text>
              <Text style={styles.modalSub}>{t(language, 'confirm_task_popup_sub')}</Text>
            </View>

            {/* Task Details Content */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.previewBox}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>📝 {t(language, 'task_title_label')}:</Text>
                  <Text style={styles.previewValueTitle}>{title.trim()}</Text>
                </View>

                <View style={styles.previewDivider} />

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>📅 {t(language, 'date_label')}:</Text>
                  <Text style={styles.previewValue}>{selectedDate}</Text>
                </View>

                <View style={styles.previewDivider} />

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>⏰ {t(language, 'reminder_time_heading').replace(/^[^\w\s\u0900-\u0DFF]+/, '').trim()}:</Text>
                  <Text style={styles.previewValue}>
                    {reminderEnabled ? reminderTime : t(language, 'alert_off')}
                  </Text>
                </View>

                <View style={styles.previewDivider} />

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>🎯 {t(language, 'priority_label')}:</Text>
                  <PriorityChip priority={priority.toUpperCase() as any} size="sm" />
                </View>

                {repeatMonthly && (
                  <>
                    <View style={styles.previewDivider} />
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>🔁 Repeat:</Text>
                      <Text style={[styles.previewValue, { color: colors.primaryOrange, fontWeight: '700' }]}>
                        Daily 30 Days 👑
                      </Text>
                    </View>
                  </>
                )}

                {description.trim() ? (
                  <>
                    <View style={styles.previewDivider} />
                    <View style={styles.previewRowCol}>
                      <Text style={styles.previewLabel}>📄 {t(language, 'notes_label')}:</Text>
                      <Text style={styles.previewDescText}>{description.trim()}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </ScrollView>

            {/* Modal Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalEditBtn}
                activeOpacity={0.7}
                onPress={() => setIsConfirmModalVisible(false)}
              >
                <Text style={styles.modalEditBtnText} numberOfLines={1}>
                  {t(language, 'edit_details_btn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, createTaskMutation.isPending && styles.buttonDisabled]}
                activeOpacity={0.85}
                onPress={handleConfirmAndSave}
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText} numberOfLines={1}>
                    {t(language, 'confirm_task_submit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
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
  alertNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginTop: 6,
  },
  alertNoteIcon: {
    fontSize: 18,
  },
  alertNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  boldTime: {
    fontWeight: '800',
    color: colors.primaryOrange,
  },
  saveButton: {
    backgroundColor: colors.primaryOrange,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.surface,
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
  modalSubmitBtn: {
    flex: 1.3,
    height: 46,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    backgroundColor: colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
});

export default AddTaskScreen;
