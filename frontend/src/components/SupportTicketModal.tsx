import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { apiClient } from '../api/client';
import { useAppStore } from '../store';

interface SupportTicketModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  admin_reply?: string;
  admin_replied_at?: string;
  created_at: string;
  updated_at: string;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ visible, onClose }) => {
  const { language } = useAppStore();
  const isHindi = language === 'hi';

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tickets list
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const categories = isHindi
    ? [
        { id: 'bug', label: '🐞 Bug / Technical Issue' },
        { id: 'notification', label: '🔔 Alert aur Sound Problem' },
        { id: 'account', label: '👤 Account aur Login Issue' },
        { id: 'subscription', label: '💳 Pro Subscription Issue' },
        { id: 'feature', label: '💡 Naya Feature Suggestion' },
        { id: 'other', label: '❓ Anya Sawaal' },
      ]
    : [
        { id: 'bug', label: '🐞 Bug / Problem' },
        { id: 'notification', label: '🔔 Alert & Sound' },
        { id: 'account', label: '👤 Account & Login' },
        { id: 'subscription', label: '💳 Pro Subscription' },
        { id: 'feature', label: '💡 Feature Request' },
        { id: 'other', label: '❓ Other Inquiry' },
      ];

  useEffect(() => {
    if (visible) {
      fetchMyTickets();
    }
  }, [visible]);

  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res: any = await apiClient.get('/tickets/my');
      if (res?.tickets) {
        setTickets(res.tickets);
      }
    } catch (err) {
      console.warn('Could not fetch user tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert(
        isHindi ? 'Subject Zaroori Hai' : 'Subject Required',
        isHindi ? 'Kripya problem ka main subject darj karein.' : 'Please enter a subject for your issue.'
      );
      return;
    }
    if (!message.trim()) {
      Alert.alert(
        isHindi ? 'Details Zaroori Hain' : 'Details Required',
        isHindi ? 'Kripya problem ka poora vivaran detail mein likhein.' : 'Please describe your issue in detail.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await apiClient.post('/tickets', {
        category,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (res?.ok) {
        Alert.alert(
          isHindi ? '✅ Ticket Darj Ho Gayi!' : '✅ Ticket Submitted!',
          isHindi
            ? 'Aapki support ticket darj ho gayi hai. Hamari team jald hi check karegi.'
            : 'Your support ticket has been submitted. Our team will review it shortly.',
          [{ text: isHindi ? 'Theek Hai' : 'OK' }]
        );
        setSubject('');
        setMessage('');
        setCategory('bug');
        await fetchMyTickets();
        setActiveTab('list');
      } else {
        throw new Error(res?.error || 'Submission failed');
      }
    } catch (err: any) {
      Alert.alert(
        isHindi ? 'Truti' : 'Submission Error',
        err?.message ||
          err?.error ||
          (isHindi
            ? 'Ticket submit karne mein problem aayi. Kripya dobara try karein.'
            : 'Failed to submit ticket. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headIcon}>🎫</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.title} numberOfLines={1}>Help & Support</Text>
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {isHindi ? 'Apni samasya ya issue darj karein' : 'Submit your issue or request assistance'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'create' && styles.activeTabBtn]}
                  onPress={() => setActiveTab('create')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
                    {isHindi ? '+ Nayi Ticket' : '+ New Ticket'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'list' && styles.activeTabBtn]}
                  onPress={() => {
                    setActiveTab('list');
                    fetchMyTickets();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
                    {isHindi ? `Meri Tickets (${tickets.length})` : `My Tickets (${tickets.length})`}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab 1: Create Ticket */}
              {activeTab === 'create' && (
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.fieldLabel}>
                    {isHindi ? 'Problem ki category chunein' : 'Select Category'}
                  </Text>
                  <View style={styles.categoriesGrid}>
                    {categories.map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.catChip, isSelected && styles.catChipActive]}
                          onPress={() => setCategory(cat.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>{isHindi ? 'Vishay (Subject)' : 'Subject'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      isHindi
                        ? 'Jaise: Alarm nahi baja, task save nahi hua'
                        : 'e.g. Alarm did not ring, task did not save'
                    }
                    placeholderTextColor="#94A3B8"
                    value={subject}
                    onChangeText={setSubject}
                    maxLength={150}
                  />

                  <Text style={styles.fieldLabel}>{isHindi ? 'Poora Vivaran (Details)' : 'Details'}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={
                      isHindi
                        ? 'Apni problem detail me likhein taaki support team help kar sake...'
                        : 'Describe your issue in detail so our support team can assist you...'
                    }
                    placeholderTextColor="#94A3B8"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {isHindi ? 'Ticket Darj Karein' : 'Submit Ticket'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Tab 2: My Tickets List */}
              {activeTab === 'list' && (
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.refreshBar}>
                    <Text style={styles.refreshBarTitle}>
                      {isHindi ? 'Aapki darj ki gayi tickets' : 'Your Support Tickets'}
                    </Text>
                    <TouchableOpacity onPress={fetchMyTickets} style={styles.refreshLink}>
                      <Text style={styles.refreshLinkText}>
                        🔄 Refresh
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {loadingTickets ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={colors.primaryOrange} />
                      <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>
                        {isHindi ? 'Tickets load ho rahi hain...' : 'Loading tickets...'}
                      </Text>
                    </View>
                  ) : tickets.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyIcon}>🎉</Text>
                      <Text style={styles.emptyTitle}>
                        {isHindi ? 'Koi active ticket nahi hai' : 'No active tickets'}
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        {isHindi
                          ? 'Aapne abhi tak koi support ticket darj nahi ki hai. Agar koi problem ho toh upar "+ Nayi Ticket" par tap karein.'
                          : 'You have not raised any support tickets yet. Tap "+ New Ticket" above if you need help.'}
                      </Text>
                    </View>
                  ) : (
                    tickets.map((t) => {
                      const isResolved = t.status === 'resolved';
                      const isInProgress = t.status === 'in_progress';
                      const dateStr = new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const statusText = isResolved
                        ? isHindi ? '✓ Resolve Ho Gaya' : '✓ Resolved'
                        : isInProgress
                        ? isHindi ? '● Kaam Chal Raha Hai' : '● In Progress'
                        : isHindi ? '● Open Hai' : '● Open';

                      return (
                        <View key={t.id} style={styles.ticketCard}>
                          <View style={styles.ticketCardHeader}>
                            <Text style={styles.ticketCategory}>
                              {t.category.toUpperCase()}
                            </Text>
                            <View
                              style={[
                                styles.statusBadge,
                                isResolved && styles.statusResolved,
                                isInProgress && styles.statusInProgress,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusText,
                                  isResolved && styles.statusTextResolved,
                                  isInProgress && styles.statusTextInProgress,
                                ]}
                              >
                                {statusText}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.ticketSubject}>{t.subject}</Text>
                          <Text style={styles.ticketMessage}>{t.message}</Text>
                          <Text style={styles.ticketDate}>
                            {isHindi ? `Darj tareekh: ${dateStr}` : `Raised: ${dateStr}`}
                          </Text>

                          {/* Admin Reply Box */}
                          {t.admin_reply && (
                            <View style={styles.adminReplyBox}>
                              <View style={styles.adminReplyHeader}>
                                <Text style={styles.adminReplyTitle}>
                                  {isHindi ? '👨‍💼 Support Team Ka Reply' : '👨‍💼 Support Team Reply'}
                                </Text>
                                {t.admin_replied_at && (
                                  <Text style={styles.adminReplyDate}>
                                    {new Date(t.admin_replied_at).toLocaleDateString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.adminReplyText}>{t.admin_reply}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTabBtn: {
    backgroundColor: colors.primaryOrange,
    borderColor: colors.primaryOrange,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 30,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 10,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.primaryOrange,
  },
  catChipText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: colors.primaryOrange,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
  textArea: {
    height: 110,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: colors.primaryOrange,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...shadows.card,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  refreshBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  refreshBarTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  refreshLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primaryOrange,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  statusInProgress: {
    backgroundColor: '#FEF3C7',
  },
  statusResolved: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusTextInProgress: {
    color: '#D97706',
  },
  statusTextResolved: {
    color: '#16A34A',
  },
  ticketSubject: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  ticketMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  adminReplyBox: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
  },
  adminReplyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminReplyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  adminReplyDate: {
    fontSize: 11,
    color: '#15803D',
  },
  adminReplyText: {
    fontSize: 12.5,
    color: '#14532D',
    lineHeight: 18,
  },
});

export default SupportTicketModal;
