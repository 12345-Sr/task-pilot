import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadows } from '../theme';
import { useAppStore } from '../store';
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
    return `${dStr} ${tStr}`.trim();
  };

  // Render individual task card in timeline
  const renderItem = ({ item }: { item: TaskHistoryItem }) => {
    const isDone = item.completed === true || item.confirmationStatus === 'COMPLETED';
    const isMissed = item.confirmationStatus === 'MISSED';

    const statusBadgeText = isDone
      ? isHindi ? '✓ Pura Hua' : '✓ Completed'
      : isMissed
        ? isHindi ? '✗ Chhoot Gaya' : '✗ Missed'
        : isHindi ? '⏳ Active' : '⏳ In Progress';

    const accentColor = isDone
      ? '#10B981'
      : isMissed
        ? '#EF4444'
        : '#6366F1';

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
        {/* Color accent left indicator bar */}
        <View style={[styles.cardAccentBar, { backgroundColor: accentColor }]} />

        <View style={styles.cardInner}>
          {/* Header Row: Priority Chip & Status Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <PriorityChip priority={item.priority} size="sm" />
              <View style={[styles.statusBadge, statusBadgeStyle]}>
                <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusBadgeText}</Text>
              </View>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </View>

          {/* Title */}
          <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Description */}
          {item.description ? (
            <View style={styles.descBox}>
              <Text style={styles.taskDescription} numberOfLines={2}>
                📝 {item.description}
              </Text>
            </View>
          ) : null}

          {/* Footer Metadata */}
          <View style={styles.cardFooter}>
            {createdFormatted ? (
              <View style={styles.timeTag}>
                <Text style={styles.timeTagLabel}>{isHindi ? 'Banaya:' : 'Created:'}</Text>
                <Text style={styles.timeTagValue}>{createdFormatted}</Text>
              </View>
            ) : null}

            {scheduleFormatted ? (
              <View style={styles.timeTag}>
                <Text style={styles.timeTagLabel}>{isHindi ? 'Schedule:' : 'Due:'}</Text>
                <Text style={styles.timeTagValue}>⏰ {scheduleFormatted}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {/* Premium Hero Gradient Header */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        {/* Top bar with back and refresh buttons */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.heroNavBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
          >
            <Text style={styles.heroNavBtnText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>
              {isHindi ? '📜 टास्क इतिहास (Task History)' : '📜 Task History & Audit'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isHindi ? 'Aapke sabhi banaye gaye tasks ka safe record' : 'Permanent database record of all created tasks'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heroNavBtn}
            onPress={() => refetch()}
            activeOpacity={0.75}
            accessibilityLabel="Refresh history"
          >
            <Text style={styles.heroSyncIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Vault Status Badge */}
        <View style={styles.heroVaultBadge}>
          <Text style={styles.heroVaultDot}>●</Text>
          <Text style={styles.heroVaultText}>
            {isHindi
              ? `Cloud & Database Synced · Kul ${stats.totalCreated} Kaam`
              : `Cloud & Database Synced · ${stats.totalCreated} Total Tasks`}
          </Text>
        </View>
      </LinearGradient>

      {/* Main Timeline List */}
      <FlatList<TaskHistoryItem>
        data={tasks}
        keyExtractor={(item) => String(item.id)}
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
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* KPI Stat Cards Grid - Interactive! */}
            <View style={styles.statsGrid}>
              <TouchableOpacity
                style={[styles.statCard, activeTab === 'all' && styles.statCardSelected]}
                onPress={() => setActiveTab('all')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={styles.statIcon}>📝</Text>
                </View>
                <Text style={styles.statNumber}>{stats.totalCreated}</Text>
                <Text style={styles.statLabel}>{isHindi ? 'Total' : 'Total'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, activeTab === 'done' && styles.statCardSelected]}
                onPress={() => setActiveTab('done')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={styles.statIcon}>✓</Text>
                </View>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>
                  {stats.totalCompleted}
                </Text>
                <Text style={styles.statLabel}>{isHindi ? 'Pura' : 'Done'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, activeTab === 'pending' && styles.statCardSelected]}
                onPress={() => setActiveTab('pending')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={styles.statIcon}>⏳</Text>
                </View>
                <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
                  {stats.activeTasks}
                </Text>
                <Text style={styles.statLabel}>{isHindi ? 'Active' : 'Active'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, activeTab === 'missed' && styles.statCardSelected]}
                onPress={() => setActiveTab('missed')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#FAF5FF' }]}>
                  <Text style={styles.statIcon}>⚡</Text>
                </View>
                <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>
                  {stats.completionRate}%
                </Text>
                <Text style={styles.statLabel}>{isHindi ? 'Rate' : 'Success'}</Text>
              </TouchableOpacity>
            </View>

            {/* Live Search Bar */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={isHindi ? 'Kaam ke naam ya description se khojein...' : 'Search task history by title or notes...'}
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

            {/* Segmented Filter Pills */}
            <View style={styles.tabsRow}>
              {(
                [
                  { id: 'all', label: isHindi ? 'Sabhi' : 'All', count: stats.totalCreated },
                  { id: 'done', label: isHindi ? 'Pura Hua' : 'Completed', count: stats.totalCompleted },
                  { id: 'pending', label: isHindi ? 'Active' : 'Active', count: stats.activeTasks },
                  { id: 'missed', label: isHindi ? 'Missed' : 'Missed', count: stats.totalMissed },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.85}
                    style={styles.tabTouch}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.tabBtnActive}
                      >
                        <Text style={styles.tabBtnTextActive}>
                          {tab.label}
                        </Text>
                        <View style={styles.tabBadgeActive}>
                          <Text style={styles.tabBadgeTextActive}>{tab.count}</Text>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.tabBtnInactive}>
                        <Text style={styles.tabBtnTextInactive}>
                          {tab.label}
                        </Text>
                        <View style={styles.tabBadgeInactive}>
                          <Text style={styles.tabBadgeTextInactive}>{tab.count}</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Timeline Header Row */}
            <View style={styles.timelineHeaderRow}>
              <View style={styles.timelineHeadingGroup}>
                <Text style={styles.timelineHeading}>
                  {isHindi ? '🕒 Creation Timeline' : '🕒 Creation Timeline'}
                </Text>
                <Text style={styles.timelineSubheading}>
                  {isHindi ? 'Navinatam se purana kram' : 'Sorted newest to oldest'}
                </Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>
                  {tasks.length} {isHindi ? 'records' : 'tasks'}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color="#6366F1" size="large" />
              <Text style={styles.emptySub}>
                {isHindi ? 'Database se itihaas load ho raha hai...' : 'Loading task history from database...'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>📜</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? isHindi ? 'Koi task nahi mila' : 'No matching tasks found'
                  : isHindi ? 'Abhi tak koi task record nahi hai' : 'No task history recorded yet'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? isHindi ? `"${searchQuery}" ke anuroop koi record nahi mila.` : `No tasks match "${searchQuery}". Try a different keyword.`
                  : isHindi
                    ? 'Aap jo bhi task banayenge, uska poora record yahan database me hamesha surakshit rahega.'
                    : 'Every task you add is securely recorded and permanently archived here in your database.'}
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
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createTaskGradient}
                  >
                    <Text style={styles.createTaskGradientText}>
                      {isHindi ? '+ Naya Task Jodein' : '+ Create Your First Task'}
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
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.card,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  heroNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavBtnText: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 28,
    marginTop: -2,
  },
  heroSyncIcon: {
    fontSize: 16,
  },
  heroTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  heroVaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    gap: 6,
  },
  heroVaultDot: {
    fontSize: 8,
    color: '#34D399',
  },
  heroVaultText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerContainer: {
    gap: 12,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  statCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F5F3FF',
    transform: [{ scale: 1.02 }],
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statIcon: {
    fontSize: 14,
    fontWeight: '800',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    height: 46,
    ...shadows.soft,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabTouch: {
    flex: 1,
  },
  tabBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 4,
    ...shadows.soft,
  },
  tabBtnInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tabBtnTextActive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabBtnTextInactive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeInactive: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeTextActive: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabBadgeTextInactive: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  timelineHeadingGroup: {
    gap: 1,
  },
  timelineHeading: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  timelineSubheading: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  countPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.card,
  },
  cardAccentBar: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: 14,
    gap: 7,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardChevron: {
    fontSize: 20,
    color: '#CBD5E1',
    fontWeight: '700',
    marginTop: -4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeDone: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeMissed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  badgeTextDone: {
    color: '#059669',
  },
  badgeTextMissed: {
    color: '#DC2626',
  },
  badgeTextActive: {
    color: '#2563EB',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 21,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderLeftWidth: 2.5,
    borderLeftColor: '#CBD5E1',
  },
  taskDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
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
    gap: 6,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 4,
  },
  timeTagLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  timeTagValue: {
    fontSize: 10.5,
    color: '#334155',
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    marginBottom: 4,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
  emptyActionBtn: {
    marginTop: 6,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  createTaskGradientTouch: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.card,
  },
  createTaskGradient: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTaskGradientText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
