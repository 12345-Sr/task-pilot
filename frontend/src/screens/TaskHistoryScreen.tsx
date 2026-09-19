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
  Modal,
  ScrollView,
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
  const isHinglish = language === 'hi';

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskHistoryItem | null>(null);

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
      ? isHinglish ? '✓ Pura Hua' : '✓ Completed'
      : isMissed
        ? isHinglish ? '✗ Chhoot Gaya' : '✗ Missed'
        : isHinglish ? '⏳ Active' : '⏳ In Progress';

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
              {isHinglish ? '📜 Task History & Audit' : '📜 Task History & Audit'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isHinglish ? 'Aapke sabhi banaye gaye tasks ka safe record' : 'Permanent database record of all created tasks'}
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
            {isHinglish
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
                <Text style={styles.statLabel}>{isHinglish ? 'Total' : 'Total'}</Text>
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
                <Text style={styles.statLabel}>{isHinglish ? 'Pura' : 'Done'}</Text>
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
                <Text style={styles.statLabel}>{isHinglish ? 'Active' : 'Active'}</Text>
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
                <Text style={styles.statLabel}>{isHinglish ? 'Rate' : 'Success'}</Text>
              </TouchableOpacity>
            </View>

            {/* Live Search Bar */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={isHinglish ? 'Kaam ke naam ya description se khojein...' : 'Search task history by title or notes...'}
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
                  {isHinglish ? '🕒 Creation Timeline' : '🕒 Creation Timeline'}
                </Text>
                <Text style={styles.timelineSubheading}>
                  {isHinglish ? 'Navinatam se purana kram' : 'Sorted newest to oldest'}
                </Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>
                  {tasks.length} {isHinglish ? 'records' : 'tasks'}
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
                {isHinglish ? 'Database se itihaas load ho raha hai...' : 'Loading task history from database...'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>📜</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? isHinglish ? 'Koi task nahi mila' : 'No matching tasks found'
                  : isHinglish ? 'Abhi tak koi task record nahi hai' : 'No task history recorded yet'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? isHinglish ? `"${searchQuery}" ke anuroop koi record nahi mila.` : `No tasks match "${searchQuery}". Try a different keyword.`
                  : isHinglish
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
                    {isHinglish ? 'Search Saaf Karein' : 'Clear Search'}
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
                      {isHinglish ? '+ Naya Task Jodein' : '+ Create Your First Task'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

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
                          <View style={styles.detailGridIconCircle}>
                            <Text style={styles.detailGridIcon}>📅</Text>
                          </View>
                          <View style={styles.detailGridItemContent}>
                            <Text style={styles.detailGridItemLabel}>
                              {isHinglish ? 'Banane Ki Date & Time (Created At)' : 'Creation Date & Time'}
                            </Text>
                            <Text style={styles.detailGridItemValue}>
                              {createdTimeFormatted}
                            </Text>
                          </View>
                        </View>

                        {/* 2. Scheduled Time/Date */}
                        <View style={styles.detailGridItem}>
                          <View style={styles.detailGridIconCircle}>
                            <Text style={styles.detailGridIcon}>⏰</Text>
                          </View>
                          <View style={styles.detailGridItemContent}>
                            <Text style={styles.detailGridItemLabel}>
                              {isHinglish ? 'Schedule Deadline (Due Date & Time)' : 'Scheduled Due Date & Time'}
                            </Text>
                            <Text style={styles.detailGridItemValue}>
                              {scheduleFormatted}
                            </Text>
                          </View>
                        </View>

                        {/* 3. Priority */}
                        <View style={styles.detailGridItem}>
                          <View style={styles.detailGridIconCircle}>
                            <Text style={styles.detailGridIcon}>⚡</Text>
                          </View>
                          <View style={styles.detailGridItemContent}>
                            <Text style={styles.detailGridItemLabel}>
                              {isHinglish ? 'Priority Level' : 'Priority Level'}
                            </Text>
                            <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                              <PriorityChip priority={selectedTask.priority} size="sm" />
                            </View>
                          </View>
                        </View>

                        {/* 4. Completion Status */}
                        <View style={styles.detailGridItem}>
                          <View style={styles.detailGridIconCircle}>
                            <Text style={styles.detailGridIcon}>🎯</Text>
                          </View>
                          <View style={styles.detailGridItemContent}>
                            <Text style={styles.detailGridItemLabel}>
                              {isHinglish ? 'Task Ka Status' : 'Audit Status'}
                            </Text>
                            <Text style={[styles.detailGridItemValue, { color: isDone ? '#059669' : isMissed ? '#DC2626' : '#2563EB' }]}>
                              {isDone
                                ? (isHinglish ? 'Pura Hua (Completed)' : 'Completed')
                                : isMissed
                                  ? (isHinglish ? 'Chhoot Gaya (Missed)' : 'Missed')
                                  : (isHinglish ? 'Active (Pending)' : 'In Progress')}
                            </Text>
                          </View>
                        </View>

                        {/* 5. Repeat Monthly */}
                        {selectedTask.repeatMonthly ? (
                          <View style={styles.detailGridItem}>
                            <View style={styles.detailGridIconCircle}>
                              <Text style={styles.detailGridIcon}>🔁</Text>
                            </View>
                            <View style={styles.detailGridItemContent}>
                              <Text style={styles.detailGridItemLabel}>
                                {isHinglish ? 'Monthly Repeat (Har Mahine)' : 'Monthly Recurrence'}
                              </Text>
                              <Text style={styles.detailGridItemValue}>
                                {isHinglish ? 'Haan (Har mahine repeat hoga)' : 'Yes (Repeats Monthly)'}
                              </Text>
                            </View>
                          </View>
                        ) : null}

                        {/* 6. Database Storage Info */}
                        <View style={styles.detailGridItem}>
                          <View style={styles.detailGridIconCircle}>
                            <Text style={styles.detailGridIcon}>🛡️</Text>
                          </View>
                          <View style={styles.detailGridItemContent}>
                            <Text style={styles.detailGridItemLabel}>
                              {isHinglish ? 'Database Record Status' : 'Database Storage'}
                            </Text>
                            <Text style={styles.detailGridItemValue}>
                              {isHinglish ? 'Database me safe aur secure recorded hai' : 'Safely preserved in database'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Read-Only Banner: Confirms no mutation buttons */}
                    <View style={styles.readOnlyNoticeBox}>
                      <Text style={styles.readOnlyNoticeIcon}>🔒</Text>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  detailModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: 12,
    paddingHorizontal: 20,
    ...shadows.card,
  },
  modalIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailModalHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  detailModalBadgeRow: {
    marginBottom: 4,
  },
  detailModalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.3,
  },
  detailModalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalCloseBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
  },
  detailModalScroll: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  detailModalInner: {
    gap: 16,
  },
  statusHeroBanner: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
    borderWidth: 1,
  },
  heroBannerDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  heroBannerMissed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  heroBannerActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusHeroTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  heroBannerTextDone: {
    color: '#059669',
  },
  heroBannerTextMissed: {
    color: '#DC2626',
  },
  heroBannerTextActive: {
    color: '#2563EB',
  },
  statusHeroSubtitle: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  detailSection: {
    gap: 6,
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  detailTitleBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 23,
  },
  detailNotesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  detailNotesText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
  },
  detailGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.soft,
  },
  detailGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  detailGridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailGridIcon: {
    fontSize: 17,
  },
  detailGridItemContent: {
    flex: 1,
  },
  detailGridItemLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  detailGridItemValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 2,
  },
  readOnlyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  readOnlyNoticeIcon: {
    fontSize: 16,
  },
  readOnlyNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '600',
  },
  detailCloseActionBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.card,
  },
  detailCloseActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
