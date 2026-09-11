import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t, formatLocalizedDate } from '../i18n';
import {
  useTodayTasks,
  useUpdateTask,
  useCompleteTask,
  useDeleteTask,
  useRepeatTaskMonthly,
} from '../hooks';
import PriorityChip from '../components/PriorityChip';
import ConfirmDialog from '../components/ConfirmDialog';
import CalendarIcon from '../components/CalendarIcon';
import EditTaskModal from '../components/EditTaskModal';
import { Task } from '../types';

export const TaskDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, isPremium, setPaywallVisible, taskDescriptions, setTaskDescription } = useAppStore();
  const { taskId } = route.params || {};

  const { data: tasks, isLoading } = useTodayTasks();
  const updateMutation = useUpdateTask();
  const completeMutation = useCompleteTask();
  const deleteMutation = useDeleteTask();
  const repeatMonthlyMutation = useRepeatTaskMonthly();

  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [confirmRepeatVisible, setConfirmRepeatVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const task: Task | undefined = (tasks || []).find((t) => t.id === taskId);

  const taskTitle = task?.title || '';
  const taskDate = task?.targetDate || task?.date || '';
  const resolvedDesc =
    task?.description ||
    (task as any)?.notes ||
    taskDescriptions[task?.id || ''] ||
    taskDescriptions[`${taskTitle}_${taskDate}`] ||
    taskDescriptions[taskTitle] ||
    '';

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(resolvedDesc);

  useEffect(() => {
    if (resolvedDesc) {
      setEditedNotes(resolvedDesc);
    }
  }, [resolvedDesc]);

  const handleSaveNotes = () => {
    if (!task) return;
    const trimmed = editedNotes.trim();
    setTaskDescription(task.id, trimmed);
    if (taskTitle) {
      setTaskDescription(`${taskTitle}_${taskDate}`, trimmed);
      setTaskDescription(taskTitle, trimmed);
    }
    updateMutation.mutate({
      id: task.id,
      description: trimmed,
    } as any);
    setIsEditingNotes(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>{t(language, 'task_not_found')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnAction}>
            <Text style={styles.backBtnActionText}>{t(language, 'go_back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isDone = Boolean(task.completed || task.confirmationStatus === 'COMPLETED');
  const isMissed = task.confirmationStatus === 'MISSED';

  const handleToggleComplete = () => {
    completeMutation.mutate(
      { id: task.id, completed: !isDone, status: !isDone ? 'COMPLETED' : undefined },
      {
        onSuccess: () => {
          // Success
        },
      }
    );
  };

  const handleMarkTaskLeft = () => {
    if (isMissed) {
      completeMutation.mutate({ id: task.id, completed: false, status: undefined });
    } else {
      completeMutation.mutate({ id: task.id, completed: false, status: 'MISSED' });
    }
  };

  const handleRepeatMonthlyPress = () => {
    if (!isPremium) {
      setPaywallVisible(true);
      return;
    }
    setConfirmRepeatVisible(true);
  };

  const handleConfirmRepeatMonthly = () => {
    repeatMonthlyMutation.mutate(task.id, {
      onSuccess: () => {
        setConfirmRepeatVisible(false);
        Alert.alert('🎉', t(language, 'repeat_monthly_success'));
      },
      onError: (err: any) => {
        setConfirmRepeatVisible(false);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Could not schedule monthly task.';
        Alert.alert('Notice', msg);
      },
    });
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(task.id, {
      onSuccess: () => {
        setConfirmDeleteVisible(false);
        navigation.goBack();
      },
    });
  };

  const rawDate = task.targetDate || task.date;
  let formattedDateDisplay = t(language, 'today_choice');
  if (rawDate) {
    const trimmed = rawDate.trim().toLowerCase();
    if (trimmed === 'kal' || trimmed === 'tomorrow') {
      formattedDateDisplay = t(language, 'tomorrow_choice');
    } else if (trimmed !== 'aaj' && trimmed !== 'today') {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        formattedDateDisplay = formatLocalizedDate(d, language);
      } else {
        formattedDateDisplay = rawDate;
      }
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {language === 'en' || language === 'hi' ? 'Reminder Detail' : language === 'mr' ? 'कामाचा तपशील' : language === 'bn' ? 'কাজের বিবরণ' : language === 'ta' ? 'பணி விவரங்கள்' : language === 'te' ? 'పని వివరాలు' : language === 'gu' ? 'કામની વિગતો' : language === 'pa' ? 'ਕੰਮ ਦਾ ਵੇਰਵਾ' : 'Reminder Detail'}
        </Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            onPress={() => setEditModalVisible(true)}
            style={styles.editTopBtn}
            accessibilityRole="button"
            accessibilityLabel="Edit Task"
          >
            <Text style={styles.editTopBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setConfirmDeleteVisible(true)}
            style={styles.deleteTopBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete Task"
          >
            <Text style={styles.deleteIconText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        {/* Status Pill & Priority Row */}
        <View style={styles.metaRow}>
          <PriorityChip priority={task.priority} />
          <View
            style={[
              styles.statusBadge,
              isDone
                ? styles.statusBadgeDone
                : isMissed
                ? styles.statusBadgeMissed
                : styles.statusBadgePending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isDone
                  ? styles.statusTextDone
                  : isMissed
                  ? styles.statusTextMissed
                  : styles.statusTextPending,
              ]}
            >
              {isDone
                ? `✓ ${t(language, 'stat_done')}`
                : isMissed
                ? `✗ ${t(language, 'stat_missed')}`
                : `⏳ ${t(language, 'stat_pending')}`}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.taskTitle, isDone && styles.taskTitleCompleted]}>
          {task.title}
        </Text>

        {/* Schedule Info Box */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <CalendarIcon date={rawDate} size={36} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t(language, 'date_label')}</Text>
              <Text style={styles.infoValue}>{formattedDateDisplay}</Text>
            </View>
          </View>

          {(task.reminderTime || task.time || task.deadlineTime) && (
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }]}>
              <View style={styles.iconContainer}>
                <Text style={styles.infoIcon}>⏰</Text>
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{t(language, 'deadline_reminder_label')}</Text>
                <Text style={styles.infoValue}>{task.reminderTime || task.time || task.deadlineTime}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Full Task Edit Action Card (AM/PM, Time, Date, Title, Priority) */}
        <TouchableOpacity
          style={styles.editFullTaskCard}
          activeOpacity={0.85}
          onPress={() => setEditModalVisible(true)}
        >
          <View style={styles.editFullTaskLeft}>
            <View style={styles.editEmblemWrap}>
              <Text style={{ fontSize: 18 }}>✏️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.editFullTaskTitle}>
                {language === 'hi' ? 'Kaam Ki Details & Time Badlein' : 'Edit Task & Time Details'}
              </Text>
              <Text style={styles.editFullTaskSub}>
                {language === 'hi'
                  ? 'AM/PM, time, taareekh ya naam badalne ke liye tap karein'
                  : 'Tap to change AM/PM, hours, date, priority or notes'}
              </Text>
            </View>
          </View>
          <Text style={styles.editFullTaskArrow}>→</Text>
        </TouchableOpacity>

        {/* Description / Notes Card */}
        <View style={styles.notesCard}>
          <View style={styles.notesHeaderRow}>
            <Text style={styles.notesHeader}>📄 {t(language, 'notes_label')}</Text>
            <TouchableOpacity
              onPress={() => {
                if (isEditingNotes) {
                  handleSaveNotes();
                } else {
                  setEditedNotes(resolvedDesc);
                  setIsEditingNotes(true);
                }
              }}
              activeOpacity={0.7}
              style={styles.notesActionBtn}
            >
              <Text style={styles.notesActionBtnText}>
                {isEditingNotes
                  ? (language === 'hi' ? '✓ Save' : '✓ Save')
                  : resolvedDesc
                  ? (language === 'hi' ? 'Badlein ✏️' : 'Edit ✏️')
                  : (language === 'hi' ? '+ Note Jodein' : '+ Add Note')}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingNotes ? (
            <View style={styles.notesEditWrap}>
              <TextInput
                style={styles.notesInput}
                value={editedNotes}
                onChangeText={setEditedNotes}
                placeholder={t(language, 'notes_placeholder')}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                autoFocus
              />
              <View style={styles.notesEditButtons}>
                <TouchableOpacity
                  style={styles.notesCancelBtn}
                  onPress={() => {
                    setEditedNotes(resolvedDesc);
                    setIsEditingNotes(false);
                  }}
                >
                  <Text style={styles.notesCancelText}>{language === 'hi' ? 'Radd' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notesSaveBtn}
                  onPress={handleSaveNotes}
                >
                  <Text style={styles.notesSaveText}>{language === 'hi' ? 'Save' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={[styles.notesBody, !resolvedDesc && styles.notesEmpty]}>
              {resolvedDesc ? resolvedDesc : t(language, 'no_description')}
            </Text>
          )}
        </View>

        {/* Toggle Complete CTA */}
        <TouchableOpacity
          style={[
            styles.toggleActionButton,
            isDone ? styles.buttonIncomplete : styles.buttonComplete,
          ]}
          activeOpacity={0.85}
          onPress={handleToggleComplete}
          disabled={completeMutation.isPending}
        >
          {completeMutation.isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.toggleActionText}>
              {isDone
                ? t(language, 'mark_incomplete_btn')
                : language === 'hi'
                ? '✓ Kaam Ho Gaya'
                : t(language, 'mark_complete_btn')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Task Left / Could Not Complete Button */}
        <TouchableOpacity
          style={[
            styles.taskLeftButton,
            isMissed && styles.taskLeftButtonActive,
          ]}
          activeOpacity={0.85}
          onPress={handleMarkTaskLeft}
          disabled={completeMutation.isPending}
        >
          {completeMutation.isPending ? (
            <ActivityIndicator color={isMissed ? colors.surface : '#DC2626'} />
          ) : (
            <Text style={[styles.taskLeftText, isMissed && styles.taskLeftTextActive]}>
              {isMissed ? t(language, 'task_left_marked_btn') : t(language, 'task_left_btn')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Repeat Monthly (PRO) Button */}
        <TouchableOpacity
          style={styles.repeatMonthlyButton}
          activeOpacity={0.85}
          onPress={handleRepeatMonthlyPress}
          disabled={repeatMonthlyMutation.isPending}
        >
          {repeatMonthlyMutation.isPending ? (
            <ActivityIndicator color="#92400E" />
          ) : (
            <View style={styles.repeatMonthlyRow}>
              <Text style={styles.repeatMonthlyText}>
                {t(language, 'repeat_monthly_btn')}
              </Text>
              {!isPremium && (
                <View style={styles.proPillBadge}>
                  <Text style={styles.proPillBadgeText}>PRO</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Secondary Delete Button */}
        <TouchableOpacity
          style={styles.deleteOutlineButton}
          activeOpacity={0.7}
          onPress={() => setConfirmDeleteVisible(true)}
        >
          <Text style={styles.deleteOutlineText}>{t(language, 'delete_task_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Repeat Monthly Confirmation Modal */}
      <ConfirmDialog
        visible={confirmRepeatVisible}
        title={t(language, 'repeat_monthly_confirm_title')}
        message={t(language, 'repeat_monthly_confirm_msg')}
        confirmText="Haan, Schedule Karein"
        cancelText={t(language, 'cancel')}
        confirmColor={colors.primaryOrange}
        onConfirm={handleConfirmRepeatMonthly}
        onCancel={() => setConfirmRepeatVisible(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title={t(language, 'delete_confirm_title')}
        message={t(language, 'delete_confirm_msg')}
        confirmText={t(language, 'confirm_yes_delete')}
        cancelText={t(language, 'cancel')}
        confirmColor={colors.urgentRed}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteVisible(false)}
      />

      {/* Task Full Edit Modal (AM/PM, Time, Title, Priority, Date, Notes) */}
      <EditTaskModal
        visible={editModalVisible}
        task={task}
        onClose={() => setEditModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  notFoundText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  backBtnAction: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primaryOrange,
    borderRadius: radius.md,
  },
  backBtnActionText: {
    ...typography.button,
    color: colors.surface,
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  topBarTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FDF7EC',
    borderWidth: 1,
    borderColor: '#EBD8B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTopBtnText: {
    fontSize: 16,
  },
  deleteTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconText: {
    fontSize: 18,
  },
  editFullTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FDF9F0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#EBD8B3',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  editFullTaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  editEmblemWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBD8B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editFullTaskTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#825B15',
    marginBottom: 2,
  },
  editFullTaskSub: {
    fontSize: 11.5,
    color: '#9B7426',
    fontWeight: '500',
  },
  editFullTaskArrow: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusBadgeDone: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeMissed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextDone: {
    color: colors.successGreen,
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextMissed: {
    color: '#DC2626',
  },
  taskTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 26,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  infoValue: {
    ...typography.bodyPrimary,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  notesHeader: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesBody: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
    fontWeight: '500',
  },
  notesEmpty: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  notesEditWrap: {
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  notesEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  notesCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  notesCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  notesSaveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  notesSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleActionButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonComplete: {
    backgroundColor: colors.successGreen,
  },
  buttonIncomplete: {
    backgroundColor: colors.primary,
  },
  toggleActionText: {
    ...typography.button,
    color: colors.surface,
  },
  taskLeftButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    marginTop: -spacing.xs,
  },
  taskLeftButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  taskLeftText: {
    ...typography.button,
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
  taskLeftTextActive: {
    color: colors.surface,
  },
  repeatMonthlyButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginTop: -spacing.xs,
  },
  repeatMonthlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  repeatMonthlyText: {
    ...typography.button,
    color: '#92400E',
    fontWeight: '700',
    fontSize: 14,
  },
  proPillBadge: {
    backgroundColor: colors.primaryOrange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  proPillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteOutlineButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.urgentRed,
    marginTop: -spacing.xs,
  },
  deleteOutlineText: {
    ...typography.button,
    color: colors.urgentRed,
    fontSize: 14,
  },
});

export default TaskDetailScreen;
