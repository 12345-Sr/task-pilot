import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography, shadows } from '../theme';
import { useAppStore } from '../store';
import { t, formatLocalizedDate } from '../i18n';
import { useTodayTasks, useCompleteTask, useUserProfile, useSubscription } from '../hooks';
import TaskCard from '../components/TaskCard';
import FreePlanCard from '../components/FreePlanCard';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PaywallModal from '../components/PaywallModal';
import EditTaskModal from '../components/EditTaskModal';
import BrandLogo from '../components/BrandLogo';
import CalendarIcon from '../components/CalendarIcon';
import { PremiumStatusModal } from '../components/PremiumStatusModal';
import { LanguageModal } from '../components/LanguageModal';
import { NotificationService } from '../services/notifications/notification.service';
import { Task } from '../types';

export const TodayScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {
    language,
    isPremium,
    paywallVisible,
    setPaywallVisible,
    setPremiumStatusVisible,
    getFreeUsage,
    setFreeLifetimeCreated,
    streak,
    bestStreak,
    incrementStreakToday,
  } = useAppStore();

  // Increment streak once per day when app is opened
  useEffect(() => {
    incrementStreakToday();
  }, [incrementStreakToday]);
  const { data: user } = useUserProfile();
  useSubscription();
  const { data: tasks, isLoading, refetch, isRefetching } = useTodayTasks();
  const completeMutation = useCompleteTask();


  const [selectedDay, setSelectedDay] = useState<'today' | 'scheduled'>('today');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleToggleTask = (task: Task) => {
    completeMutation.mutate({
      id: task.id,
      completed: !task.completed,
    });
  };

  const handleAddTaskPress = () => {
    const { used: currentFreeUsed } = getFreeUsage();
    if (!isPremium && currentFreeUsed >= 3) {
      NotificationService.sendQuotaLimitNotification(
        language === 'hi' ? '⚠️ Free Tier Limit Pura Ho Gaya' : '⚠️ Free Tier Limit Reached',
        language === 'hi'
          ? 'Aapke 3 free tasks poore ho chuke hain. Naye tasks aur reminder alerts ke liye Pro me upgrade karein.'
          : 'Your free tier is over (3/3 tasks used). Upgrade to Pro to create new tasks and receive reminder alerts.'
      );
      setPaywallVisible(true);
      return;
    }
    navigation.navigate('AddTask');
  };

  // Safe local date resolution for Today
  const getLocalDateIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const todayIso = getLocalDateIso(now);

  // Helper to get sort timestamp for newest tasks first
  const getTaskSortTime = (t: Task): number => {
    if (t.createdAt) {
      const ms = new Date(t.createdAt).getTime();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if ((t as any).createdAtTimestamp) {
      const ts = Number((t as any).createdAtTimestamp);
      if (!isNaN(ts) && ts > 0) return ts;
    }
    if (t.updatedAt) {
      const ms = new Date(t.updatedAt).getTime();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof t.id === 'string' && t.id.startsWith('task_')) {
      const parts = t.id.split('_');
      const ts = parseInt(parts[1], 10);
      if (!isNaN(ts) && ts > 0) return ts;
    }
    const num = parseInt(String(t.id), 10);
    if (!isNaN(num) && num > 0) return num;
    return 0;
  };

  // 1. Today's Tasks Window: Newly added tasks appear above, old tasks go down
  const todayTasks = (tasks || [])
    .filter((task) => {
      const taskDate = task.targetDate || task.date;
      return !taskDate || taskDate === todayIso || (taskDate < todayIso && !task.completed);
    })
    .sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a));

  // 2. Scheduled Tasks Window
  const scheduledTasks = (tasks || [])
    .filter((task) => {
      const taskDate = task.targetDate || task.date;
      return Boolean(taskDate && taskDate > todayIso);
    })
    .sort((a, b) => {
      const da = a.targetDate || a.date || '';
      const db = b.targetDate || b.date || '';
      if (da !== db) return da.localeCompare(db);
      return getTaskSortTime(b) - getTaskSortTime(a);
    });

  const displayedTasks = selectedDay === 'today' ? todayTasks : scheduledTasks;

  const completedCount = displayedTasks.filter((t) => t.completed).length;
  const totalCount = displayedTasks.length;
  const pendingCount = totalCount - completedCount;
  const zarooriCount = displayedTasks.filter((t) => {
    const p = String(t.priority || '').toUpperCase();
    return p === 'ZAROORI' || p === 'URGENT' || p === 'HIGH' || p === 'IMPORTANT';
  }).length;

  const todayDateStr = formatLocalizedDate(now, language);
  const userName = user?.name ? user.name.split(' ')[0] : (user?.email ? user.email.split('@')[0] : '');
  const todayTabLabel = t(language, 'tab_today_window').replace(/^[☀️📅\s]+/, '').trim();
  const scheduledTabLabel = t(language, 'tab_scheduled_window').replace(/^[☀️📅\s]+/, '').trim();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header matching Mockup Screen 3 */}
        <View style={styles.dashboardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.sunIcon}>☀️</Text>
            <View>
              <Text style={styles.greetingLabel}>{t(language, 'greeting_morning')},</Text>
              <Text style={styles.userNameText}>{userName}</Text>
              <Text style={styles.dateLabel}>
                {todayDateStr}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {!isPremium && (
              <TouchableOpacity
                style={styles.freeHeaderPill}
                onPress={() => setPaywallVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.freeHeaderPillText}>
                  {`Free ${getFreeUsage().used}/3`}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => setLangModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Notifications and Language"
            >
              <Text style={{ fontSize: 20 }}>🔔</Text>
              <View style={styles.bellBadgeDot} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {userName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Progress + Streak Card (Tappable to open Streak Progress Screen) */}
        <TouchableOpacity
          style={styles.progressCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Progress')}
          accessibilityLabel="View Streak Progress"
        >
          {/* Progress bar section */}
          <View style={styles.progressHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.progressTitle}>{t(language, 'progHead') || t(language, 'progress_title')}</Text>
              <Text style={{ fontSize: 13 }}>📈</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.progressPercentText}>
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </Text>
              <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '800' }}>›</Text>
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.progressCountText}>
            {completedCount} / {totalCount} {t(language, 'ratio_completed')} • {language === 'hi' ? 'Tap to view full streak' : 'Tap to view streak & stats'}
          </Text>

          {/* Streak divider */}
          <View style={styles.streakDivider} />

          {/* Streak row */}
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={styles.streakFlame}>🔥</Text>
              <View>
                <Text style={styles.streakCount}>{streak}</Text>
                <Text style={styles.streakLabel}>{t(language, 'days_unit')} {t(language, 'streak_label')}</Text>
              </View>
            </View>

            <View style={styles.streakDividerVert} />

            <View style={styles.streakItem}>
              <Text style={styles.streakFlame}>🏆</Text>
              <View>
                <Text style={styles.streakCount}>{bestStreak}</Text>
                <Text style={styles.streakLabel}>{t(language, 'stat_best_streak')}</Text>
              </View>
            </View>

            <View style={styles.streakDividerVert} />

            <View style={styles.streakItem}>
              <View style={styles.streakDonut}>
                <Text style={styles.streakDonutText}>
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </Text>
              </View>
              <View>
                <Text style={styles.streakCount}>{completedCount}/{totalCount}</Text>
                <Text style={styles.streakLabel}>{t(language, 'stat_done')}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* 2-Tab Switcher (Today vs Upcoming) - only shown when upcoming tasks exist */}
        {scheduledTasks.length > 0 && (
          <View style={styles.daySelector}>
            <TouchableOpacity
              style={[styles.dayTab, selectedDay === 'today' && styles.dayTabActive]}
              onPress={() => setSelectedDay('today')}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.dayTabText, selectedDay === 'today' && styles.dayTabTextActive]}
                numberOfLines={1}
              >
                ☀️ {todayTabLabel} ({todayTasks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dayTab, selectedDay === 'scheduled' && styles.dayTabActive]}
              onPress={() => setSelectedDay('scheduled')}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.dayTabText, selectedDay === 'scheduled' && styles.dayTabTextActive]}
                numberOfLines={1}
              >
                📅 {scheduledTabLabel} ({scheduledTasks.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content Area */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSkeleton count={3} />
          </View>
        ) : (
          <FlatList<Task>
            data={displayedTasks}
            keyExtractor={(item: Task) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 140 },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              <View style={styles.listHeaderContainer}>
                {/* Section Title matching Mockup Screen 3 */}
                <View style={styles.taskListHeader}>
                  <Text style={styles.sectionHeading}>
                    {selectedDay === 'today' ? t(language, 'aaj_ke_kaam') : t(language, 'tab_scheduled_window')}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('TaskHistory')}>
                    <Text style={styles.viewAllText}>{t(language, 'view_tasks')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            ListEmptyComponent={
              selectedDay === 'today' ? (
                scheduledTasks.length > 0 ? (
                  <EmptyState
                    title={t(language, 'empty_title')}
                    subtitle={
                      language === 'hi'
                        ? `Aaj ke liye koi pending task nahi hai. Aapke paas aane wale dino ke ${scheduledTasks.length} scheduled tasks hain.`
                        : `No pending tasks for today. You have ${scheduledTasks.length} upcoming scheduled tasks.`
                    }
                    actionLabel={`${t(language, 'tab_scheduled_window')} (${scheduledTasks.length})`}
                    onActionPress={() => setSelectedDay('scheduled')}
                  />
                ) : (
                  <EmptyState
                    title={t(language, 'empty_title')}
                    subtitle={t(language, 'empty_subtitle')}
                    actionLabel={t(language, 'add_first_task')}
                    onActionPress={handleAddTaskPress}
                  />
                )
              ) : (
                <EmptyState
                  title={t(language, 'no_scheduled_tasks')}
                  subtitle={t(language, 'no_scheduled_tasks_sub')}
                  actionLabel={t(language, 'add_task_title')}
                  onActionPress={handleAddTaskPress}
                />
              )
            }
            renderItem={({ item }: { item: Task }) => (
              <TaskCard
                task={item}
                showDate={selectedDay === 'scheduled'}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                onEditPress={() => setEditingTask(item)}
                onToggleComplete={() => handleToggleTask(item)}
              />
            )}
          />
        )}


        {/* Language Selection Modal */}
        <LanguageModal
          visible={langModalVisible}
          onClose={() => setLangModalVisible(false)}
        />

        {/* Upgrade Paywall Modal */}
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
        />

        {/* Pro Plan Details & Status Modal */}
        <PremiumStatusModal />

        {/* Task Edit Modal (AM/PM, Time, Title, Priority, Date, Notes) */}
        <EditTaskModal
          visible={!!editingTask}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  topBrandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: colors.background,
  },
  brandBarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  settingsHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsHeaderIcon: {
    fontSize: 18,
  },
  greetingCard: {
    backgroundColor: colors.headerWarm,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: spacing.sm,
  },
  greetingTextWrap: {
    gap: 2,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    fontWeight: '500',
  },
  freeQuotaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  freeQuotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freeQuotaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  freeQuotaIcon: {
    fontSize: 15,
  },
  freeQuotaTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  freeUpgradePill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freeUpgradePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  freeStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  freeStepPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  freeStepPillDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  freeStepPillActive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  freeStepPillFinal: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  freeStepNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  freeStepNumberDone: {
    color: '#16A34A',
    fontWeight: '900',
  },
  freeStepNumberActive: {
    color: '#D97706',
    fontWeight: '900',
  },
  freeStepNumberFinal: {
    color: '#DC2626',
    fontWeight: '900',
  },
  freeStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  freeStepTextDone: {
    color: '#16A34A',
  },
  freeStepTextActive: {
    color: '#B45309',
  },
  freeStepTextFinal: {
    color: '#DC2626',
  },
  freeStepConnector: {
    width: 6,
    height: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
  freeStepConnectorDone: {
    backgroundColor: '#86EFAC',
  },
  freeQuotaSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 15,
  },
  trialBannerMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FEF08A',
    gap: 8,
  },
  trialBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  trialBadge: {
    flexShrink: 0,
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  trialText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  upgradeBtnMini: {
    flexShrink: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnTextMini: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  proBannerMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 8,
  },
  proBadge: {
    flexShrink: 0,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  proText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  proDetailsBtnMini: {
    flexShrink: 0,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proDetailsBtnTextMini: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  freeHeaderPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  freeHeaderPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm + 2,
  },
  dayTabActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  dayTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  listContent: {
    paddingTop: spacing.xs,
  },
  listHeaderContainer: {
    gap: spacing.xs,
  },
  dateChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  metricCardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: 4,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  metricBoxTeal: {
    borderColor: '#B2F5EA',
    backgroundColor: colors.softTeal,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  briefingBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 4,
  },
  briefingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefingIcon: {
    fontSize: 18,
  },
  briefingTextWrap: {
    flex: 1,
  },
  briefingHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  briefingSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  taskListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.darkOrange,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: spacing.md,
  },
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  addMainButton: {
    width: '100%',
    backgroundColor: colors.primaryOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    gap: 8,
    shadowColor: colors.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addMainButtonIcon: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  addMainButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sunIcon: {
    fontSize: 26,
  },
  greetingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  dateLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D5C3A',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBFBF3',
    borderWidth: 1.5,
    borderColor: '#0D5C3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D5C3A',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EBFBF3',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#0D5C3A',
  },
  progressCountText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D5C3A',
  },
  streakDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  streakFlame: {
    fontSize: 22,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 20,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  streakDividerVert: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
  },
  streakDonut: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#0D5C3A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBFBF3',
  },
  streakDonutText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#0D5C3A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D5C3A',
  },
  streakBannerBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  streakFlameCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  streakBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  streakBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#B45309',
    marginTop: 1,
  },

});

export default TodayScreen;
