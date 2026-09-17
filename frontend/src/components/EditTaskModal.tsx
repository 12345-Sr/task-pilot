import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { Task, Priority } from '../types';
import { useAppStore } from '../store';
import { useUpdateTask } from '../hooks';
import TimeSliderPicker, { isTimeInPast, getNextValidFutureTime } from './TimeSliderPicker';
import DatePickerCard from './DatePickerCard';
import PriorityChip from './PriorityChip';
import NotificationService from '../services/notifications/notification.service';

interface EditTaskModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSuccess?: (updatedTask: Task) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  visible,
  task,
  onClose,
  onSuccess,
}) => {
  const { language, taskDescriptions, setTaskDescription } = useAppStore();
  const updateMutation = useUpdateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [reminderTime, setReminderTime] = useState('06:00 PM');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [priority, setPriority] = useState<Priority>('medium');
  const [errorMsg, setErrorMsg] = useState('');

  // Populate fields whenever the selected task changes
  useEffect(() => {
    if (!task) return;

    setTitle(task.title || '');
    const taskDate = task.targetDate || task.date || '';
    setSelectedDate(taskDate);

    const initialDesc =
      task.description ||
      (task as any).notes ||
      taskDescriptions[task.id] ||
      taskDescriptions[`${task.title}_${taskDate}`] ||
      taskDescriptions[task.title] ||
      '';
    setDescription(initialDesc);

    const initialTime =
      task.deadlineTime || task.time || task.reminderTime || '06:00 PM';
    setReminderTime(initialTime);

    setReminderEnabled(Boolean(task.deadlineTime || task.time || task.reminderTime));

    const p = String(task.priority || 'MEDIUM').toUpperCase();
    if (p === 'URGENT' || p === 'HIGH' || p === 'ZAROORI' || p === 'IMPORTANT') {
      setPriority('ZAROORI');
    } else if (p === 'NORMAL' || p === 'LOW') {
      setPriority('NORMAL');
    } else {
      setPriority('MEDIUM');
    }

    setErrorMsg('');
  }, [task, visible]);

  if (!task) return null;

  const handleSave = async () => {
    setErrorMsg('');
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg(
        language === 'hi'
          ? 'Kripya kaam ka naam likhein'
          : 'Please enter a task title'
      );
      return;
    }

    // Past time validation for Today tasks
    if (reminderEnabled) {
      const parts = reminderTime.replace(/am|pm/gi, '').trim().split(':');
      const isPM = /pm/i.test(reminderTime);
      const hStr = parts[0] || '09';
      const mStr = parts[1] || '00';
      if (isTimeInPast(hStr, mStr, isPM ? 'PM' : 'AM', selectedDate)) {
        setErrorMsg(
          language === 'hi'
            ? '⚠️ Beeta hua samay nahi chuna ja sakta. Kripya future time chunein.'
            : '⚠️ Cannot schedule a past time for today. Please pick a future time.'
        );
        return;
      }
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc) {
      setTaskDescription(task.id, trimmedDesc);
      setTaskDescription(`${trimmedTitle}_${selectedDate}`, trimmedDesc);
      setTaskDescription(trimmedTitle, trimmedDesc);
    }

    updateMutation.mutate(
      {
        id: task.id,
        title: trimmedTitle,
        description: trimmedDesc,
        notes: trimmedDesc,
        targetDate: selectedDate,
        date: selectedDate,
        time: reminderEnabled ? reminderTime : undefined,
        deadlineTime: reminderEnabled ? reminderTime : undefined,
        reminderTime: reminderEnabled ? reminderTime : undefined,
        priority: priority.toUpperCase() as any,
      } as any,
      {
        onSuccess: async (updated: any) => {
          // Reschedule alert notifications
          if (reminderEnabled) {
            await NotificationService.cancelTaskAlerts(task.id);
            await NotificationService.scheduleTaskAlerts(
              trimmedTitle,
              selectedDate,
              reminderTime,
              task.id
            );
          } else {
            await NotificationService.cancelTaskAlerts(task.id);
          }

          Alert.alert(
            '✅',
            language === 'hi'
              ? 'Kaam safalta-poorvak update ho gaya!'
              : 'Task updated successfully!'
          );

          onSuccess?.(updated || { ...task, title: trimmedTitle, time: reminderTime });
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err?.message || 'Failed to update task');
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.editIconBadge}>
                <Text style={styles.editIconBadgeText}>✏️</Text>
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {language === 'hi' ? 'Kaam Edit Karein' : 'Edit Task Details'}
                </Text>
                <Text style={styles.modalSubTitle}>
                  {language === 'hi'
                    ? 'Time (AM/PM), taareekh aur zaroori details badlein'
                    : 'Modify time (AM/PM), date, priority & notes'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Form Scroll Area */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* 1. Title Input */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Kaam Ka Naam' : 'Task Title'} *
              </Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={language === 'hi' ? 'Kaam ka naam likhein...' : 'Enter task title...'}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* 2. Priority Selection */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Prathmikta (Priority)' : 'Priority Level'}
              </Text>
              <View style={styles.priorityRow}>
                {(['ZAROORI', 'MEDIUM', 'NORMAL'] as Priority[]).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      activeOpacity={0.8}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.priorityChoiceBtn,
                        isSelected && styles.priorityChoiceBtnSelected,
                      ]}
                    >
                      <PriorityChip priority={p} selected={isSelected} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Target Date Picker Card */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Taareekh (Date)' : 'Target Date'}
              </Text>
              <DatePickerCard
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                language={language}
              />
            </View>

            {/* 4. Reminder Time & Clock with Past-Time Prevention */}
            <View style={styles.fieldBlock}>
              <View style={styles.reminderToggleRow}>
                <View>
                  <Text style={styles.fieldLabel}>
                    {language === 'hi' ? 'Deadline Time & Alert' : 'Deadline Time & Alert'}
                  </Text>
                  <Text style={styles.reminderToggleSub}>
                    {language === 'hi'
                      ? 'AM / PM ya samay yahan badlein'
                      : 'Change AM / PM or alert hours'}
                  </Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {reminderEnabled && (
                <View style={styles.clockBox}>
                  <TimeSliderPicker
                    value={reminderTime}
                    onChange={setReminderTime}
                    language={language}
                    selectedDate={selectedDate}
                  />
                </View>
              )}
            </View>

            {/* 5. Notes / Description */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                {language === 'hi' ? 'Notes / Vivaran' : 'Notes / Description'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  language === 'hi'
                    ? 'Koi zaroori details ya steps yahan likhein...'
                    : 'Add extra details, checklist, or instructions...'
                }
                placeholderTextColor="#94A3B8"
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.cancelBtnText}>
                {language === 'hi' ? 'Radd Karein' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.88}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {language === 'hi' ? 'Badlaav Save Karein 💾' : 'Save Changes 💾'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditTaskModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF7EC',
    borderWidth: 1,
    borderColor: '#EBD8B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconBadgeText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorBoxText: {
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '700',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 70,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityChoiceBtn: {
    flex: 1,
  },
  priorityChoiceBtnSelected: {
    transform: [{ scale: 1.02 }],
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reminderToggleSub: {
    fontSize: 11,
    color: '#64748B',
  },
  clockBox: {
    marginTop: 4,
  },
  modalActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary, // #C5A059 Champagne Camel Gold
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
