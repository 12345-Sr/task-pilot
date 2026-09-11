import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { useTodayTasks, useCompleteTask, useWeeklyProgress } from '../hooks';
import StreakCard from '../components/StreakCard';
import PriorityChip from '../components/PriorityChip';

export const EveningScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language } = useAppStore();
  const { data: tasks, isLoading, refetch } = useTodayTasks();
  const { data: progress } = useWeeklyProgress();
  const completeMutation = useCompleteTask();

  // Local state for immediate ✓ / ✗ taps
  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, 'COMPLETED' | 'MISSED'>>({});
  const [reviewed, setReviewed] = useState(false);

  const totalTasks = (tasks || []).length;
  const completedCount = (tasks || []).filter((task) => {
    const local = taskStatusMap[task.id];
    if (local) return local === 'COMPLETED';
    return task.completed || task.confirmationStatus === 'COMPLETED';
  }).length;

  const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleMark = (taskId: string, status: 'COMPLETED' | 'MISSED') => {
    setTaskStatusMap((prev) => ({ ...prev, [taskId]: status }));
    completeMutation.mutate({
      id: taskId,
      completed: status === 'COMPLETED',
      status,
    });
  };

  const handleFinishReview = () => {
    setReviewed(true);
  };

  const handlePlanTomorrow = () => {
    navigation.navigate('AddTask');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🌙 {language === 'hi' ? 'SHAAM KA CHECK' : t(language, 'evening_title')}</Text>
          <Text style={styles.subtitle}>{language === 'hi' ? 'Aaj kaisa raha?' : t(language, 'evening_subtitle')}</Text>
        </View>

        {/* Big Progress Ratio Card */}
        <View style={styles.ratioCard}>
          <View style={styles.ratioCircle}>
            <Text style={styles.ratioText}>
              {completedCount}/{totalTasks}
            </Text>
            <Text style={styles.ratioLabel}>{t(language, 'stat_done')}</Text>
          </View>

          <View style={styles.ratioDetails}>
            <Text style={styles.ratioPercentage}>{percentage}% {t(language, 'ratio_completed')}</Text>
            <Text style={styles.ratioMotto}>
              {percentage === 100
                ? t(language, 'ratio_motto_100')
                : percentage >= 50
                ? t(language, 'ratio_motto_50')
                : t(language, 'ratio_motto_0')}
            </Text>
          </View>
        </View>

        {/* Streak Flame Banner */}
        <StreakCard
          streakCount={progress?.streak ?? 0}
          isConsistentToday={completedCount > 0}
        />

        {/* Checklist Section with ✓ (Hua) and ✗ (Nahi Hua) buttons */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t(language, 'confirm_section_title')}</Text>
          <Text style={styles.sectionHelp}>{t(language, 'confirm_section_sub')}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primaryOrange} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.confirmList}>
            {(tasks || []).map((item) => {
              const currentStatus =
                taskStatusMap[item.id] ||
                (item.completed || item.confirmationStatus === 'COMPLETED'
                  ? 'COMPLETED'
                  : item.confirmationStatus === 'MISSED'
                  ? 'MISSED'
                  : null);

              const isDone = currentStatus === 'COMPLETED';
              const isMissed = currentStatus === 'MISSED';

              return (
                <View key={item.id} style={styles.confirmCard}>
                  <View style={styles.taskInfoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                        {item.title}
                      </Text>
                      <Text style={styles.taskTime}>
                        ⏰ {t(language, 'deadline_label')} {item.deadlineTime || item.time || item.reminderTime || '06:00 PM'}
                      </Text>
                    </View>
                    <PriorityChip priority={item.priority} size="sm" />
                  </View>

                  {/* One-tap Confirmation Buttons: ✓ Hua vs ✗ Nahi Hua */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.actionBtn, styles.btnDone, isDone && styles.btnDoneActive]}
                      onPress={() => handleMark(item.id, 'COMPLETED')}
                    >
                      <Text style={[styles.actionBtnText, isDone && styles.actionBtnTextActive]}>
                        {t(language, 'mark_hua')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.actionBtn,
                        styles.btnMissed,
                        isMissed && styles.btnMissedActive,
                      ]}
                      onPress={() => handleMark(item.id, 'MISSED')}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          styles.btnMissedText,
                          isMissed && styles.actionBtnTextActive,
                        ]}
                      >
                        {t(language, 'mark_nahi_hua')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Review Action Buttons */}
        {!reviewed ? (
          <TouchableOpacity
            style={styles.reviewButton}
            activeOpacity={0.85}
            onPress={handleFinishReview}
          >
            <Text style={styles.reviewButtonText}>{t(language, 'finish_confirmation')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉 🙌 ✨</Text>
            <Text style={styles.celebrationTitle}>{t(language, 'review_done_title')}</Text>
            <Text style={styles.celebrationText}>{t(language, 'review_done_sub')}</Text>

            <TouchableOpacity
              style={styles.planTomorrowButton}
              activeOpacity={0.85}
              onPress={handlePlanTomorrow}
            >
              <Text style={styles.planTomorrowText}>
                {language === 'hi' ? 'Kal ke kaam dekhein →' : t(language, 'set_tomorrow_tasks_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  ratioCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  ratioCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.softGreen,
    borderWidth: 3,
    borderColor: colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratioText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.successGreen,
  },
  ratioLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.successGreen,
    textTransform: 'uppercase',
  },
  ratioDetails: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  ratioPercentage: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  ratioMotto: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionHelp: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  confirmList: {
    gap: 12,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  taskInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  btnDone: {
    borderColor: colors.successGreen,
    backgroundColor: colors.softGreen,
  },
  btnDoneActive: {
    backgroundColor: colors.successGreen,
  },
  btnMissed: {
    borderColor: colors.urgentRed,
    backgroundColor: colors.softRed,
  },
  btnMissedActive: {
    backgroundColor: colors.urgentRed,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.successGreen,
  },
  btnMissedText: {
    color: colors.urgentRed,
  },
  actionBtnTextActive: {
    color: colors.white,
  },
  reviewButton: {
    backgroundColor: colors.primaryOrange,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    elevation: 4,
  },
  reviewButtonText: {
    ...typography.button,
    color: colors.white,
  },
  celebrationCard: {
    backgroundColor: '#FFF9ED',
    borderWidth: 1.5,
    borderColor: colors.primaryOrange,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  celebrationEmoji: {
    fontSize: 36,
  },
  celebrationTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  celebrationText: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  planTomorrowButton: {
    backgroundColor: colors.primaryOrange,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  planTomorrowText: {
    ...typography.button,
    color: colors.white,
  },
});

export default EveningScreen;
