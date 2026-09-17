import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { useWeeklyProgress } from '../hooks';
import StreakCard from '../components/StreakCard';
import WeeklyChart from '../components/WeeklyChart';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { PremiumStatusModal } from '../components/PremiumStatusModal';

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, isPremium, setPaywallVisible, setPremiumStatusVisible } = useAppStore();
  const { data: progress, isLoading, error, refetch, isRefetching } = useWeeklyProgress();

  // Determine best day dynamically from real completed tasks (hidden for new users with 0 completions)
  const bestDayName = React.useMemo(() => {
    if (!progress?.weeklyDays || !progress.totalCompleted || progress.totalCompleted === 0) {
      return null;
    }
    const FULL_DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const FULL_DAYS_HI = ['Somwar', 'Mangalwar', 'Budhwar', 'Guruwar', 'Shukrawar', 'Shaniwar', 'Raviwar'];

    let maxCompleted = 0;
    let bestIndex = -1;

    progress.weeklyDays.forEach((d: any, idx: number) => {
      const comp = Number(d.completed || 0);
      if (comp > maxCompleted) {
        maxCompleted = comp;
        bestIndex = idx;
      }
    });

    if (maxCompleted <= 0 || bestIndex === -1) {
      return null;
    }

    const dayList = language === 'hi' ? FULL_DAYS_HI : FULL_DAYS_EN;
    return dayList[bestIndex] || progress.weeklyDays[bestIndex]?.day || null;
  }, [progress, language]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ padding: spacing.md }}>
          <LoadingSkeleton count={3} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !progress) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState message="Pragati data load nahi ho paya." onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📈 {language === 'hi' ? 'PROGRESS' : t(language, 'progress_title')}</Text>
          <Text style={styles.subtitle}>{language === 'hi' ? 'Aap kitne consistent hain?' : t(language, 'progress_subtitle')}</Text>
        </View>

        {/* Streak Highlight Card (Panel 5) */}
        <StreakCard streakCount={progress.streak} isConsistentToday={true} />

        {/* Completion & Weekly Performance Bar Chart Card (Panel 5) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.completionHeading}>{progress.completionRate}% completion</Text>
          </View>
          <View style={styles.completionTrack}>
            <View style={[styles.completionFill, { width: `${Math.min(progress.completionRate, 100)}%` }]} />
          </View>
          <WeeklyChart days={progress.weeklyDays} completionRate={progress.completionRate} />
        </View>

        {/* Is Hafte Breakdown Card (Panel 5) */}
        <View style={styles.weeklyBreakdownCard}>
          <Text style={styles.breakdownHeader}>Is hafte</Text>
          
          <View style={styles.breakdownRow}>
            <View style={[styles.statusDotCircle, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.statusDotIcon, { color: '#10B981' }]}>✓</Text>
            </View>
            <Text style={styles.breakdownText}>{progress.totalCompleted} completed</Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={[styles.statusDotCircle, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.statusDotIcon, { color: '#F59E0B' }]}>•</Text>
            </View>
            <Text style={styles.breakdownText}>
              {Math.max(0, (progress.weeklyDays || []).reduce((acc: number, d: any) => acc + (d.total - d.completed), 0))} pending
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={[styles.statusDotCircle, { backgroundColor: '#E6FFFA' }]}>
              <Text style={[styles.statusDotIcon, { color: '#26A69A' }]}>✦</Text>
            </View>
            <Text style={styles.breakdownText}>{progress.bestStreak} days best streak</Text>
          </View>
        </View>

        {/* Best Day Banner (Panel 5) - Only visible when user has completed tasks */}
        {bestDayName ? (
          <View style={styles.bestDayBanner}>
            <Text style={styles.trophyIcon}>🏆</Text>
            <Text style={styles.bestDayText}>
              {language === 'hi' ? 'Sabse behtar din: ' : 'Best day: '}
              <Text style={{ fontWeight: '800', color: '#0F172A' }}>{bestDayName}</Text>
            </Text>
            <Text style={styles.chevronIcon}>›</Text>
          </View>
        ) : null}

        {/* Motivation Card */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.quoteText}>
            {t(language, 'quote_text')}
          </Text>
        </View>

        {/* Premium Upgrade prompt if free tier OR Pro Status Banner if Premium */}
        {isPremium ? (
          <TouchableOpacity
            style={styles.proActiveBanner}
            activeOpacity={0.85}
            onPress={() => setPremiumStatusVisible(true)}
          >
            <View style={styles.upgradeBannerContent}>
              <Text style={styles.upgradeBannerEmoji}>👑</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.proActiveBannerTitle}>
                  {language === 'hi' ? 'TaskAlert Pro Member' : 'TaskAlert Pro Member'}
                </Text>
                <Text style={styles.proActiveBannerSubtitle}>
                  {language === 'hi'
                    ? 'Unlimited tasks aur streak insights unlock hain • Status dekhein'
                    : 'Unlimited tasks & full streak insights unlocked • View status'}
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: '#15803D', fontWeight: '800' }}>›</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.upgradeBanner}
            activeOpacity={0.85}
            onPress={() => setPaywallVisible(true)}
          >
            <View style={styles.upgradeBannerContent}>
              <Text style={styles.upgradeBannerEmoji}>👑</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.upgradeBannerTitle}>{t(language, 'upgrade_pro_title')}</Text>
                <Text style={styles.upgradeBannerSubtitle}>
                  {t(language, 'upgrade_pro_sub')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Pro Details & Status Modal */}
      <PremiumStatusModal />
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
    marginVertical: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeaderRow: {
    marginBottom: 8,
  },
  completionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  completionTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 14,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  weeklyBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  breakdownHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDotCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotIcon: {
    fontSize: 14,
    fontWeight: '800',
  },
  breakdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  bestDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#FDE68A',
  },
  trophyIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  bestDayText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  chevronIcon: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
  },
  quoteCard: {
    backgroundColor: '#F0F5FA',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBlue,
    marginTop: spacing.xs,
  },
  quoteMark: {
    fontSize: 28,
    lineHeight: 28,
    color: colors.primaryBlue,
    fontFamily: 'serif',
  },
  quoteText: {
    ...typography.bodySecondary,
    color: colors.primaryBlue,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  upgradeBanner: {
    backgroundColor: '#FFF9ED',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upgradeBannerEmoji: {
    fontSize: 32,
  },
  upgradeBannerTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  upgradeBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proActiveBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  proActiveBannerTitle: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: '#15803D',
  },
  proActiveBannerSubtitle: {
    ...typography.caption,
    color: '#166534',
    marginTop: 2,
  },
});

export default ProgressScreen;
