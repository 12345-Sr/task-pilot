import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, shadows } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { useTaskHistory } from '../hooks';
import PriorityChip from '../components/PriorityChip';
import { TaskHistoryItem } from '../services/history/taskHistory.service';

type FilterTab = 'all' | 'done' | 'pending' | 'missed';

export const TaskHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language } = useAppStore();
  const isHindi = language === 'hi';

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isRefetching, refetch } = useTaskHistory(activeTab, searchQuery);

  const tasks = data?.tasks || [];
  const stats = data?.stats || {
    totalCreated: 0,
    totalCompleted: 0,
    totalMissed: 0,
    activeTasks: 0,
    completionRate: 0,
  };

  // Helper to format creation and schedule date/time
  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);

      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const timePart = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      if (isToday) {
        return isHindi ? `Aaj, ${timePart}` : `Today, ${timePart}`;
      }

      const datePart = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });

      return `${datePart}, ${timePart}`;
    } catch {
      return String(dateStr);
    }
  };

  const formatScheduleDate = (dateVal?: string, timeVal?: string) => {
    const dStr = dateVal ? String(dateVal).slice(0, 10) : '';
    const tStr = timeVal ? String(timeVal).slice(0, 5) : '';
    if (!dStr && !tStr) return '';
    return `⏰ ${dStr} ${tStr}`.trim();
  };

  // Render individual task card in timeline
  const renderItem = ({ item }: { item: TaskHistoryItem }) => {
    const isDone = item.completed === true || item.confirmationStatus === 'COMPLETED';
    const isMissed = item.confirmationStatus === 'MISSED';

    const statusBadgeText = isDone
      ? isHindi ? '✓ Pura Hua' : '✓ Completed'
      : isMissed
        ? isHindi ? '✗ Chhoot Gaya' : '✗ Missed'
        : isHindi ? '● Active' : '● Active';

    const statusBadgeStyle = isDone
      ? styles.badgeDone
      : isMissed
        ? styles.badgeMissed
        : styles.badgeActive;

    const statusTextStyle = isDone
      ? styles.badgeTextDone
      : isMissed
        ? styles.badgeTextMissed
        : styles.badgeTextActive;

    const createdFormatted = formatTimestamp(item.createdAt);
    const scheduleFormatted = formatScheduleDate(item.date || item.targetDate, item.time || item.deadlineTime);

    return (
      <TouchableOpacity
        style={styles.taskCard}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
      >
        <View style={styles.cardHeaderRow}>
          <PriorityChip priority={item.priority} size="sm" />
          <View style={[styles.statusBadge, statusBadgeStyle]}>
            <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusBadgeText}</Text>
          </View>
        </View>

        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
          {item.title}
        </Text>

        {item.description ? (
          <Text style={styles.taskDescription} numberOfLines={2}>
            📝 {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          {createdFormatted ? (
            <View style={styles.timeRow}>
              <Text style={styles.metaLabel}>{isHindi ? 'Banaya gaya:' : 'Created:'}</Text>
              <Text style={styles.metaValue}>{createdFormatted}</Text>
            </View>
          ) : null}

          {scheduleFormatted ? (
            <View style={styles.timeRow}>
              <Text style={styles.metaLabel}>{isHindi ? 'Schedule:' : 'Due:'}</Text>
              <Text style={styles.metaValue}>{scheduleFormatted}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isHindi ? '📜 Tasks Itihaas' : '📜 Tasks Created History'}
          </Text>
          <Text style={styles.headerSub}>
            {isHindi ? 'Aapke sabhi banaye gaye tasks ka record' : 'Complete lifetime history of created tasks'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => refetch()}
          activeOpacity={0.7}
          accessibilityLabel="Refresh history"
        >
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <FlatList<TaskHistoryItem>
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* KPI Stat Cards Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📝</Text>
                <Text style={styles.statNumber}>{stats.totalCreated}</Text>
                <Text style={styles.statLabel}>{isHindi ? 'Total Tasks' : 'Total Created'}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={[styles.statNumber, { color: colors.successGreen }]}>
                  {stats.totalCompleted}
                </Text>
                <Text style={styles.statLabel}>{isHindi ? 'Pura Hua' : 'Completed'}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statIcon}>⏳</Text>
                <Text style={[styles.statNumber, { color: colors.primaryBlue }]}>
                  {stats.activeTasks}
                </Text>
                <Text style={styles.statLabel}>{isHindi ? 'Active' : 'In Progress'}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📈</Text>
                <Text style={[styles.statNumber, { color: colors.primaryPurple }]}>
                  {stats.completionRate}%
                </Text>
                <Text style={styles.statLabel}>{isHindi ? 'Success Rate' : 'Success Rate'}</Text>
              </View>
            </View>

            {/* Live Search Bar */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={isHindi ? 'Kaam ke naam se khojein...' : 'Search tasks by title or notes...'}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                  <Text style={styles.searchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsRow}>
              {(
                [
                  { id: 'all', label: isHindi ? 'Sabhi' : 'All', count: stats.totalCreated },
                  { id: 'done', label: isHindi ? 'Pura' : 'Completed', count: stats.totalCompleted },
                  { id: 'pending', label: isHindi ? 'Active' : 'Active', count: stats.activeTasks },
                  { id: 'missed', label: isHindi ? 'Missed' : 'Missed', count: stats.totalMissed },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                      {tab.label} ({tab.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Timeline Header Row */}
            <View style={styles.timelineHeaderRow}>
              <Text style={styles.timelineHeading}>
                {isHindi ? '🕒 Creation Timeline' : '🕒 Creation Timeline'}
              </Text>
              <Text style={styles.timelineCountBadge}>
                {tasks.length} {isHindi ? 'records' : 'records'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.emptySub}>
                {isHindi ? 'Itihaas load ho raha hai...' : 'Loading task history...'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📜</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? isHindi ? 'Koi task nahi mila' : 'No matching tasks found'
                  : isHindi ? 'Abhi tak koi task nahi banaya' : 'No task history recorded yet'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? isHindi ? `"${searchQuery}" ke liye koi result nahi mila.` : `No tasks match "${searchQuery}".`
                  : isHindi
                    ? 'Aap jo bhi task banayenge, uska poora record yahan hamesha surakshit rahega.'
                    : 'Every task you create will be safely recorded and archived here.'}
              </Text>

              {searchQuery ? (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyActionBtnText}>
                    {isHindi ? 'Search Saaf Karein' : 'Clear Search'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.createTaskGradientTouch}
                  onPress={() => navigation.navigate('AddTask')}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createTaskGradient}
                  >
                    <Text style={styles.createTaskGradientText}>
                      {isHindi ? '+ Naya Task Banayein' : '+ Create Your First Task'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default TaskHistoryScreen;

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
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtnText: {
    fontSize: 26,
    color: colors.textPrimary,
    lineHeight: 28,
    marginTop: -2,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshBtnText: {
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerContainer: {
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primaryPurple,
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primaryPurple,
    fontWeight: '800',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  timelineHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timelineCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeDone: {
    backgroundColor: '#DCFCE7',
  },
  badgeMissed: {
    backgroundColor: '#FEE2E2',
  },
  badgeActive: {
    backgroundColor: '#DBEAFE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTextDone: {
    color: '#15803D',
  },
  badgeTextMissed: {
    color: '#B91C1C',
  },
  badgeTextActive: {
    color: '#1D4ED8',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskDescription: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
    flexWrap: 'wrap',
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyActionBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  createTaskGradientTouch: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.card,
  },
  createTaskGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTaskGradientText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
