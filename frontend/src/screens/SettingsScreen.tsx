import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAppStore } from '../store';
import { t, LANGUAGES } from '../i18n';
import { useUserProfile, useSubscription } from '../hooks';
import BrandLogo from '../components/BrandLogo';
import ConfirmDialog from '../components/ConfirmDialog';
import { NotificationService } from '../services/notifications/notification.service';
import { userRepository } from '../api';
import { SupportedLanguage } from '../types';
import { LanguageModal } from '../components/LanguageModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';
import { SupportTicketModal } from '../components/SupportTicketModal';
import { PaywallModal } from '../components/PaywallModal';
import { PremiumStatusModal } from '../components/PremiumStatusModal';
import { AlarmSoundModal } from '../components/AlarmSoundModal';
import { SoundService } from '../services/sound/sound.service';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {
    language,
    setLanguage,
    isPremium,
    logout,
    setPaywallVisible,
    setPremiumStatusVisible,
    subscriptionInfo,
    isAuthenticated,
    isGuest,
    selectedAlarmSound,
    setSelectedAlarmSound,
  } = useAppStore();
  const isHindi = language === 'hi';
  const { data: user } = useUserProfile();
  useSubscription();

  const formattedExpiry = subscriptionInfo?.currentPeriodEnd
    ? new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : (isHindi ? '30 Din Active' : '30 Days Active');

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [morningNotification, setMorningNotification] = useState(true);
  const [eveningNotification, setEveningNotification] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alarmSoundModalVisible, setAlarmSoundModalVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    setLanguage(code);
    setLanguageModalVisible(false);
    if (isAuthenticated) {
      try {
        await userRepository.updateLanguage(code);
      } catch (err) {
        console.warn('Failed to update language on backend', err);
      }
    }
  };

  const handleLogout = () => {
    setLogoutDialogVisible(false);
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Language' }],
    });
  };

  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === language)?.native || 'English';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
      >
        {/* Screen Header matching Mockup Screen 9 */}
        <View style={styles.settingsTopHeader}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtnSettings}
              accessibilityLabel="Back"
            >
              <Text style={styles.backBtnIconSettings}>‹</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.settingsTitleText}>Settings</Text>
        </View>

        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'TA')}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {user?.name || (user?.email ? user.email.split('@')[0] : t(language, 'friend'))}
            </Text>
            {Boolean(user?.email) && (
              <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">
                {user?.email}
              </Text>
            )}
            <View style={[styles.planPill, isPremium ? styles.planPillPro : styles.planPillFree]}>
              <Text style={[styles.planPillText, isPremium ? styles.planPillProText : styles.planPillFreeText]}>
                {isPremium ? t(language, 'premium_plan_tag') : t(language, 'free_plan_tag')}
              </Text>
            </View>
          </View>
        </View>

        {/* Subscription & Membership Section (Single source of truth, no duplication) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            {isHindi ? 'Subscription aur Membership' : 'Subscription & Membership'}
          </Text>

          {isPremium ? (
            /* PAID USER: Premium Active Status Card */
            <View style={styles.proCard}>
              <View style={styles.proCardHeader}>
                <View style={styles.proCrownWrap}>
                  <Text style={{ fontSize: 22 }}>👑</Text>
                </View>
                <View style={styles.proTitleWrap}>
                  <Text style={styles.proCardTitle}>
                    {isHindi ? 'TaskAlert Pro Active' : 'TaskAlert Pro Active'}
                  </Text>
                  <Text style={styles.proCardPrice}>₹399 / {isHindi ? 'mahina' : 'month'}</Text>
                </View>
                <View style={styles.proActivePill}>
                  <Text style={styles.proActivePillText}>ACTIVE ✓</Text>
                </View>
              </View>

              <View style={styles.proCardDivider} />

              <View style={styles.proDetailsRow}>
                <View style={styles.proDetailItem}>
                  <Text style={styles.proDetailLabel}>{isHindi ? 'Validity / Renewal' : 'Validity / Renewal'}</Text>
                  <Text style={styles.proDetailValue} numberOfLines={1}>{formattedExpiry}</Text>
                </View>
                <View style={styles.proDetailItem}>
                  <Text style={styles.proDetailLabel}>{isHindi ? 'Plan Status' : 'Plan Status'}</Text>
                  <Text style={[styles.proDetailValue, { color: '#16A34A' }]}>{isHindi ? 'Unlimited Access' : 'Unlimited Access'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.proManageBtn}
                activeOpacity={0.85}
                onPress={() => setPremiumStatusVisible(true)}
              >
                <Text style={styles.proManageBtnText}>
                  {isHindi ? '👑 Plan Details aur Invoice Dekhein →' : '👑 View Plan Details & Status →'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* FREE USER: Clean Pro Upgrade Card */
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeCardHeader}>
                <View style={styles.upgradeCrownWrap}>
                  <Text style={{ fontSize: 22 }}>👑</Text>
                </View>
                <View style={styles.upgradeTitleWrap}>
                  <Text style={styles.upgradeCardTitle}>
                    {isHindi ? 'TaskAlert Pro Upgrade Karein' : 'Upgrade to TaskAlert Pro'}
                  </Text>
                  <Text style={styles.upgradeCardPrice}>₹399 / {isHindi ? 'mahina' : 'month'}</Text>
                </View>
                <View style={styles.freePill}>
                  <Text style={styles.freePillText}>{isHindi ? 'Free Tier' : 'Free Tier'}</Text>
                </View>
              </View>

              <View style={styles.upgradePerksList}>
                <View style={styles.perkRow}>
                  <Text style={styles.perkCheck}>✓</Text>
                  <Text style={styles.perkText}>
                    {isHindi ? 'Unlimited daily tasks aur sound reminders' : 'Unlimited daily tasks & sound reminders'}
                  </Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkCheck}>✓</Text>
                  <Text style={styles.perkText}>
                    {isHindi ? 'Voice alarm aur custom alert tones' : 'Voice alarms & sound ringtones'}
                  </Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkCheck}>✓</Text>
                  <Text style={styles.perkText}>
                    {isHindi ? 'Cloud backup aur priority support' : 'Cloud sync & priority support'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.upgradeActionBtn}
                activeOpacity={0.88}
                onPress={() => setPaywallVisible(true)}
              >
                <Text style={styles.upgradeActionBtnText}>
                  {isHindi ? '👑 Upgrade Now • Pay ₹399' : '👑 Upgrade Now • Pay ₹399'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.upgradeSecondaryBtn}
                activeOpacity={0.7}
                onPress={() => setPremiumStatusVisible(true)}
              >
                <Text style={styles.upgradeSecondaryBtnText}>
                  {isHindi ? 'Plan ke sabhi features aur details dekhein ›' : 'Compare all plan features & details ›'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t(language, 'preferences_title')}</Text>

          {/* Created Tasks History */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('TaskHistory')}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>📜</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>
                  {isHindi ? 'Tasks Banane Ka Itihaas' : 'Created Tasks History'}
                </Text>
                <Text style={styles.settingSubLabel}>
                  {isHindi
                    ? 'Aapke sabhi banaye gaye tasks ka poora timeline'
                    : 'Full archive & timeline of all tasks created'}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Language Selector (Opens In-Page Modal) */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌐</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>{t(language, 'language_title')}</Text>
                <Text style={styles.settingSubLabel}>
                  {isHindi ? 'App ki bhasha badlein' : 'Change app interface language'}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{currentLanguageLabel}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Morning Reminder */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌅</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>{t(language, 'morning_reminder_title')}</Text>
                <Text style={styles.settingSubLabel}>{t(language, 'morning_reminder_sub')}</Text>
              </View>
            </View>
            <Switch
              value={morningNotification}
              onValueChange={setMorningNotification}
              trackColor={{ false: '#E2E8F0', true: '#0D5C3A' }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Evening Review */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>{t(language, 'evening_review_title')}</Text>
                <Text style={styles.settingSubLabel}>{t(language, 'evening_review_sub')}</Text>
              </View>
            </View>
            <Switch
              value={eveningNotification}
              onValueChange={setEveningNotification}
              trackColor={{ false: '#E2E8F0', true: '#0D5C3A' }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Sound */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>{t(language, 'sound_vibration_title')}</Text>
                <Text style={styles.settingSubLabel}>
                  {isHindi ? 'Reminders ke audio alarms bajayein' : 'Audio alarms and reminder sounds'}
                </Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#E2E8F0', true: '#0D5C3A' }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Alarm Ringtone & Sound Tab Row (Opens Alarm App style Sound Modal) */}
          {soundEnabled && (
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setAlarmSoundModalVisible(true)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>⏰</Text>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>
                    {isHindi ? 'अलार्म टोन / साउंड' : 'Alarm Ringtone & Sound'}
                  </Text>
                  <Text style={styles.settingSubLabel}>
                    {isHindi
                      ? 'रिमाइंडर्स के लिए आवाज़ चुनें'
                      : 'Choose sound for reminder alarms'}
                  </Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>
                  {SoundService.getSoundMeta(selectedAlarmSound).emoji}{' '}
                  {SoundService.getSoundMeta(selectedAlarmSound).name}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Support & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{isHindi ? 'Support & Legal' : 'Support & Legal'}</Text>

          {/* Help & Support / Raise Ticket */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => setSupportModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🎫</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Help & Support</Text>
                <Text style={styles.settingSubLabel}>
                  {isHindi ? 'Ticket darj karein ya help paayein' : 'Raise an issue or request assistance'}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => setTermsModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>📜</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Terms & Conditions</Text>
                <Text style={styles.settingSubLabel}>
                  {isHindi ? 'Service ke niyam aur shartein' : 'Terms of service & agreements'}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🛡️</Text>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingSubLabel}>
                  {isHindi ? 'Data security aur privacy policy' : 'Data protection & privacy policy'}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t(language, 'app_info_title')}</Text>

          <View style={styles.aboutCard}>
            <BrandLogo size={52} showText={false} />
            <Text style={styles.appName}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Alert</Text>
            </Text>
            <Text style={styles.appTagline}>"{t(language, 'tagline')}"</Text>
            <Text style={styles.appVersion}>Version 1.0.3 (TaskAlert Production)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={() => setLogoutDialogVisible(true)}
        >
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={logoutDialogVisible}
        title={t(language, 'logout_confirm_title')}
        message={t(language, 'logout_confirm_msg')}
        confirmText={t(language, 'logout_confirm_yes')}
        cancelText={t(language, 'cancel')}
        confirmColor={colors.urgentRed}
        onConfirm={handleLogout}
        onCancel={() => setLogoutDialogVisible(false)}
      />

      {/* Shared Language Selection Modal */}
      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* Alarm Sound Selection Modal (Alarm App Style) */}
      <AlarmSoundModal
        visible={alarmSoundModalVisible}
        onClose={() => setAlarmSoundModalVisible(false)}
      />

      {/* Terms & Conditions Modal */}
      <TermsAndConditionsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />

      {/* Support Ticket Modal */}
      <SupportTicketModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
      />

      {/* Razorpay Payment Wall & UPI QR Modal */}
      <PaywallModal />

      {/* Pro Plan Details & Status Modal */}
      <PremiumStatusModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  settingsTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 10,
  },
  backBtnSettings: {
    padding: 4,
  },
  backBtnIconSettings: {
    fontSize: 26,
    color: '#0F172A',
    fontWeight: '400',
  },
  settingsTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  header: {
    marginVertical: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EBFBF3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0D5C3A',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D5C3A',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  planPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 6,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  planPillFree: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planPillFreeText: {
    color: '#475569',
  },
  planPillPro: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  planPillProText: {
    fontWeight: '800',
    color: '#B45309',
  },

  /* Pro Card for Paid Users */
  proCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proCrownWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  proTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  proCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: -0.2,
  },
  proCardPrice: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#166534',
    marginTop: 2,
  },
  proActivePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexShrink: 0,
  },
  proActivePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  proCardDivider: {
    height: 1,
    backgroundColor: '#DCFCE7',
  },
  proDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  proDetailItem: {
    flex: 1,
    minWidth: 0,
  },
  proDetailLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  proDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  proManageBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  proManageBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Upgrade Card for Free Users */
  upgradeCard: {
    backgroundColor: '#FFFDF7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  upgradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeCrownWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  upgradeTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  upgradeCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: -0.2,
  },
  upgradeCardPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
    marginTop: 2,
  },
  freePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexShrink: 0,
  },
  freePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.3,
  },
  upgradePerksList: {
    gap: 6,
    paddingVertical: 2,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkCheck: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  perkText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
  },
  upgradeActionBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  upgradeActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  upgradeSecondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  upgradeSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },

  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  settingRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  settingTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  settingIcon: {
    flexShrink: 0,
    fontSize: 20,
  },
  settingLabel: {
    ...typography.bodyPrimary,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  settingSubLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  settingRight: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  settingValue: {
    ...typography.caption,
    color: colors.primaryOrange,
    fontWeight: '700',
    fontSize: 12,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  appName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  appTagline: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  appVersion: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: colors.urgentRed,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  logoutText: {
    ...typography.button,
    color: colors.urgentRed,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalLangList: {
    maxHeight: 400,
  },
  langOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginVertical: 4,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  langOptionItemSelected: {
    backgroundColor: '#FFF5EB',
    borderColor: colors.primaryOrange,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  langFlag: {
    fontSize: 26,
  },
  langNativeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  langNativeTextSelected: {
    color: colors.darkOrange,
  },
  langSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  langCheckBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langCheckText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});

export default SettingsScreen;
