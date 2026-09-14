import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { BrandLogo } from './BrandLogo';
import { NotificationService } from '../services/notifications/notification.service';

interface PaywallModalProps {
  visible?: boolean;
  onClose?: () => void;
}

interface OrderData {
  orderId: string;
  keyId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  checkoutUrl?: string;
  planTitle: string;
  validity: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { paywallVisible, setPaywallVisible, language, setIsPremium } = useAppStore();
  const isHinglish = language === 'hi';

  const isVisible = visible !== undefined ? visible : paywallVisible;

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [launchingGateway, setLaunchingGateway] = useState(false);
  const pollTimerRef = useRef<any>(null);

  const handleClose = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (onClose) {
      onClose();
    } else {
      setPaywallVisible(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      createPaymentOrder();
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isVisible]);

  const createPaymentOrder = async () => {
    setLoadingOrder(true);
    try {
      const res: any = await apiClient.post('/subscription/create-order');
      if (res?.ok && res?.orderId) {
        setOrderData(res);
        startPaymentPolling(res.orderId);
      } else {
        throw new Error(res?.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      console.log('[PAYWALL] Backend order note:', err?.message || err);
      const mockOrderId = `order_${Date.now()}`;
      setOrderData({
        orderId: mockOrderId,
        keyId: 'rzp_test_TZW0dzD6BHG8kK',
        amount: 399,
        amountPaise: 39900,
        currency: 'INR',
        checkoutUrl: `https://task-pilot-api.onrender.com/api/subscription/checkout?order_id=${mockOrderId}`,
        planTitle: 'Task Pilot Pro Plan',
        validity: '30 Days',
      });
    } finally {
      setLoadingOrder(false);
    }
  };

  const startPaymentPolling = (_orderId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const statusRes: any = await apiClient.get('/subscription/status');
        if (statusRes?.isPremium || statusRes?.status === 'active') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          handlePaymentSuccess();
        }
      } catch (e) {
        // Silently continue polling
      }
    }, 2500);
  };

  const handleOpenRazorpayCheckout = async () => {
    setLaunchingGateway(true);
    const fallbackUrl = `https://task-pilot-api.onrender.com/api/subscription/checkout${orderData?.orderId ? `?order_id=${orderData.orderId}` : ''}`;
    const url = orderData?.checkoutUrl || fallbackUrl;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(
        isHinglish ? 'Browser Nahi Khula' : 'Could Not Open Browser',
        isHinglish
          ? 'Kripya apna browser (Chrome) check karein.'
          : 'Please verify that Chrome or your default browser is available.'
      );
    } finally {
      setTimeout(() => setLaunchingGateway(false), 1000);
    }
  };

  const handleVerifyPayment = async () => {
    if (!orderData) return;
    setVerifying(true);
    try {
      // 1. First check if subscription is already active (polling or callback)
      const statusRes: any = await apiClient.get('/subscription/status');
      if (statusRes?.isPremium || statusRes?.status === 'active') {
        handlePaymentSuccess();
        return;
      }

      // 2. Ask backend to check order status directly with Razorpay
      const res: any = await apiClient.post('/subscription/verify-payment', {
        order_id: orderData.orderId,
        razorpay_order_id: orderData.orderId,
      });

      if (res?.ok || res?.isPremium) {
        handlePaymentSuccess();
      } else {
        throw new Error(res?.error || 'Verification failed');
      }
    } catch (err: any) {
      Alert.alert(
        'Payment Status',
        isHinglish
          ? 'Payment abhi confirm nahi hua hai. Agar aapne Chrome me payment poora kar diya hai, toh kripya 3-5 second wait karke dobara tap karein.'
          : 'Payment not detected yet. If you just paid in Chrome, please wait a few seconds and tap verify again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPremium(true);

    NotificationService.sendLocalNotification(
      isHinglish ? '🎉 Pro Plan Active Ho Gaya!' : '🎉 Pro Plan Activated!',
      isHinglish
        ? 'Welcome to Task Pilot Pro! Unlimited reminders aur sabhi features ab unlock hain.'
        : 'Welcome to Task Pilot Pro! Unlimited reminders and all pro features are now active.',
      1
    );

    Alert.alert(
      isHinglish ? '🎉 Pro Plan Activate Ho Gaya!' : '🎉 Pro Plan Activated!',
      isHinglish
        ? 'Aapka Task Pilot Pro subscription successfully activate ho gaya hai. Ab aap bina kisi limit ke tasks bana sakte hain!'
        : 'Your Task Pilot Pro subscription is now active! Enjoy unlimited reminders and full productivity tools.',
      [{ text: isHinglish ? 'Shuru Karein 🚀' : 'Get Started 🚀', onPress: handleClose }]
    );
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerBrand}>
            <BrandLogo size={24} showText={false} />
            <Text style={styles.headerBrandTitle}>
              <Text style={{ color: colors.textPrimary }}>Task</Text>
              <Text style={{ color: colors.warning }}>Pilot</Text>
              <Text style={{ color: colors.primary, fontWeight: '900' }}> PRO</Text>
            </Text>
          </View>
          <View style={styles.shieldPill}>
            <Text style={styles.shieldPillText}>🛡️ Razorpay</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={styles.heroCard}>
            <View style={styles.crownBadge}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
            <Text style={styles.heroHeading}>
              {isHinglish ? 'Task Pilot Pro Unlock Karein' : 'Unlock Task Pilot Pro'}
            </Text>
            <Text style={styles.heroSub}>
              {isHinglish
                ? 'Unlimited task reminders, proactive advance audio alerts aur poora power paayein.'
                : 'Unlimited task reminders, proactive advance alerts, and complete productivity.'}
            </Text>

            {/* Price Tag */}
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.priceNumber}>399</Text>
                <Text style={styles.pricePeriod}>{isHinglish ? ' / mahina' : ' / month'}</Text>
              </View>
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>
                  🔥 50% LIMITED DISCOUNT
                </Text>
              </View>
            </View>
          </View>

          {/* SINGLE RAZORPAY PAYMENT CARD (Opens on Chrome) */}
          <View style={styles.paymentCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.trustTag}>
                <Text style={styles.trustTagText}>🛡️ RAZORPAY OFFICIAL GATEWAY</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>
              {isHinglish ? 'Sabhi Payment Tarike Accepted Hain' : 'All Payment Methods Accepted'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isHinglish
                ? 'Chrome mein Razorpay khulega jisme Debit/Credit Card, UPI, Net Banking aur Wallets automatically available rahenge.'
                : 'Opens in Chrome where all payment options (Cards, UPI, Net Banking, Wallets) are automatically ready.'}
            </Text>

            {/* Methods 2x2 Grid */}
            <View style={styles.methodsGrid}>
              <View style={styles.methodBox}>
                <Text style={styles.methodIcon}>💳</Text>
                <View style={styles.methodTextWrap}>
                  <Text style={styles.methodName}>Cards</Text>
                  <Text style={styles.methodDetail}>Debit / Credit (Visa, RuPay, Master)</Text>
                </View>
              </View>

              <View style={styles.methodBox}>
                <Text style={styles.methodIcon}>📱</Text>
                <View style={styles.methodTextWrap}>
                  <Text style={styles.methodName}>UPI</Text>
                  <Text style={styles.methodDetail}>GPay, PhonePe, Paytm, Any UPI</Text>
                </View>
              </View>

              <View style={styles.methodBox}>
                <Text style={styles.methodIcon}>🏦</Text>
                <View style={styles.methodTextWrap}>
                  <Text style={styles.methodName}>Net Banking</Text>
                  <Text style={styles.methodDetail}>SBI, HDFC, ICICI & 50+ Banks</Text>
                </View>
              </View>

              <View style={styles.methodBox}>
                <Text style={styles.methodIcon}>👛</Text>
                <View style={styles.methodTextWrap}>
                  <Text style={styles.methodName}>Wallets</Text>
                  <Text style={styles.methodDetail}>Paytm, Mobikwik, PayLater</Text>
                </View>
              </View>
            </View>

            {/* ONLY ONE Single Action Button */}
            <TouchableOpacity
              style={[styles.primaryPayBtn, (launchingGateway || loadingOrder) && styles.btnDisabled]}
              activeOpacity={0.88}
              onPress={handleOpenRazorpayCheckout}
              disabled={launchingGateway || loadingOrder}
            >
              {launchingGateway || loadingOrder ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color={colors.surface} size="small" />
                  <Text style={styles.primaryPayBtnText}>
                    {isHinglish ? 'Razorpay Khul Raha Hai...' : 'Opening Razorpay...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.primaryPayBtnText}>
                    💳 Pay ₹399 with Razorpay
                  </Text>
                  <Text style={styles.primaryPayBtnSub}>
                    {isHinglish
                      ? '⚡ Chrome par kholein • Sabhi payment options enabled'
                      : '⚡ Open in Chrome to pay • All payment methods enabled'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Real-time Status Radar & Manual Verify Button */}
          <View style={styles.statusSection}>
            <View style={styles.radarCard}>
              <View style={styles.radarDotPulse}>
                <View style={styles.radarDotInner} />
              </View>
              <Text style={styles.radarText}>
                {isHinglish
                  ? 'Auto-Detection Active: Chrome par payment karte hi Pro turant unlock ho jayega.'
                  : 'Auto-Detection Active: Pro unlocks automatically once payment completes.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, verifying && styles.btnDisabled]}
              activeOpacity={0.85}
              onPress={handleVerifyPayment}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color={colors.primaryOrange} size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {isHinglish ? '🔄 Payment Status Check Karein (Verify)' : '🔄 Check Payment Status (Verify)'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* What You Get with Pro */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsHeading}>
              {isHinglish ? 'Pro Subscription Ke Fayde' : 'What You Get With Pro'}
            </Text>

            <View style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Unlimited Daily Tasks</Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Bina kisi 3-task limit ke har roz naye kaam banayein aur schedule karein.'
                    : 'Create and schedule unlimited tasks daily without any limits.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>2 Proactive Advance Audio Alerts</Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Har kaam ke 2 alerts: 10 minute pehle warning aur exact samay par notification.'
                    : '2 audio alerts for every task: 10 minutes prior warning and at deadline.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Repeat Tasks For Whole Month</Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Ek tap me pure 30 dino ke liye recurring tasks schedule karein.'
                    : 'Schedule tasks once to automatically repeat daily for all 30 days.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>Daily Streak & Analytics</Text>
                <Text style={styles.featureDesc}>
                  {isHinglish
                    ? 'Apna daily discipline banayein aur progress track karein.'
                    : 'Build consistent habits and track your completion streaks.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trust Footer */}
          <View style={styles.trustBanner}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>
              {isHinglish
                ? 'Razorpay Certified 256-Bit SSL Secured Payment. 30 din ki validity, auto-renew nahi hota.'
                : 'Razorpay Certified 256-Bit SSL Secured Payment. 30 days validity, no auto-renewal.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerBrandTitle: {
    ...typography.h3,
    letterSpacing: -0.3,
  },
  shieldPill: {
    backgroundColor: colors.softYellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.mediumYellow,
  },
  shieldPillText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.headerWarm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  crownBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.softYellow,
    borderWidth: 2,
    borderColor: colors.mediumYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  crownEmoji: {
    fontSize: 28,
  },
  heroHeading: {
    ...typography.h2,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  priceContainer: {
    alignItems: 'center',
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryOrange,
  },
  priceNumber: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  pricePeriod: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
  offerBadge: {
    backgroundColor: colors.softRealRed,
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  offerBadgeText: {
    fontSize: 10.5,
    color: colors.realRed,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeaderRow: {
    marginBottom: spacing.xs,
  },
  trustTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trustTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  methodBox: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodIcon: {
    fontSize: 18,
  },
  methodTextWrap: {
    flex: 1,
  },
  methodName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  methodDetail: {
    fontSize: 9.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  primaryPayBtn: {
    backgroundColor: colors.primaryOrange,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryPayBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.surface,
    letterSpacing: 0.2,
  },
  primaryPayBtnSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFDF7',
    marginTop: 2,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  statusSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  radarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.softGreen,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  radarDotPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.successGreen,
  },
  radarText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    lineHeight: 15,
  },
  verifyButton: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 13,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primaryOrange,
  },
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  benefitsHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  featureCheck: {
    fontSize: 16,
    color: colors.successGreen,
    fontWeight: 'bold',
    marginTop: 1,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyPrimary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  trustIcon: {
    fontSize: 14,
  },
  trustText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default PaywallModal;
