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
  AppState,
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
  const {
    paywallVisible,
    setPaywallVisible,
    language,
    setIsPremium,
    isPremium,
    setPremiumStatusVisible,
    user,
  } = useAppStore();
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
    if (isVisible && isPremium) {
      handleClose();
      setPremiumStatusVisible(true);
      return;
    }
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
  }, [isVisible, isPremium]);

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
      console.log('[PAYWALL] Backend order attempt 1 failed, retrying in 1.5s:', err?.message || err);
      // Automatic retry
      try {
        await new Promise((r) => setTimeout(r, 1500));
        const retryRes: any = await apiClient.post('/subscription/create-order');
        if (retryRes?.ok && retryRes?.orderId) {
          setOrderData(retryRes);
          startPaymentPolling(retryRes.orderId);
          return;
        }
      } catch (retryErr: any) {
        console.warn('[PAYWALL] Backend order retry also failed:', retryErr?.message || retryErr);
      }

      // Do NOT fabricate an order here. A client-made order_id (e.g. `order_${Date.now()}`)
      // and a hardcoded test key were never real Razorpay orders, so the "Pay" button looked
      // active but Razorpay checkout would always fail when it actually opened, since it never
      // matches a real order created server-side against the live key. Surface the real failure
      // instead so the user (and you, in logs) can see the backend order creation is broken.
      setOrderData(null);
      Alert.alert(
        isHinglish ? 'Payment Shuru Nahi Ho Saka' : 'Could Not Start Payment',
        isHinglish
          ? 'Server se payment order banane me dikkat aa rahi hai. Kripya thodi der baad dobara try karein.'
          : 'We could not create a payment order right now. Please try again in a moment.'
      );
    } finally {
      setLoadingOrder(false);
    }
  };

  // Listen for app returning to foreground from Chrome or deep link callback
  useEffect(() => {
    if (!isVisible) return;

    const checkSubscription = async () => {
      try {
        const statusRes: any = await apiClient.get('/subscription/status');
        if (statusRes?.isPremium || statusRes?.status === 'active') {
          handlePaymentSuccess();
        }
      } catch (e) { }
    };

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkSubscription();
      }
    });

    const urlSub = Linking.addEventListener('url', (event) => {
      if (event?.url && event.url.includes('payment-success')) {
        checkSubscription();
      }
    });

    return () => {
      sub.remove();
      urlSub.remove();
    };
  }, [isVisible]);

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
    if (!orderData?.checkoutUrl) {
      // No real order was created (backend order creation failed) — retry instead of
      // opening a checkout page with no key_id/order_id, which can never succeed.
      Alert.alert(
        isHinglish ? 'Payment Ready Nahi Hai' : 'Payment Not Ready',
        isHinglish
          ? 'Payment order abhi taiyaar nahi hai. Dobara try kar rahe hain...'
          : 'Payment order is not ready yet. Retrying...'
      );
      createPaymentOrder();
      return;
    }
    setLaunchingGateway(true);
    try {
      await Linking.openURL(orderData.checkoutUrl);
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
          ? 'Payment abhi confirm nahi hua hai. Agar aapne Chrome me payment poora kar diya hai toh 5-10 sec wait karke dobara check karein.'
          : 'Payment not detected yet. If you completed payment in Chrome, wait 5-10 seconds and check again.',
        [
          {
            text: isHinglish ? '🔄 Dobara Check Karein' : '🔄 Check Again',
            onPress: () => handleVerifyPayment(),
          },
          {
            text: isHinglish ? 'Theek Hai' : 'OK',
            style: 'cancel',
          },
        ]
      );
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPremium(true);
    handleClose();

    // Fetch fresh subscription details from backend
    apiClient.get('/subscription/status').then((res: any) => {
      if (res) {
        useAppStore.getState().setSubscriptionInfo({
          status: res.status || 'active',
          currentPeriodEnd: res.currentPeriodEnd || null,
          planPrice: res.planPrice || 399,
        });
      }
    }).catch(() => { });

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
      [
        {
          text: isHinglish ? 'Details & Status Dekhein 👑' : 'View Pro Details 👑',
          onPress: () => {
            setPremiumStatusVisible(true);
          },
        },
        {
          text: isHinglish ? 'Shuru Karein 🚀' : 'Get Started 🚀',
          style: 'cancel',
        },
      ]
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
                <Text style={styles.priceNumber}>{orderData?.amount || 399}</Text>
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
                    💳 Pay ₹{orderData?.amount || 399} with Razorpay
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