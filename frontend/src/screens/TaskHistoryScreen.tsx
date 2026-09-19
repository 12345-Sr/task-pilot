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
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BrandLogo from '../components/BrandLogo';
import { colors, spacing, radius, shadows } from '../theme';
import { useAppStore } from '../store';
import { useTaskHistory } from '../hooks';
import PriorityChip from '../components/PriorityChip';
import { TaskHistoryItem } from '../services/history/taskHistory.service';

type FilterTab = 'all' | 'done' | 'pending' | 'missed';
type TimeframeFilter = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth';
type PriorityFilter = 'all' | 'zaroori' | 'medium' | 'normal';

export const TaskHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language } = useAppStore();
  const isHinglish = language === 'hi';

  // Primary filters
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  // Modals & display pagination
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskHistoryItem | null>(null);

  const { data, isLoading, isRefetching, refetch } = useTaskHistory(activeTab, searchQuery);

  const rawTasks = data?.tasks || [];
  const stats = data?.stats || {
    totalCreated: 0,
    totalCompleted: 0,
    totalMissed: 0,
    activeTasks: 0,
    completionRate: 0,
  };

  // Helper for checking date ranges
  const isWithinTimeframe = (dateStr: string | undefined, timeframe: TimeframeFilter): boolean => {
    if (timeframe === 'all' || !dateStr) return true;
    try {
      const taskDate = new Date(dateStr);
      if (isNaN(taskDate.getTime())) return true;
      const now = new Date();

      const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()).getTime();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (timeframe === 'today') {
        return taskDay === today;
      }
      if (timeframe === 'yesterday') {
        return taskDay === today - oneDayMs;
      }
      if (timeframe === 'last7') {
        return taskDay >= today - 7 * oneDayMs;
      }
      if (timeframe === 'last30') {
        return taskDay >= today - 30 * oneDayMs;
      }
      if (timeframe === 'thisMonth') {
        return taskDate.getFullYear() === now.getFullYear() && taskDate.getMonth() === now.getMonth();
      }
      return true;
    } catch {
      return true;
    }
  };

  const matchesPriority = (itemPriority: string | undefined, filter: PriorityFilter): boolean => {
    if (filter === 'all') return true;
    const p = String(itemPriority || '').toLowerCase();
    if (filter === 'zaroori') {
      return p === 'zaroori' || p === 'urgent' || p === 'high' || p === 'important';
    }
    return p === filter;
  };

  // Client-side filtering combining tab, timeframe, priority, and search
  const filteredTasks = useMemo(() => {
    return rawTasks.filter((item) => {
      // 1. Status Filter
      if (activeTab !== 'all') {
        const isDone = item.completed === true || item.confirmationStatus === 'COMPLETED';
        const isMissed = item.confirmationStatus === 'MISSED';
        if (activeTab === 'done' && !isDone) return false;
        if (activeTab === 'missed' && !isMissed) return false;
        if (activeTab === 'pending' && (isDone || isMissed)) return false;
      }

      // 2. Timeframe Filter
      const dateToCheck = item.createdAt || item.date || item.targetDate;
      if (!isWithinTimeframe(dateToCheck, timeframeFilter)) {
        return false;
      }

      // 3. Priority Filter
      if (!matchesPriority(item.priority, priorityFilter)) {
        return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [rawTasks, activeTab, timeframeFilter, priorityFilter, searchQuery]);

  // Show ONLY 10 tasks on screen initially!
  const displayedTasks = useMemo(() => {
    return filteredTasks.slice(0, displayLimit);
  }, [filteredTasks, displayLimit]);

  const activeFilterCount =
    (timeframeFilter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (activeTab !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetAllFilters = () => {
    setActiveTab('all');
    setTimeframeFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
    setDisplayLimit(10);
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
        return isHinglish ? `Aaj, ${timePart}` : `Today, ${timePart}`;
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

  const formatFullTimestamp = (dateStr?: string, timestamp?: number) => {
    const raw = dateStr || (timestamp ? new Date(timestamp).toISOString() : '');
    if (!raw) return isHinglish ? 'Record nahi mila' : 'Not recorded';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return String(raw);

      const timePart = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const datePart = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      return `${datePart}, ${timePart}`;
    } catch {
      return String(raw);
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
      ? (isHinglish ? '✓ Pura Hua' : '✓ Completed')
      : isMissed
        ? (isHinglish ? '✗ Chhoot Gaya' : '✗ Missed')
        : (isHinglish ? '⏳ Active' : '⏳ In Progress');

    const accentColor = isDone
      ? '#2CC55E'
      : isMissed
        ? '#DC2626'
        : '#EA580C';

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
        onPress={() => setSelectedTask(item)}
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
                <Text style={styles.timeTagLabel}>{isHinglish ? 'Banaya:' : 'Created:'}</Text>
                <Text style={styles.timeTagValue}>{createdFormatted}</Text>
              </View>
            ) : null}

            {scheduleFormatted ? (
              <View style={styles.timeTag}>
                <Text style={styles.timeTagLabel}>{isHinglish ? 'Schedule:' : 'Due:'}</Text>
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
      {/* Top Branding & Navigation Bar (Exact App Signature Scheme) */}
      <View style={styles.topBrandBar}>
        <View style={styles.topBrandLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnIcon}>←</Text>
          </TouchableOpacity>
          <BrandLogo size={32} showText={false} />
          <Text style={styles.brandBarTitle}>
            <Text style={{ color: '#0F172A' }}>Task</Text>
            <Text style={{ color: '#EAB308' }}>Alert</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshHeaderBtn}
          onPress={() => refetch()}
          activeOpacity={0.7}
          accessibilityLabel="Refresh history"
        >
          <Text style={styles.refreshHeaderIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Main Timeline List with Warm Sunrise Header */}
      <FlatList<TaskHistoryItem>
        data={displayedTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#EA580C']}
            tintColor="#EA580C"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Warm Sunrise Header Card */}
            <View style={styles.heroWarmCard}>
              <View style={styles.heroWarmHeaderRow}>
                <View style={styles.heroWarmIconWrap}>
                  <Text style={styles.heroWarmIcon}>📜</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroWarmTitle}>
                    {isHinglish ? 'Task History & Records' : 'Task History & Records'}
                  </Text>
                  <Text style={styles.heroWarmSubtitle}>
                    {isHinglish ? 'Aapke sabhi banaye gaye tasks ka safe record' : 'Permanent database archive of all created tasks'}
                  </Text>
                </View>
              </View>

              {/* Cloud Sync Status Badge */}
              <View style={styles.cloudSyncBadge}>
                <Text style={styles.cloudSyncDot}>●</Text>
                <Text style={styles.cloudSyncText}>
                  {isHinglish
                    ? `Cloud & Database Synced · Kul ${stats.totalCreated} Kaam`
                    : `Cloud & Database Synced · ${stats.totalCreated} Total Tasks`}
                </Text>
              </View>
            </View>

            {/* Interactive KPI Stat Cards Grid */}
            <View style={styles.statsGrid}>
              <TouchableOpacity
                style={[styles.statCard, activeTab === 'all' && styles.statCardSelected]}
                onPress={() => {
                  setActiveTab('all');
                  setDisplayLimit(10);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.statIcon}>📝</Text>
                </View>
                <Text style={styles.statNumber}>{stats.totalCreated}</Text>
                <Text style={styles.statLabel}>{isHinglish ? 'Total' : 'Total'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, activeTab === 'done' && styles.statCardSelected]}
                onPress={() => {
                  setActiveTab('done');
                  setDisplayLimit(10);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.statIcon, { color: '#15803D' }]}>✓</Text>
                </View>
                <Text style={[styles.statNumber, { color: '#15803D' }]}>
                  {stats.totalCompleted}
                </Text>
                <Text style={styles.statLabel}>{isHinglish ? 'Pura' : 'Done'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, activeTab === 'pending' && styles.statCardSelected]}
                onPress={() => {
                  setActiveTab('pending');
                  setDisplayLimit(10);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={styles.statIcon}>⏳</Text>
                </View>
                <Text style={[styles.statNumber, { color: '#0284C7' }]}>
                  {stats.activeTasks}
                </Text>
                <Text style={styles.statLabel}>{isHinglish ? 'Active' : 'Active'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, activeTab === 'missed' && styles.statCardSelected]}
                onPress={() => {
                  setActiveTab('missed');
                  setDisplayLimit(10);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={styles.statIcon}>✗</Text>
                </View>
                <Text style={[styles.statNumber, { color: '#DC2626' }]}>
                  {stats.totalMissed}
                </Text>
                <Text style={styles.statLabel}>{isHinglish ? 'Missed' : 'Missed'}</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar & Prominent Filter Button Row */}
            <View style={styles.searchAndFilterRow}>
              {/* Live Search Input */}
              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={isHinglish ? 'Kaam ke naam ya note se khojein...' : 'Search past tasks by title or notes...'}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setDisplayLimit(10);
                  }}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <Text style={styles.searchClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Dedicated Filter Button */}
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  activeFilterCount > 0 && styles.filterButtonActive,
                ]}
                onPress={() => setIsFilterModalVisible(true)}
                activeOpacity={0.82}
              >
                <Text style={styles.filterButtonIcon}>⚡</Text>
                <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
                  {isHinglish ? 'Filter' : 'Filter'}
                </Text>
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Active Filters Pill Strip (if any filter is selected) */}
            {activeFilterCount > 0 && (
              <View style={styles.activeFilterChipsRow}>
                <Text style={styles.activeFilterLabel}>
                  {isHinglish ? 'Active Filters:' : 'Active Filters:'}
                </Text>

                {timeframeFilter !== 'all' && (
                  <TouchableOpacity
                    style={styles.filterChip}
                    onPress={() => setTimeframeFilter('all')}
                  >
                    <Text style={styles.filterChipText}>
                      📅 {timeframeFilter === 'today' ? (isHinglish ? 'Aaj' : 'Today')
                        : timeframeFilter === 'yesterday' ? (isHinglish ? 'Kal' : 'Yesterday')
                        : timeframeFilter === 'last7' ? (isHinglish ? 'Pichhle 7 Din' : 'Last 7 Days')
                        : timeframeFilter === 'last30' ? (isHinglish ? 'Pichhle 30 Din' : 'Last 30 Days')
                        : (isHinglish ? 'Is Mahine' : 'This Month')} ✕
                    </Text>
                  </TouchableOpacity>
                )}

                {priorityFilter !== 'all' && (
                  <TouchableOpacity
                    style={styles.filterChip}
                    onPress={() => setPriorityFilter('all')}
                  >
                    <Text style={styles.filterChipText}>
                      🎯 {priorityFilter === 'zaroori' ? (isHinglish ? '🔴 Zaroori' : '🔴 Urgent')
                        : priorityFilter === 'medium' ? (isHinglish ? '🟡 Medium' : '🟡 Medium')
                        : (isHinglish ? '🟢 Normal' : '🟢 Normal')} ✕
                    </Text>
                  </TouchableOpacity>
                )}

                {searchQuery.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.filterChip}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={styles.filterChipText}>🔍 "{searchQuery}" ✕</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.clearAllChip}
                  onPress={resetAllFilters}
                >
                  <Text style={styles.clearAllChipText}>{isHinglish ? 'Saaf Karein' : 'Reset All'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Segmented Status Tab Pills */}
            <View style={styles.tabsRow}>
              {(
                [
                  { id: 'all', label: isHinglish ? 'Sabhi' : 'All', count: stats.totalCreated },
                  { id: 'done', label: isHinglish ? 'Pura Hua' : 'Completed', count: stats.totalCompleted },
                  { id: 'pending', label: isHinglish ? 'Active' : 'Active', count: stats.activeTasks },
                  { id: 'missed', label: isHinglish ? 'Missed' : 'Missed', count: stats.totalMissed },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => {
                      setActiveTab(tab.id);
                      setDisplayLimit(10);
                    }}
                    activeOpacity={0.85}
                    style={styles.tabTouch}
                  >
                    <View style={[styles.tabBtn, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}>
                      <Text style={[styles.tabBtnText, isActive ? styles.tabBtnTextActive : styles.tabBtnTextInactive]}>
                        {tab.label}
                      </Text>
                      <View style={[styles.tabBadge, isActive ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
                        <Text style={[styles.tabBadgeText, isActive ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive]}>
                          {tab.count}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 10-Task View Notice & Timeline Header Row */}
            <View style={styles.timelineHeaderRow}>
              <View style={styles.timelineHeadingGroup}>
                <Text style={styles.timelineHeading}>
                  {isHinglish ? '🕒 Pichhle Kaam (Past Tasks)' : '🕒 Past Tasks'}
                </Text>
                <Text style={styles.timelineSubheading}>
                  {isHinglish
                    ? `Navinatam se purana · Pehle 10 task dikhaye ja rahe hain`
                    : `Sorted newest to oldest · Showing latest 10 tasks`}
                </Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>
                  {displayedTasks.length} / {filteredTasks.length}
                </Text>
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          filteredTasks.length > 10 ? (
            <View style={styles.paginationCard}>
              <View style={styles.paginationHeader}>
                <Text style={styles.paginationInfo}>
                  {isHinglish
                    ? `Pehle 10 kaam dikhaye gaye hain (${displayedTasks.length}/${filteredTasks.length}). Baki pichhle tasks dekhne ke liye load karein ya filter se khojein.`
                    : `Displaying 10 of ${filteredTasks.length} tasks. Load more past tasks or use filter to search specific dates.`}
                </Text>
              </View>

              <View style={styles.paginationBtnRow}>
                {displayedTasks.length < filteredTasks.length ? (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={() => setDisplayLimit((prev) => prev + 10)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.loadMoreBtnText}>
                      {isHinglish ? '📜 Pichhle 10 Aur Kaam Dekhein (+10)' : '📜 Load Next 10 Past Tasks'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {displayedTasks.length < filteredTasks.length ? (
                  <TouchableOpacity
                    style={styles.showAllBtn}
                    onPress={() => setDisplayLimit(filteredTasks.length)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.showAllBtnText}>
                      {isHinglish ? `Sabhi Dekhein (${filteredTasks.length})` : `Show All (${filteredTasks.length})`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.collapseBtn}
                    onPress={() => setDisplayLimit(10)}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.collapseBtnText}>
                      {isHinglish ? '▲ Wapas 10 Kaam Par Sametein' : '▲ Collapse to 10 Tasks'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.filterPromptBtn}
                onPress={() => setIsFilterModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.filterPromptText}>
                  {isHinglish
                    ? '🔍 Pichhle kisi bhi din ka task filter se khojein →'
                    : '🔍 Search any previous date with Filter →'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color="#EA580C" size="large" />
              <Text style={styles.emptySub}>
                {isHinglish ? 'Database se itihaas load ho raha hai...' : 'Loading task history from database...'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>📜</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || timeframeFilter !== 'all' || priorityFilter !== 'all'
                  ? (isHinglish ? 'Koi task nahi mila' : 'No matching tasks found')
                  : (isHinglish ? 'Abhi tak koi task record nahi hai' : 'No task history recorded yet')}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery || timeframeFilter !== 'all' || priorityFilter !== 'all'
                  ? (isHinglish ? 'Chune gaye filters ke anuroop koi record nahi mila. Filters badal kar dobara dekhein.' : 'No tasks match your selected filters. Try changing or clearing filters.')
                  : (isHinglish
                    ? 'Aap jo bhi task banayenge, uska poora record yahan database me hamesha surakshit rahega.'
                    : 'Every task you create is securely recorded and permanently archived here in your database.')}
              </Text>

              {activeFilterCount > 0 ? (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={resetAllFilters}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyActionBtnText}>
                    {isHinglish ? 'Sabhi Filter Saaf Karein' : 'Clear All Filters'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.createTaskTouch}
                  onPress={() => navigation.navigate('AddTask')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.createTaskTouchText}>
                    {isHinglish ? '+ Naya Task Jodein' : '+ Create Your First Task'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* Interactive Filter Modal for Searching Previous Past Tasks */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setIsFilterModalVisible(false)}
          />
          <View style={[styles.filterModalCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            {/* Modal Drag Handle */}
            <View style={styles.modalIndicator} />

            {/* Modal Header */}
            <View style={styles.filterModalHeader}>
              <View style={styles.filterModalHeaderLeft}>
                <View style={styles.filterModalIconWrap}>
                  <Text style={{ fontSize: 18 }}>⚡</Text>
                </View>
                <View>
                  <Text style={styles.filterModalTitle}>
                    {isHinglish ? 'Pichhle Tasks Filter Karein' : 'Filter Past Tasks'}
                  </Text>
                  <Text style={styles.filterModalSub}>
                    {isHinglish ? 'Tareekh, status ya priority se purane kaam khojein' : 'Find previous tasks by date, priority, or status'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.detailModalCloseBtn}
                onPress={() => setIsFilterModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.detailModalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterModalScroll}>
              {/* Section 1: Timeframe / Date Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  📅 {isHinglish ? 'Tareekh / Samay Chunein (Date Range)' : 'Select Date / Timeframe'}
                </Text>
                <View style={styles.filterGrid}>
                  {[
                    { id: 'all', label: isHinglish ? 'Sabhi Din (All Time)' : 'All Time' },
                    { id: 'today', label: isHinglish ? 'Aaj (Today)' : 'Today' },
                    { id: 'yesterday', label: isHinglish ? 'Beeta Kal (Yesterday)' : 'Yesterday' },
                    { id: 'last7', label: isHinglish ? 'Pichhle 7 Din' : 'Last 7 Days' },
                    { id: 'last30', label: isHinglish ? 'Pichhle 30 Din' : 'Last 30 Days' },
                    { id: 'thisMonth', label: isHinglish ? 'Is Mahine' : 'This Month' },
                  ].map((item) => {
                    const isSelected = timeframeFilter === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.filterChoicePill, isSelected && styles.filterChoicePillActive]}
                        onPress={() => setTimeframeFilter(item.id as TimeframeFilter)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.filterChoiceText, isSelected && styles.filterChoiceTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Section 2: Status */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  ✓ {isHinglish ? 'Kaam Ka Status' : 'Task Status'}
                </Text>
                <View style={styles.filterGrid}>
                  {[
                    { id: 'all', label: isHinglish ? 'Sabhi (All)' : 'All' },
                    { id: 'done', label: isHinglish ? '✓ Pura Hua (Completed)' : '✓ Completed' },
                    { id: 'pending', label: isHinglish ? '⏳ Active / Chal Raha Hai' : '⏳ In Progress' },
                    { id: 'missed', label: isHinglish ? '✗ Chhoot Gaya (Missed)' : '✗ Missed' },
                  ].map((item) => {
                    const isSelected = activeTab === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.filterChoicePill, isSelected && styles.filterChoicePillActive]}
                        onPress={() => setActiveTab(item.id as FilterTab)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.filterChoiceText, isSelected && styles.filterChoiceTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Section 3: Priority */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  🎯 {isHinglish ? 'Priority (Prathamikta)' : 'Priority Level'}
                </Text>
                <View style={styles.filterGrid}>
                  {[
                    { id: 'all', label: isHinglish ? 'Sabhi Priority' : 'All Priorities' },
                    { id: 'zaroori', label: isHinglish ? '🔴 Zaroori (Urgent)' : '🔴 Urgent' },
                    { id: 'medium', label: isHinglish ? '🟡 Madhyam (Medium)' : '🟡 Medium' },
                    { id: 'normal', label: isHinglish ? '🟢 Samanya (Normal)' : '🟢 Normal' },
                  ].map((item) => {
                    const isSelected = priorityFilter === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.filterChoicePill, isSelected && styles.filterChoicePillActive]}
                        onPress={() => setPriorityFilter(item.id as PriorityFilter)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.filterChoiceText, isSelected && styles.filterChoiceTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Matching Count Preview Card */}
              <View style={styles.matchingPreviewCard}>
                <Text style={styles.matchingPreviewIcon}>📊</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchingPreviewTitle}>
                    {isHinglish
                      ? `${filteredTasks.length} Purane Kaam Mile`
                      : `${filteredTasks.length} Matching Tasks Found`}
                  </Text>
                  <Text style={styles.matchingPreviewSub}>
                    {isHinglish
                      ? 'Apply karne par yahi tasks screen par dikhenge.'
                      : 'These tasks will be displayed upon applying.'}
                  </Text>
                </View>
              </View>

              {/* Modal Action Buttons */}
              <View style={styles.modalFilterActionRow}>
                <TouchableOpacity
                  style={styles.modalResetBtn}
                  onPress={resetAllFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalResetBtnText}>{isHinglish ? 'Reset Karein' : 'Reset'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalApplyBtn}
                  onPress={() => {
                    setDisplayLimit(10);
                    setIsFilterModalVisible(false);
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.modalApplyBtnText}>
                    {isHinglish
                      ? `✓ Filter Lagayein (${filteredTasks.length})`
                      : `✓ Apply Filter (${filteredTasks.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dedicated Read-Only Task History Details Modal - STRICTLY NO ACTION BUTTONS */}
      <Modal
        visible={Boolean(selectedTask)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setSelectedTask(null)}
          />
          <View style={[styles.detailModalCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            {/* Modal Drag Handle */}
            <View style={styles.modalIndicator} />

            {/* Modal Header */}
            <View style={styles.detailModalHeader}>
              <View style={styles.detailModalHeaderLeft}>
                <View style={styles.detailModalBadgeRow}>
                  <Text style={styles.detailModalBadgeText}>
                    {isHinglish ? '🔒 Read-Only History Record' : '🔒 Read-Only History Record'}
                  </Text>
                </View>
                <Text style={styles.detailModalTitle}>
                  {isHinglish ? 'Task Details' : 'Task Details'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.detailModalCloseBtn}
                onPress={() => setSelectedTask(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Close"
              >
                <Text style={styles.detailModalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailModalScroll}
            >
              {selectedTask && (() => {
                const isDone = selectedTask.completed === true || selectedTask.confirmationStatus === 'COMPLETED';
                const isMissed = selectedTask.confirmationStatus === 'MISSED';

                const statusLabel = isDone
                  ? (isHinglish ? '✓ Task Pura Hua' : '✓ Completed')
                  : isMissed
                    ? (isHinglish ? '✗ Task Chhoot Gaya (Missed)' : '✗ Missed')
                    : (isHinglish ? '⏳ Active / Chal Raha Hai' : '⏳ In Progress / Active');

                const statusDesc = isDone
                  ? (isHinglish ? 'Yeh task safalata se pura kiya gaya tha.' : 'This task was marked as completed.')
                  : isMissed
                    ? (isHinglish ? 'Tai samay par pura nahi ho saka ya chhoot gaya tha.' : 'This task was missed or left incomplete.')
                    : (isHinglish ? 'Yeh task abhi pura karne ke liye pending hai.' : 'This task is active and pending completion.');

                const heroBannerStyle = isDone
                  ? styles.heroBannerDone
                  : isMissed
                    ? styles.heroBannerMissed
                    : styles.heroBannerActive;

                const heroBannerTextStyle = isDone
                  ? styles.heroBannerTextDone
                  : isMissed
                    ? styles.heroBannerTextMissed
                    : styles.heroBannerTextActive;

                const createdTimeFormatted = formatFullTimestamp(
                  selectedTask.createdAt,
                  selectedTask.createdAtTimestamp
                );

                const scheduleDate = selectedTask.targetDate || selectedTask.date || '';
                const scheduleTime = selectedTask.reminderTime || selectedTask.time || selectedTask.deadlineTime || '';
                const scheduleFormatted = scheduleDate || scheduleTime
                  ? `${scheduleDate || ''} ${scheduleTime ? '• ' + scheduleTime : ''}`.trim()
                  : (isHinglish ? 'Koi samay tai nahi' : 'No deadline set');

                return (
                  <View style={styles.detailModalInner}>
                    {/* Status Banner */}
                    <View style={[styles.statusHeroBanner, heroBannerStyle]}>
                      <Text style={[styles.statusHeroTitle, heroBannerTextStyle]}>
                        {statusLabel}
                      </Text>
                      <Text style={styles.statusHeroSubtitle}>
                        {statusDesc}
                      </Text>
                    </View>

                    {/* Task Title Box */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>
                        {isHinglish ? 'TASK KA NAAM (TITLE)' : 'TASK TITLE'}
                      </Text>
                      <View style={styles.detailTitleBox}>
                        <Text style={styles.detailTitleText}>
                          {selectedTask.title}
                        </Text>
                      </View>
                    </View>

                    {/* Description or Notes Box (if present) */}
                    {Boolean(selectedTask.description || selectedTask.notes) && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionLabel}>
                          {isHinglish ? 'DETAILS AUR NOTES' : 'DESCRIPTION & NOTES'}
                        </Text>
                        <View style={styles.detailNotesBox}>
                          <Text style={styles.detailNotesText}>
                            {selectedTask.description || selectedTask.notes}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Meta Details Table/Grid */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>
                        {isHinglish ? 'TIMESTAMPS AUR RECORD DETAILS' : 'RECORD METADATA & TIMESTAMPS'}
                      </Text>

                      <View style={styles.detailGrid}>
                        {/* 1. Created At Date & Time */}
                        <View style={styles.detailGridItem}>
                          <Text style={styles.detailMetaLabel}>
                            {isHinglish ? '📅 Banane Ki Tareekh & Samay' : '📅 Creation Timestamp'}
                          </Text>
                          <Text style={styles.detailMetaValue}>
                            {createdTimeFormatted}
                          </Text>
                        </View>

                        {/* 2. Scheduled Target Date */}
                        <View style={styles.detailGridItem}>
                          <Text style={styles.detailMetaLabel}>
                            {isHinglish ? '⏰ Tai Deadline / Alert' : '⏰ Scheduled Alert'}
                          </Text>
                          <Text style={styles.detailMetaValue}>
                            {scheduleFormatted}
                          </Text>
                        </View>

                        {/* 3. Priority */}
                        <View style={styles.detailGridItem}>
                          <Text style={styles.detailMetaLabel}>
                            {isHinglish ? '🎯 Prathamikta (Priority)' : '🎯 Priority Level'}
                          </Text>
                          <View style={{ marginTop: 4 }}>
                            <PriorityChip priority={selectedTask.priority} size="md" />
                          </View>
                        </View>

                        {/* 4. Current Status */}
                        <View style={styles.detailGridItem}>
                          <Text style={styles.detailMetaLabel}>
                            {isHinglish ? '📊 Sthiti (Current Status)' : '📊 Status'}
                          </Text>
                          <Text style={[styles.detailMetaValue, { fontWeight: '800' }]}>
                            {statusLabel}
                          </Text>
                        </View>

                        {/* 5. Database Sync Verification */}
                        <View style={[styles.detailGridItem, { width: '100%' }]}>
                          <Text style={styles.detailMetaLabel}>
                            {isHinglish ? '🔒 Database Sync ID' : '🔒 Sync Record ID'}
                          </Text>
                          <Text style={styles.detailRecordIdText}>
                            {String(selectedTask.id)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Protection Notice Banner */}
                    <View style={styles.readOnlyNoticeBox}>
                      <Text style={styles.readOnlyNoticeIcon}>🛡️</Text>
                      <Text style={styles.readOnlyNoticeText}>
                        {isHinglish
                          ? 'History Safety: Yeh kewal dekhne ke liye (Read-Only) hai. Delete ya badlaav ke buttons hata diye gaye hain taaki aapka record safe rahe.'
                          : 'History Protection: All edit, delete, and action buttons are removed to preserve your permanent history.'}
                      </Text>
                    </View>

                    {/* Only Close Button - NO Delete, NO Edit, NO Complete buttons */}
                    <TouchableOpacity
                      style={styles.detailCloseActionBtn}
                      onPress={() => setSelectedTask(null)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.detailCloseActionBtnText}>
                        {isHinglish ? '✕ Band Karein' : '✕ Close'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TaskHistoryScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EDF2F4', // User's app signature background
  },
  topBrandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 6,
    marginRight: 2,
  },
  backBtnIcon: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '700',
  },
  brandBarTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  refreshHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshHeaderIcon: {
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerContainer: {
    gap: 10,
    marginBottom: spacing.sm,
  },
  heroWarmCard: {
    backgroundColor: '#FFF9F0', // User's signature warm sunrise header
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    gap: spacing.sm,
    ...shadows.soft,
  },
  heroWarmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroWarmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWarmIcon: {
    fontSize: 22,
  },
  heroWarmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  heroWarmSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  cloudSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  cloudSyncDot: {
    fontSize: 8,
    color: '#15803D',
  },
  cloudSyncText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  statCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    transform: [{ scale: 1.02 }],
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statIcon: {
    fontSize: 13,
    fontWeight: '800',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    height: 44,
    ...shadows.soft,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    gap: 5,
    ...shadows.soft,
  },
  filterButtonActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  filterButtonIcon: {
    fontSize: 14,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#FFFFFF',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#EA580C',
  },
  activeFilterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 2,
  },
  activeFilterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  clearAllChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clearAllChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabTouch: {
    flex: 1,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: '#EA580C', // User's vibrant accent button
    ...shadows.soft,
  },
  tabBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabBtnTextInactive: {
    color: '#64748B',
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  tabBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  tabBadgeTextInactive: {
    color: '#64748B',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  timelineHeadingGroup: {
    gap: 1,
  },
  timelineHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineSubheading: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  countPill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.card,
  },
  cardAccentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: 13,
    gap: 6,
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
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: -2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  badgeDone: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  badgeMissed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextDone: {
    color: '#15803D',
  },
  badgeTextMissed: {
    color: '#DC2626',
  },
  badgeTextActive: {
    color: '#EA580C',
  },
  taskTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskDescription: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timeTagValue: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  paginationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    ...shadows.soft,
  },
  paginationHeader: {
    alignItems: 'center',
  },
  paginationInfo: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  paginationBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loadMoreBtn: {
    flex: 1,
    backgroundColor: '#EA580C',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  showAllBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showAllBtnText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '800',
  },
  collapseBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  collapseBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPromptBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterPromptText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    marginTop: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyActionBtnText: {
    color: '#EA580C',
    fontSize: 12.5,
    fontWeight: '800',
  },
  createTaskTouch: {
    marginTop: 10,
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    ...shadows.soft,
  },
  createTaskTouchText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  filterModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 12,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  filterModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  filterModalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterModalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  filterModalScroll: {
    paddingVertical: 12,
    gap: 14,
  },
  filterSection: {
    gap: 8,
  },
  filterSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  filterChoicePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  filterChoicePillActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  filterChoiceText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  filterChoiceTextActive: {
    color: '#FFFFFF',
  },
  matchingPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  matchingPreviewIcon: {
    fontSize: 22,
  },
  matchingPreviewTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  matchingPreviewSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  modalFilterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  modalResetBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalApplyBtn: {
    flex: 2,
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  modalApplyBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 12,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  detailModalHeaderLeft: {
    flex: 1,
  },
  detailModalBadgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  detailModalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  detailModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalCloseBtnText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  detailModalScroll: {
    paddingVertical: 12,
  },
  detailModalInner: {
    gap: 12,
  },
  statusHeroBanner: {
    padding: 12,
    borderRadius: 12,
    gap: 3,
  },
  heroBannerDone: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  heroBannerMissed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  heroBannerActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  statusHeroTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  heroBannerTextDone: {
    color: '#15803D',
  },
  heroBannerTextMissed: {
    color: '#DC2626',
  },
  heroBannerTextActive: {
    color: '#EA580C',
  },
  statusHeroSubtitle: {
    fontSize: 11.5,
    color: '#475569',
  },
  detailSection: {
    gap: 5,
  },
  detailSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  detailTitleBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
  },
  detailNotesBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailNotesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  detailGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  detailGridItem: {
    gap: 2,
  },
  detailMetaLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  detailMetaValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailRecordIdText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  readOnlyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  readOnlyNoticeIcon: {
    fontSize: 16,
  },
  readOnlyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
    fontWeight: '500',
  },
  detailCloseActionBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  detailCloseActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
