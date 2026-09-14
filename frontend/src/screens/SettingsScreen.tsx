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
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';
import { SupportTicketModal } from '../components/SupportTicketModal';
import { PaywallModal } from '../components/PaywallModal';
import { PremiumStatusModal } from '../components/PremiumStatusModal';

interface SettingsLanguageOption {
  code: SupportedLanguage;
  label: string;
  native: string;
  flag: string;
  region: string;
}

const SETTINGS_LANGUAGES: SettingsLanguageOption[] = [
  { code: 'hi', label: 'Hinglish', native: 'Hinglish', flag: '🇮🇳', region: 'India • Hinglish' },
  { code: 'en', label: 'English', native: 'English', flag: '🌐', region: 'Global' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🚩', region: 'महाराष्ट्र' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🌸', region: 'পশ্চিমবঙ্গ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🪔', region: 'தமிழ்நாடு' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🌿', region: 'ఆంధ్ర & తెలంగాణ' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🦚', region: 'ગુજરાત' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🌾', region: 'ਪੰਜਾਬ' },
];

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
  } = useAppStore();
  const isHindi = language === 'hi';
  const { data: user } = useUserProfile();
  useSubscription();

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [morningNotification, setMorningNotification] = useState(true);
  const [eveningNotification, setEveningNotification] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
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
      routes: [{ name: 'Welcome' }],
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
        {/* Screen Title */}
        <View style={styles.header}>
          <Text style={styles.title}>{t(language, 'tab_settings')}</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <View style={[styles.planPill, isPremium && styles.planPillPro]}>
                <Text style={[styles.planPillText, isPremium && styles.planPillProText]}>
                  {isPremium ? '👑 ' + t(language, 'premium_plan_tag') : t(language, 'free_plan_tag')}
                </Text>
              </View>
              {isPremium ? (
                <TouchableOpacity
                  style={styles.miniProBtn}
                  activeOpacity={0.8}
                  onPress={() => setPremiumStatusVisible(true)}
                >
                  <Text style={styles.miniProBtnText}>👑 {isHindi ? 'Pro Details' : 'Pro Details'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.miniUpgradeBtn}
                  activeOpacity={0.8}
                  onPress={() => setPaywallVisible(true)}
                >
                  <Text style={styles.miniUpgradeBtnText}>👑 {isHindi ? 'Upgrade' : 'Upgrade'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Upgrade Banner if free plan OR Pro Status Banner if Premium */}
        {isPremium ? (
          <TouchableOpacity
            style={styles.proActiveBanner}
            activeOpacity={0.88}
            onPress={() => setPremiumStatusVisible(true)}
          >
            <View style={styles.proActiveCrownWrap}>
              <Text style={{ fontSize: 24 }}>👑</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.proActiveBannerTitle}>
                  {isHindi ? 'Task Pilot Pro Active' : 'Task Pilot Pro Active'}
                </Text>
                <View style={styles.activePillSmall}>
                  <Text style={styles.activePillSmallText}>ACTIVE ✓</Text>
                </View>
              </View>
              <Text style={styles.proActiveBannerSub}>
                {isHindi
                  ? 'Aapka Pro subscription active hai. Validity aur membership details dekhein.'
                  : 'Your Pro subscription is active. View validity and membership status.'}
              </Text>
            </View>
            <View style={styles.proActiveBannerBtn}>
              <Text style={styles.proActiveBannerBtnText}>
                {isHindi ? 'Details →' : 'Details →'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.proBanner}
            activeOpacity={0.88}
            onPress={() => setPaywallVisible(true)}
          >
            <View style={styles.proBannerCrownWrap}>
              <Text style={{ fontSize: 24 }}>👑</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.proBannerTitle}>
                {isHindi ? 'Task Pilot Pro Upgrade Karein' : 'Upgrade to Task Pilot Pro'}
              </Text>
              <Text style={styles.proBannerSub}>
                {isHindi
                  ? '₹399/mahina • Unlimited daily reminders, sound alerts aur daily streak unlock karein.'
                  : '₹399/month • Unlimited reminders, sound alarms & 30-day recurring tasks.'}
              </Text>
            </View>
            <View style={styles.proBannerBtn}>
              <Text style={styles.proBannerBtnText}>{isHindi ? 'Pay ₹399 →' : 'Pay ₹399 →'}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Subscription & Plan Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{isHindi ? 'Subscription aur Plan' : 'Subscription & Plan'}</Text>

          {/* Row 1: Always accessible Pro Details & Status Modal */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => setPremiumStatusVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>👑</Text>
              <View>
                <Text style={styles.settingLabel}>
                  {isPremium
                    ? (isHindi ? '👑 Pro Subscription Status' : '👑 Pro Subscription Status')
                    : (isHindi ? 'Pro Membership Details & Status' : 'Pro Membership Details & Status')}
                </Text>
                <Text style={styles.settingSubLabel}>
                  {isPremium
                    ? (isHindi ? 'Active • Plan validity aur details dekhein' : 'Active • View plan validity & details')
                    : (isHindi ? 'Free Tier • Plan status aur benefits dekhein' : 'Free Tier • View status & unlocked perks')}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              {isPremium ? (
                <View style={styles.activeBadgePill}>
                  <Text style={styles.activeBadgePillText}>{isHindi ? 'Active ✓' : 'Active ✓'}</Text>
                </View>
              ) : (
                <View style={styles.detailsBadgePill}>
                  <Text style={styles.detailsBadgePillText}>{isHindi ? 'Details ›' : 'Details ›'}</Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Row 2: Upgrade Option (ONLY shown when !isPremium; REMOVED when isPremium!) */}
          {!isPremium && (
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => setPaywallVisible(true)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>⚡</Text>
                <View>
                  <Text style={styles.settingLabel}>
                    {isHindi ? 'Upgrade to Task Pilot Pro' : 'Upgrade to Task Pilot Pro'}
                  </Text>
                  <Text style={styles.settingSubLabel}>
                    {isHindi ? '₹399/mahina • Unlimited daily reminders paayein' : '₹399/month • Unlock unlimited reminders'}
                  </Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <View style={styles.upgradeBadgePill}>
                  <Text style={styles.upgradeBadgePillText}>{isHindi ? 'Pay ₹399' : 'Pay ₹399'}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t(language, 'preferences_title')}</Text>

          {/* Language Selector (Opens In-Page Modal) */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌐</Text>
              <Text style={styles.settingLabel}>{t(language, 'language_title')}</Text>
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
              <View>
                <Text style={styles.settingLabel}>{t(language, 'morning_reminder_title')}</Text>
                <Text style={styles.settingSubLabel}>{t(language, 'morning_reminder_sub')}</Text>
              </View>
            </View>
            <Switch
              value={morningNotification}
              onValueChange={setMorningNotification}
              trackColor={{ false: colors.border, true: colors.primaryOrange }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Evening Review */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View>
                <Text style={styles.settingLabel}>{t(language, 'evening_review_title')}</Text>
                <Text style={styles.settingSubLabel}>{t(language, 'evening_review_sub')}</Text>
              </View>
            </View>
            <Switch
              value={eveningNotification}
              onValueChange={setEveningNotification}
              trackColor={{ false: colors.border, true: colors.primaryOrange }}
              thumbColor={colors.primaryOrange ? colors.surface : colors.surface}
            />
          </View>

          {/* Sound */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingLabel}>{t(language, 'sound_vibration_title')}</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: colors.border, true: colors.primaryOrange }}
              thumbColor={colors.surface}
            />
          </View>
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
              <View>
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
              <View>
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
              <View>
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
              <Text style={{ color: '#EAB308' }}>Pilot</Text>
            </Text>
            <Text style={styles.appTagline}>"{t(language, 'tagline')}"</Text>
            <Text style={styles.appVersion}>Version 1.0.1 (Task Pilot Production)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={() => setLogoutDialogVisible(true)}
        >
          <Text style={styles.logoutText}>{t(language, 'logout')}</Text>
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

      {/* In-Page Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLanguageModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t(language, 'language_title')}</Text>
                <Text style={styles.modalSubtitle}>{t(language, 'language_subtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setLanguageModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalLangList}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {SETTINGS_LANGUAGES.map((item) => {
                const isSelected = language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.langOptionItem,
                      isSelected && styles.langOptionItemSelected,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleSelectLanguage(item.code)}
                  >
                    <View style={styles.langOptionLeft}>
                      <Text style={styles.langFlag}>{item.flag}</Text>
                      <View>
                        <Text
                          style={[
                            styles.langNativeText,
                            isSelected && styles.langNativeTextSelected,
                          ]}
                        >
                          {item.native}
                        </Text>
                        <Text style={styles.langSubText}>
                          {item.label} • {item.region}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.langCheckBadge}>
                        <Text style={styles.langCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
  header: {
    marginVertical: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 6,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planPillPro: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  planPillProText: {
    color: '#B45309',
    fontWeight: '800',
  },
  miniUpgradeBtn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  miniUpgradeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  miniProBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  miniProBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  proBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#F97316',
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  proBannerCrownWrap: {
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: -0.2,
  },
  proBannerSub: {
    fontSize: 12,
    color: '#7C2D12',
    marginTop: 3,
    lineHeight: 16,
  },
  proBannerBtn: {
    flexShrink: 0,
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBannerBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  proActiveBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  proActiveCrownWrap: {
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proActiveBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: -0.2,
  },
  activePillSmall: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  activePillSmallText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  proActiveBannerSub: {
    fontSize: 12,
    color: '#166534',
    marginTop: 3,
    lineHeight: 16,
  },
  proActiveBannerBtn: {
    flexShrink: 0,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proActiveBannerBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  upgradeBadgePill: {
    flexShrink: 0,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F97316',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  upgradeBadgePillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  detailsBadgePill: {
    flexShrink: 0,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailsBadgePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  activeBadgePill: {
    flexShrink: 0,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadgePillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803D',
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
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
    gap: spacing.md,
    minWidth: 0,
  },
  settingIcon: {
    flexShrink: 0,
    fontSize: 20,
  },
  settingLabel: {
    ...typography.bodyPrimary,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  settingSubLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  settingRight: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingValue: {
    ...typography.caption,
    color: colors.primaryOrange,
    fontWeight: '600',
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
