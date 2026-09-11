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

const CATEGORIES = [
  { id: 'bug', label: '🐞 Bug / Problem' },
  { id: 'notification', label: '🔔 Alert / Sound' },
  { id: 'account', label: '👤 Account / Login' },
  { id: 'subscription', label: '💳 Subscription / Pay' },
  { id: 'feature', label: '💡 Feature Request' },
  { id: 'other', label: '❓ Other' },
];

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tickets list
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

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
      Alert.alert('Subject Required', 'Kripya samasya ka mukhya vishay likhein.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Description Required', 'Kripya samasya ka poora vivaran (details) likhein.');
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
          '✅ Ticket Submitted!',
          'Aapki ticket darj ho gayi hai. Hamari support team jald hi iska samadhan karegi.',
          [{ text: 'Theek Hai' }]
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
        'Submission Error',
        err?.message || err?.error || 'Ticket submit karne mein problem aayi. Kripya punah prayas karein.'
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
                  <View>
                    <Text style={styles.title}>Help & Support</Text>
                    <Text style={styles.subtitle}>Samasya darj karein • Raise an Issue</Text>
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
                    + New Ticket
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
                    My Tickets ({tickets.length})
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
                  <Text style={styles.fieldLabel}>Select Category / Samasya ka Prakar</Text>
                  <View style={styles.categoriesGrid}>
                    {CATEGORIES.map((cat) => {
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

                  <Text style={styles.fieldLabel}>Subject / Vishay</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Alarm nahi baja, OTP receive nahi hua"
                    placeholderTextColor="#94A3B8"
                    value={subject}
                    onChangeText={setSubject}
                    maxLength={150}
                  />

                  <Text style={styles.fieldLabel}>Details / Vivaran</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Apni pareshani vistaar se likhein taaki hum jaldi madad kar sakein..."
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
                      <Text style={styles.submitBtnText}>Submit Ticket • Darj Karein</Text>
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
                    <Text style={styles.refreshBarTitle}>Your Raised Issues</Text>
                    <TouchableOpacity onPress={fetchMyTickets} style={styles.refreshLink}>
                      <Text style={styles.refreshLinkText}>🔄 Refresh</Text>
                    </TouchableOpacity>
                  </View>

                  {loadingTickets ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={colors.primaryOrange} />
                      <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Loading tickets...</Text>
                    </View>
                  ) : tickets.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyIcon}>🎉</Text>
                      <Text style={styles.emptyTitle}>No active tickets</Text>
                      <Text style={styles.emptySubtitle}>
                        Aapne abhi tak koi ticket darj nahi ki hai. Agar koi pareshani ho toh "+ New Ticket" se likhein!
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
                                {isResolved ? '✓ Resolved' : isInProgress ? '● In Progress' : '● Open'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.ticketSubject}>{t.subject}</Text>
                          <Text style={styles.ticketMessage}>{t.message}</Text>
                          <Text style={styles.ticketDate}>Raised: {dateStr}</Text>

                          {/* Admin Reply Box */}
                          {t.admin_reply && (
                            <View style={styles.adminReplyBox}>
                              <View style={styles.adminReplyHeader}>
                                <Text style={styles.adminReplyTitle}>👨‍💼 Support Team Reply</Text>
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
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 6,
    marginHorizontal: 22,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabBtn: {
    backgroundColor: '#FFFFFF',
    ...shadows.soft,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: colors.primaryOrange,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  catChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: colors.primaryOrange,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 6,
  },
  textArea: {
    minHeight: 110,
    lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: colors.primaryOrange,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
    ...shadows.soft,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshLink: {
    padding: 6,
  },
  refreshLinkText: {
    fontSize: 13,
    color: colors.primaryOrange,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...shadows.soft,
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
    letterSpacing: 0.5,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusResolved: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  statusTextInProgress: {
    color: '#1D4ED8',
  },
  statusTextResolved: {
    color: '#16A34A',
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  ticketMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 10,
  },
  ticketDate: {
    fontSize: 11,
    color: '#94A3B8',
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
    marginBottom: 6,
  },
  adminReplyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  adminReplyDate: {
    fontSize: 11,
    color: '#15803D',
  },
  adminReplyText: {
    fontSize: 13,
    color: '#14532D',
    lineHeight: 18,
  },
});
