import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import PriorityChip from './PriorityChip';
import { Task, Priority } from '../types';
import { useAppStore } from '../store';
import { t } from '../i18n';

export interface TaskCardProps {
  task?: Task;
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  priority?: Priority | string;
  showDate?: boolean;
  onPress?: () => void;
  onToggleComplete?: () => void;
  onComplete?: () => void;
  onEditPress?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = (props) => {
  const { language, taskDescriptions } = useAppStore();
  const taskItem = props.task || (props as any);
  const title = taskItem.title || t(language, 'tasks_count');
  const taskDateStr = taskItem.targetDate || taskItem.date;
  const description =
    taskItem.description ||
    (taskItem as any).notes ||
    taskDescriptions[taskItem.id] ||
    taskDescriptions[`${title}_${taskDateStr}`] ||
    taskDescriptions[title] ||
    '';
  const time = taskItem.deadlineTime || taskItem.time || taskItem.reminderTime || '06:00 PM';
  const priority = taskItem.priority || 'MEDIUM';
  const completed = Boolean(taskItem.completed || taskItem.confirmationStatus === 'COMPLETED');
  const isMissed = taskItem.confirmationStatus === 'MISSED';
  const showDateBadge = props.showDate || Boolean(taskDateStr && props.showDate !== false);

  const handleToggle = props.onToggleComplete || props.onComplete;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.card,
        completed && styles.cardCompleted,
        isMissed && styles.cardMissed,
      ]}
      onPress={props.onPress}
    >
      <View style={styles.topRow}>
        {/* Checkbox */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.checkbox, completed && styles.checkboxCompleted]}
          onPress={handleToggle}
        >
          {completed ? <Text style={styles.checkIcon}>✓</Text> : null}
        </TouchableOpacity>

        {/* Title & Deadline */}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              completed && styles.titleCompleted,
              isMissed && styles.titleMissed,
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>

          <View style={styles.metaRow}>
            {showDateBadge && taskDateStr ? (
              <Text style={styles.scheduledDateBadge}>
                📅 {taskDateStr}
              </Text>
            ) : null}
            <Text style={styles.deadlineBadge}>⏰ {t(language, 'deadline_label')} {time}</Text>
          </View>

          {description ? (
            <Text style={styles.descPreview} numberOfLines={2}>
              📝 {description}
            </Text>
          ) : null}
        </View>

        {/* Priority Badge & Chevron */}
        <View style={styles.priorityWrap}>
          <PriorityChip priority={priority} size="sm" />
          <Text style={styles.chevronIcon}>›</Text>
        </View>
      </View>

      {/* Focused Alert Indicator & Edit Action */}
      <View style={styles.alertBar}>
        <View style={styles.alertBarLeft}>
          <Text style={styles.alertBarIcon}>🔔</Text>
          <Text style={styles.alertBarText}>
            {t(language, 'task_card_alert_set')}: <Text style={styles.alertBarTime}>{time}</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editPillBtn}
          activeOpacity={0.7}
          onPress={() => {
            if (props.onEditPress) {
              props.onEditPress();
            } else if (props.onPress) {
              props.onPress();
            }
          }}
        >
          <Text style={styles.editPillBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card || 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompleted: {
    opacity: 0.75,
    backgroundColor: '#F8FAF7',
    borderColor: colors.softGreen,
  },
  cardMissed: {
    borderColor: colors.softRed,
    backgroundColor: '#FFF8F8',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: colors.successGreen,
    borderColor: colors.successGreen,
  },
  checkIcon: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  titleMissed: {
    color: colors.urgentRed,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  scheduledDateBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  deadlineBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#FFF9ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  descPreview: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    lineHeight: 16,
  },
  priorityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevronIcon: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: -2,
  },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9F0',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE8D1',
  },
  alertBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  alertBarIcon: {
    fontSize: 13,
  },
  alertBarText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  alertBarTime: {
    color: colors.primary,
    fontWeight: '800',
  },
  editPillBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EBD8B3',
  },
  editPillBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
});

export default TaskCard;
