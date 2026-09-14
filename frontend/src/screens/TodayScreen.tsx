import React, { useState } from 'react';
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
  } = useAppStore();
  const { data: user } = useUserProfile();
  useSubscription();
  const { data: tasks, isLoading, error, refetch, isRefetching } = useTodayTasks();
  const completeMutation = useCompleteTask();

  const [selectedDay, setSelectedDay] = useState<'today' | 'scheduled'>('today');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // 1. Today's Tasks Window
  const todayTasks = (tasks || []).filter((task) => {
    const taskDate = task.targetDate || task.date;
    return !taskDate || taskDate === todayIso || (taskDate < todayIso && !task.completed);
  });

  // 2. Scheduled Tasks Window
  const scheduledTasks = (tasks || [])
    .filter((task) => {
      const taskDate = task.targetDate || task.date;
      return Boolean(taskDate && taskDate > todayIso);
    })
    .sort((a, b) => {
      const da = a.targetDate || a.date || '';
      const db = b.targetDate || b.date || '';
      return da.localeCompare(db);
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
  const userName = user?.name ? user.name.split(' ')[0] : t(language, 'friend');
  const todayTabLabel = t(language, 'tab_today_window').replace(/^[☀️📅\s]+/, '').trim();
  const scheduledTabLabel = t(language, 'tab_scheduled_window').replace(/^[☀️📅\s]+/, '').trim();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Branding Bar */}
        <View style={styles.topBrandBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BrandLogo size={32} showText={false} />
            <Text style={styles.brandBarTitle}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Pilot</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsHeaderIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* User Greeting Card (Warm Sunrise Header) */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingTextWrap}>
            <Text style={styles.greetingTitle}>
              {t(language, 'greeting_morning')}, {userName}! 👋
            </Text>
            <Text style={styles.greetingSub}>
              {language === 'hi'
                ? 'Kal ke din aapke liye kya zaroori hai, aaj hi tai karein.'
                : 'Plan your essential tasks today, conquer tomorrow.'}
            </Text>
          </View>

          {/* Mini Subscription Status Pill / Pro Status Pill */}
          {isPremium ? (
            <TouchableOpacity
              style={styles.proBannerMini}
              activeOpacity={0.85}
              onPress={() => setPremiumStatusVisible(true)}
            >
              <View style={styles.trialBannerLeft}>
                <Text style={styles.proBadge}>👑 Pro Active</Text>
                <Text style={styles.proText} numberOfLines={1} ellipsizeMode="tail">
                  {language === 'hi'
                    ? 'Unlimited tasks • Status dekhein'
                    : 'Unlimited tasks • View status'}
                </Text>
              </View>
              <View style={styles.proDetailsBtnMini}>
                <Text style={styles.proDetailsBtnTextMini}>
                  {language === 'hi' ? 'Details →' : 'Details →'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (() => {
            const { used: freeUsed, remaining: freeRemaining } = getFreeUsage();
            return (
              <TouchableOpacity
                style={styles.trialBannerMini}
                activeOpacity={0.85}
                onPress={() => setPaywallVisible(true)}
              >
                <View style={styles.trialBannerLeft}>
                  <Text style={styles.trialBadge}>Free Plan</Text>
                  <Text style={styles.trialText} numberOfLines={1} ellipsizeMode="tail">
                    {freeUsed}/3 {language === 'hi' ? 'used' : 'used'} • {freeRemaining} {language === 'hi' ? 'bache hain' : 'left'}
                  </Text>
                </View>
                <View style={styles.upgradeBtnMini}>
                  <Text style={styles.upgradeBtnTextMini}>Upgrade</Text>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* 2-Tab Switcher (Today vs Scheduled Window) */}
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

        {/* Main Content Area */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSkeleton count={3} />
          </View>
        ) : error ? (
          <ErrorState message={t(language, 'load_error')} onRetry={() => refetch()} />
        ) : (
          <FlatList<Task>
            data={displayedTasks}
            keyExtractor={(item: Task) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 120 },
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
                {/* Date & Quick 3-Metric Strip (Panel 1 Mockup) */}
                <View style={styles.dateChipRow}>
                  <CalendarIcon date={new Date()} size={24} />
                  <Text style={styles.dateChipText}>
                    {selectedDay === 'today' ? `Aaj, ${todayDateStr}` : scheduledTabLabel}
                  </Text>
                </View>

                <View style={styles.metricCardRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricVal}>{totalCount}</Text>
                    <Text style={styles.metricLabel}>{t(language, 'stat_total')}</Text>
                  </View>

                  <View style={[styles.metricBox, styles.metricBoxTeal]}>
                    <Text style={[styles.metricVal, { color: colors.tealDark }]}>{zarooriCount}</Text>
                    <Text style={[styles.metricLabel, { color: colors.tealDark }]}>Zaroori</Text>
                  </View>

                  <View style={styles.metricBox}>
                    <Text style={[styles.metricVal, { color: colors.primary }]}>{pendingCount}</Text>
                    <Text style={styles.metricLabel}>{t(language, 'stat_pending')}</Text>
                  </View>
                </View>

                {/* Subah Ki Briefing Banner */}
                <View style={styles.briefingBanner}>
                  <View style={styles.briefingIconWrap}>
                    <Text style={styles.briefingIcon}>🌅</Text>
                  </View>
                  <View style={styles.briefingTextWrap}>
                    <Text style={styles.briefingHeading}>
                      {selectedDay === 'today'
                        ? t(language, 'subah_briefing_title')
                        : t(language, 'tab_scheduled_window')}
                    </Text>
                    <Text style={styles.briefingSub}>
                      {selectedDay === 'today'
                        ? pendingCount > 0
                          ? t(language, 'briefing_today_pending')
                          : t(language, 'briefing_today_done')
                        : scheduledTasks.length > 0
                        ? t(language, 'briefing_tomorrow_tasks')
                        : t(language, 'no_scheduled_tasks_sub')}
                    </Text>
                  </View>
                </View>

                {/* Section Title */}
                <View style={styles.taskListHeader}>
                  <Text style={styles.sectionHeading}>
                    {selectedDay === 'today' ? 'Aaj Ke Kaam' : t(language, 'tab_scheduled_window')}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {displayedTasks.length} {t(language, 'tasks_count')}
                    </Text>
                  </View>
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
});

export default TodayScreen;
