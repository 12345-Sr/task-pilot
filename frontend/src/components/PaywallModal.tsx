import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { BrandLogo } from './BrandLogo';
import { NotificationService } from '../services/notifications/notification.service';

const RNImage = Image as any;

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
  upiUrl: string;
  qrImageUrl: string;
  merchantVpa: string;
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [showQrSection, setShowQrSection] = useState(false);
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
      setIsSuccess(false);
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
        // Start background polling to detect if user scanned & paid
        startPaymentPolling(res.orderId);
      } else {
        throw new Error(res?.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      console.log('[PAYWALL] Backend order init note:', err?.message || err);
      // Fallback order info with direct checkout link
      const mockOrderId = `order_${Date.now()}`;
      const upiUrl = `upi://pay?pa=taskpilot.rzp@icici&pn=Task%20Pilot&tr=${mockOrderId}&am=399.00&cu=INR&tn=Task%20Pilot%20Pro%20Plan`;
      setOrderData({
        orderId: mockOrderId,
        keyId: 'rzp_test_TZW0dzD6BHG8kK',
        amount: 399,
        amountPaise: 39900,
        currency: 'INR',
        checkoutUrl: `https://task-pilot-api.onrender.com/api/subscription/checkout?order_id=${mockOrderId}`,
        upiUrl,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUrl)}&margin=10`,
        merchantVpa: 'taskpilot.rzp@icici',
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
    }, 3000);
  };

  const handleOpenRazorpayCheckout = async () => {
    const fallbackUrl = `https://task-pilot-api.onrender.com/api/subscription/checkout${orderData?.orderId ? `?order_id=${orderData.orderId}` : ''}`;
    const url = orderData?.checkoutUrl || fallbackUrl;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(
        isHinglish ? 'Checkout Nahi Khula' : 'Could Not Open Checkout',
        isHinglish
          ? 'Kripya apna browser check karein ya neeche diye gaye UPI option se pay karein.'
          : 'Please check your browser or use the UPI option below.'
      );
    }
  };

  const handleOpenUpiApp = async () => {
    if (!orderData?.upiUrl) return;
    try {
      const supported = await Linking.canOpenURL(orderData.upiUrl);
      if (supported) {
        await Linking.openURL(orderData.upiUrl);
      } else {
        // Fallback to directly attempting to open the URL
        await Linking.openURL(orderData.upiUrl);
      }
    } catch (err) {
      Alert.alert(
        isHinglish ? 'UPI App Open Nahi Hua' : 'Could Not Open UPI App',
        isHinglish
          ? 'Kripya screen par diye gaye QR Code ko kisi bhi UPI app (Google Pay, PhonePe, Paytm, BHIM) se scan karein.'
          : 'Please scan the QR code displayed on screen using any UPI app like Google Pay, PhonePe, or Paytm.'
      );
    }
  };

  const handleVerifyPayment = async () => {
    if (!orderData) return;
    setVerifying(true);
    try {
      const res: any = await apiClient.post('/subscription/verify-payment', {
        order_id: orderData.orderId,
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: `pay_${Date.now()}`,
      });

      if (res?.ok || res?.isPremium) {
        handlePaymentSuccess();
      } else {
        throw new Error(res?.error || 'Verification failed');
      }
    } catch (err: any) {
      Alert.alert(
        isHinglish ? 'Payment Verify Ho Raha Hai' : 'Payment Status',
        isHinglish
          ? 'Payment confirm hote hi Pro features automatically unlock ho jayenge. Agar aap pay kar chuke hain, toh kripya 10 second intezaar karke dobara tap karein.'
          : 'If you have completed the payment via UPI, please wait a few seconds and tap verify again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsSuccess(true);
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
        {/* Top Sticky Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerBrand}>
            <BrandLogo size={26} showText={false} />
            <Text style={styles.headerBrandTitle}>
              <Text style={{ color: '#0F172A' }}>Task</Text>
              <Text style={{ color: '#EAB308' }}>Pilot</Text>
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
                ? 'Sirf ₹399/mahina mein unlimited task reminders, proactive advance alerts aur poora power paayein.'
                : 'Unlimited task reminders, proactive sound alerts, and full productivity power for just ₹399/month.'}
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
                  {isHinglish ? '🔥 50% LIMITED DISCOUNT' : '🔥 50% LIMITED DISCOUNT'}
                </Text>
              </View>
            </View>
          </View>

          {/* Primary: Full Razorpay Gateway Card (All Payment Methods Accepted) */}
          <View style={styles.rzpGatewayCard}>
            <View style={styles.rzpCardHeader}>
              <View style={styles.rzpBadge}>
                <Text style={styles.rzpBadgeText}>🛡️ ALL PAYMENT METHODS ACCEPTED</Text>
              </View>
              <Text style={styles.rzpCardTitle}>
                {isHinglish ? 'Razorpay Secure Checkout' : 'Razorpay Secure Checkout'}
              </Text>
              <Text style={styles.rzpCardSub}>
                {isHinglish
                  ? 'Kisi bhi Card, UPI App, Net Banking ya Wallet se turant pay karein.'
                  : 'Pay instantly using any Card, UPI App, Net Banking, or Wallet.'}
              </Text>
            </View>

            {/* Methods Grid Display */}
            <View style={styles.methodsGrid}>
              <View style={styles.methodGridItem}>
                <Text style={styles.methodGridIcon}>💳</Text>
                <View style={styles.methodGridTextWrap}>
                  <Text style={styles.methodGridTitle}>Cards</Text>
                  <Text style={styles.methodGridDesc}>Debit / Credit (Visa, RuPay, Master)</Text>
                </View>
              </View>

              <View style={styles.methodGridItem}>
                <Text style={styles.methodGridIcon}>📱</Text>
                <View style={styles.methodGridTextWrap}>
                  <Text style={styles.methodGridTitle}>UPI</Text>
                  <Text style={styles.methodGridDesc}>GPay, PhonePe, Paytm, Any UPI</Text>
                </View>
              </View>

              <View style={styles.methodGridItem}>
                <Text style={styles.methodGridIcon}>🏦</Text>
                <View style={styles.methodGridTextWrap}>
                  <Text style={styles.methodGridTitle}>Net Banking</Text>
                  <Text style={styles.methodGridDesc}>SBI, HDFC, ICICI & 50+ Banks</Text>
                </View>
              </View>

              <View style={styles.methodGridItem}>
                <Text style={styles.methodGridIcon}>👛</Text>
                <View style={styles.methodGridTextWrap}>
                  <Text style={styles.methodGridTitle}>Wallets</Text>
                  <Text style={styles.methodGridDesc}>Paytm, Mobikwik & PayLater</Text>
                </View>
              </View>
            </View>

            {/* Big Primary CTA Button: Launch Razorpay Full Checkout */}
            <TouchableOpacity
              style={styles.payRazorpayBtn}
              activeOpacity={0.88}
              onPress={handleOpenRazorpayCheckout}
            >
              <Text style={styles.payRazorpayBtnText}>
                💳 {isHinglish ? 'Pay ₹399 with Razorpay' : 'Pay ₹399 with Razorpay'}
              </Text>
              <Text style={styles.payRazorpayBtnSubText}>
                {isHinglish
                  ? 'Sabhi payment options ke sath official gateway kholein'
                  : 'Open official secure gateway with all payment options'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Secondary: QR Code Payment Box */}
          <View style={styles.qrSectionCard}>
            <View style={styles.qrHeaderRow}>
              <View style={styles.qrTitleWrap}>
                <Text style={styles.qrMainTitle}>
                  {isHinglish ? '📱 Ya Phir UPI QR Code Scan Karein' : '📱 Or Scan UPI QR Code'}
                </Text>
                <Text style={styles.qrSubTitle}>
                  {isHinglish ? 'Google Pay • PhonePe • Paytm • BHIM • Cred' : 'Google Pay • PhonePe • Paytm • BHIM • Cred'}
                </Text>
              </View>
              <View style={styles.livePulseBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.pulseText}>UPI QR</Text>
              </View>
            </View>

            {/* QR Image Container */}
            <View style={styles.qrFrame}>
              {loadingOrder ? (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.qrLoadingText}>
                    {isHinglish ? 'Secure QR load ho raha hai...' : 'Loading Secure QR...'}
                  </Text>
                </View>
              ) : orderData?.qrImageUrl ? (
                <View style={styles.qrImageWrapper}>
                  <RNImage
                    source={{ uri: orderData.qrImageUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <View style={styles.qrCenterLogoOverlay}>
                    <Text style={{ fontSize: 16 }}>⚡</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}

              {/* Amount Pill */}
              <View style={styles.amountPill}>
                <Text style={styles.amountPillText}>Total Amount: ₹399.00</Text>
              </View>
            </View>

            {/* Action 1: Direct Mobile UPI App Button */}
            <TouchableOpacity
              style={styles.payAppBtn}
              activeOpacity={0.85}
              onPress={handleOpenUpiApp}
            >
              <Text style={styles.payAppBtnIcon}>📱</Text>
              <Text style={styles.payAppBtnText}>
                {isHinglish ? 'Direct UPI App Me Kholein (GPay / PhonePe)' : 'Pay Directly in UPI App'}
              </Text>
            </TouchableOpacity>

            {/* Action 2: I Have Paid / Verify Button */}
            <TouchableOpacity
              style={[styles.verifyBtn, verifying && styles.verifyBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleVerifyPayment}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>
                  {isHinglish ? '✅ Main Pay Kar Chuka Hoon (Verify Status)' : '✅ I Have Paid (Verify Status)'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Live Polling Note */}
            <Text style={styles.pollingNotice}>
              {isHinglish
                ? '⏳ Payment karte hi app automatically detect karke Pro features unlock kar degi.'
                : '⏳ The app automatically detects your payment and unlocks Pro features.'}
            </Text>
          </View>

          {/* Pro Benefits List */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsHeading}>
              {isHinglish ? 'Pro Subscription Ke Fayde' : 'What You Get With Pro'}
            </Text>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>🚀</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? 'Unlimited Daily Tasks' : 'Unlimited Daily Tasks'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Free limit (3 tasks) khatam! Jitne chahein utne zaroori reminders banayein.'
                    : 'No 3-task restriction. Create as many task reminders as you need.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>⏰</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? 'Proactive Sound Alarms' : 'Proactive Sound Alarms'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Har deadline se 2 ghante aur 1 ghanta pehle smart alert taaki kaam na chhoote.'
                    : 'Smart notification chimes 2 hours and 1 hour before every task deadline.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>📅</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? '30-Day Recurring Tasks' : '30-Day Recurring Tasks'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Agle 30 dino tak ke tasks schedule aur manage karein.'
                    : 'Plan and schedule repeating tasks for up to 30 days in advance.'}
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>📊</Text>
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>
                  {isHinglish ? 'Daily Streak & Analytics' : 'Daily Streak & Analytics'}
                </Text>
                <Text style={styles.benefitDesc}>
                  {isHinglish
                    ? 'Apna daily discipline banayein aur progress track karein.'
                    : 'Build consistent habits and track your completion streaks.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trust & Guarantee Banner */}
          <View style={styles.trustBanner}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>
              {isHinglish
                ? 'Razorpay Certified 256-Bit SSL Secured Payment. Kisi bhi samay cancel karein.'
                : 'Razorpay Certified 256-Bit SSL Secured Payment. Cancel anytime.'}
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: colors.surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  shieldPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
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
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: colors.headerWarm,
    borderRadius: radius.xl || 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
    ...shadows.card,
  },
  crownBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  crownEmoji: {
    fontSize: 28,
  },
  heroHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  priceContainer: {
    alignItems: 'center',
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  priceNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  offerBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerBadgeText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rzpGatewayCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl || 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#C5A059',
    marginBottom: 16,
    ...shadows.card,
  },
  rzpCardHeader: {
    marginBottom: 16,
  },
  rzpBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C5A059',
    marginBottom: 8,
  },
  rzpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EAB308',
    letterSpacing: 0.5,
  },
  rzpCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  rzpCardSub: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  methodGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  methodGridIcon: {
    fontSize: 20,
  },
  methodGridTextWrap: {
    flex: 1,
  },
  methodGridTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  methodGridDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  payRazorpayBtn: {
    backgroundColor: colors.primary, // Camel gold / champagne
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  payRazorpayBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  payRazorpayBtnSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
    textAlign: 'center',
  },
  qrSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl || 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    marginBottom: 16,
    alignItems: 'center',
    ...shadows.card,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  qrTitleWrap: {
    flex: 1,
  },
  qrMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  qrSubTitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  pulseText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  qrFrame: {
    backgroundColor: '#FAF5EB',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 275,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  qrLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  qrLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  qrImageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  qrCenterLogoOverlay: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  amountPill: {
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  amountPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primary,
  },
  payAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 13,
    width: '100%',
    marginBottom: 10,
  },
  payAppBtnIcon: {
    fontSize: 16,
  },
  payAppBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pollingNotice: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl || 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.card,
  },
  benefitsHeading: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  benefitIcon: {
    fontSize: 18,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  trustIcon: {
    fontSize: 16,
  },
  trustText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PaywallModal;
