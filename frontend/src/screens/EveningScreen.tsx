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
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { useTodayTasks, useCompleteTask, useWeeklyProgress } from '../hooks';
import StreakCard from '../components/StreakCard';
import PriorityChip from '../components/PriorityChip';

export const EveningScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, incrementStreakToday, streak, user, isGuest } = useAppStore();
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

  const missedCount = (tasks || []).filter((task) => {
    const local = taskStatusMap[task.id];
    if (local) return local === 'MISSED';
    return task.confirmationStatus === 'MISSED';
  }).length;

  // A task is "pending" if it has no local mark and no persisted status
  const pendingCount = (tasks || []).filter((task) => {
    const local = taskStatusMap[task.id];
    if (local) return false; // already marked locally
    if (task.completed || task.confirmationStatus === 'COMPLETED') return false;
    if (task.confirmationStatus === 'MISSED') return false;
    return true;
  }).length;

  const hasAnyMissed = missedCount > 0;
  const allTasksHandled = totalTasks > 0 && pendingCount === 0;
  // Button enabled only when ALL tasks are handled AND none are missed
  const isAllTasksCompleted = allTasksHandled && !hasAnyMissed;
  const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const handleMark = (taskId: string, status: 'COMPLETED' | 'MISSED') => {
    const existing = taskStatusMap[taskId];
    // Once marked as MISSED, cannot be changed back to COMPLETED
    if (existing === 'MISSED' && status === 'COMPLETED') {
      return;
    }

    setTaskStatusMap((prev) => ({ ...prev, [taskId]: status }));
    if (status === 'MISSED') {
      useAppStore.getState().resetStreakToday();
    } else if (status === 'COMPLETED') {
      useAppStore.getState().incrementStreakToday();
    }
    completeMutation.mutate({
      id: taskId,
      completed: status === 'COMPLETED',
      status,
    });
  };

  const handleFinishReview = () => {
    incrementStreakToday();
    setReviewed(true);
  };

  const handlePlanTomorrow = () => {
    navigation.navigate('AddTask');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
      >
        {/* Night Forest Green Header matching Mockup Screen 7 */}
        <View style={styles.nightHeaderCard}>
          <Text style={styles.nightMoonIcon}>🌙</Text>
          <Text style={styles.nightHeaderTitle}>
            {user?.name || (user?.email ? user.email.split('@')[0] : t(language, 'evening_title'))}
          </Text>
          <Text style={styles.nightHeaderSub}>
            {t(language, 'evening_subtitle')}
          </Text>
        </View>

        {/* Tasks Overview Card with Completed & Not Completed boxes */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>{t(language, 'tab_today_window')}</Text>
          <View style={styles.overviewBoxesRow}>
            <View style={styles.completedBox}>
              <View style={styles.completedIconCircle}>
                <Text style={styles.completedIconText}>✓</Text>
              </View>
              <Text style={styles.completedBoxNum}>{completedCount}</Text>
              <Text style={styles.completedBoxLabel}>{t(language, 'stat_done')}</Text>
            </View>

            <View style={styles.missedBox}>
              <View style={styles.missedIconCircle}>
                <Text style={styles.missedIconText}>✕</Text>
              </View>
              <Text style={styles.missedBoxNum}>{Math.max(0, totalTasks - completedCount)}</Text>
              <Text style={styles.missedBoxLabel}>{t(language, 'stat_missed')}</Text>
            </View>
          </View>
        </View>

        {/* Daily Progress Bar */}
        <View style={styles.progressCardEvening}>
          <Text style={styles.progressTitleEvening}>{t(language, 'progHead') || t(language, 'progress_title')}</Text>
          <View style={styles.progressBarTrackEvening}>
            <View style={[styles.progressBarFillEvening, { width: `${percentage}%` }]} />
          </View>
          <View style={styles.progressLabelsEvening}>
            <Text style={styles.progressCountEvening}>{completedCount} / {totalTasks} {t(language, 'ratio_completed')}</Text>
            <Text style={styles.progressPercentEvening}>{percentage}%</Text>
          </View>
        </View>

        {/* Current Streak */}
        <View style={styles.streakCardEvening}>
          <View style={styles.streakFlameEvening}>
            <Text style={{ fontSize: 22 }}>🔥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakCountEvening}>{streak || 1} {t(language, 'days_unit')}</Text>
            <Text style={styles.streakSubEvening}>{t(language, 'streak_label')}</Text>
          </View>
        </View>

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
                    <View style={{ flex: 1, minWidth: 0 }}>
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
                      activeOpacity={isMissed ? 1 : 0.8}
                      disabled={isMissed}
                      style={[
                        styles.actionBtn,
                        styles.btnDone,
                        isDone && styles.btnDoneActive,
                        isMissed && { opacity: 0.35, borderColor: '#CBD5E1', backgroundColor: '#F1F5F9' },
                      ]}
                      onPress={() => handleMark(item.id, 'COMPLETED')}
                    >
                      <Text style={[styles.actionBtnText, isDone && styles.actionBtnTextActive, isMissed && { color: '#94A3B8' }]}>
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

        {/* Empty state when no tasks today */}
        {!isLoading && (!tasks || tasks.length === 0) && (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>☀️</Text>
            <Text style={styles.emptyTitle}>
              {language === 'hi' ? 'Aaj koi task pending nahi hai' : 'No tasks pending today'}
            </Text>
            <Text style={styles.emptySub}>
              {language === 'hi'
                ? 'Aane wale din ke liye abhi naya kaam set karein aur streak banayein.'
                : 'Plan ahead for tomorrow to build your streak.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyPlanBtn}
              onPress={handlePlanTomorrow}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyPlanBtnText}>
                {language === 'hi' ? '+ Kal Ke Kaam Plan Karein' : '+ Plan Tomorrow'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Review Action Buttons */}
        {!reviewed ? (
          (tasks && tasks.length > 0) && (
            <TouchableOpacity
              style={[
                styles.reviewButton,
                !isAllTasksCompleted && styles.reviewButtonDisabled,
              ]}
              activeOpacity={isAllTasksCompleted ? 0.85 : 1}
              disabled={!isAllTasksCompleted}
              onPress={handleFinishReview}
            >
              <LinearGradient
                colors={isAllTasksCompleted ? ['#0D5C3A', '#15803D'] : ['#94A3B8', '#94A3B8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reviewGradient}
              >
                <Text style={styles.reviewButtonText}>
                  {!allTasksHandled
                    ? (language === 'hi' ? '⏳ Sabhi Tasks Mark Karein' : '⏳ Mark All Tasks First')
                    : hasAnyMissed
                    ? (language === 'hi' ? '❌ Missed Tasks — Button Disabled' : '❌ Missed Tasks — Disabled')
                    : (language === 'hi' ? '✅ Aaj Ka Review Poora Hua' : t(language, 'finish_confirmation'))}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉 🙌 ✨</Text>
            <Text style={styles.celebrationTitle}>{t(language, 'review_done_title')}</Text>
            <Text style={styles.celebrationText}>{t(language, 'review_done_sub')}</Text>

            {/* Streak achievement pill */}
            <View style={styles.celebrationStreakBadge}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={styles.celebrationStreakText}>
                {language === 'hi' ? `Zabardast! Aapka Streak: ${streak || 1} Din!` : `Awesome! Your Streak: ${streak || 1} Days!`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.planTomorrowButton}
              activeOpacity={0.85}
              onPress={handlePlanTomorrow}
            >
              <LinearGradient
                colors={['#0D5C3A', '#15803D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.planTomorrowGradient}
              >
                <Text style={styles.planTomorrowText}>
                  {language === 'hi' ? '+ Kal Ke Kaam Plan Karein' : '+ Plan Tomorrow'}
                </Text>
              </LinearGradient>
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
  nightHeaderCard: {
    backgroundColor: '#083B25',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#083B25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  nightMoonIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  nightHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  nightHeaderSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A7F3D0',
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  overviewBoxesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  completedBox: {
    flex: 1,
    backgroundColor: '#EBFBF3',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  completedIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0D5C3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  completedBoxNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0D5C3A',
  },
  completedBoxLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  missedBox: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  missedIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  missedBoxNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#DC2626',
  },
  missedBoxLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  progressCardEvening: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  progressTitleEvening: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBarTrackEvening: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EBFBF3',
    overflow: 'hidden',
  },
  progressBarFillEvening: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#0D5C3A',
  },
  progressLabelsEvening: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCountEvening: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  progressPercentEvening: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D5C3A',
  },
  streakCardEvening: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakFlameEvening: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  streakCountEvening: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#92400E',
  },
  streakSubEvening: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 1,
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
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
    elevation: 4,
    shadowColor: colors.primaryPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  reviewButtonDisabled: {
    opacity: 0.65,
    elevation: 0,
    shadowOpacity: 0,
  },
  reviewGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  reviewButtonText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '800',
  },
  celebrationCard: {
    backgroundColor: '#FFF9ED',
    borderWidth: 1.5,
    borderColor: colors.primaryPurple,
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
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
    shadowColor: colors.primaryPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  planTomorrowGradient: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  planTomorrowText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '800',
  },
  celebrationStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
    marginVertical: 4,
  },
  celebrationStreakText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 280,
  },
  emptyPlanBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
  },
  emptyPlanBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
});

export default EveningScreen;
