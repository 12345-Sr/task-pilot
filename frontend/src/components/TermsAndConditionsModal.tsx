import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { useAppStore } from '../store';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({ visible, onClose }) => {
  const { language } = useAppStore();
  const isHindi = language === 'hi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.scrollIcon}>📜</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title} numberOfLines={1}>Terms & Conditions</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>Last updated: September 2026</Text>
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

            {/* Scrollable Terms Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {isHindi ? (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Task Pilot mein aapka swagat hai. Hamara mobile application download, register ya use karke, aap in Terms & Conditions ko accept karte hain. Kripya inhe dhyan se padhein.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Terms Ki Acceptance</Text>
                    <Text style={styles.paragraph}>
                      Account banakar ya Task Pilot use karke, aap confirm karte hain ki aapki age kam se kam 13 saal hai aur aap legally binding agreements enter karne ke capable hain. Agar aap in terms se agree nahi karte, toh kripya app ka use na karein.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. User Account aur Security</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot features use karne ke liye authentic email se register karein:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Confidentiality:</Text> Apna password aur verification code secure rakhne ke zimmedar aap khud hain.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Account Ownership:</Text> Aap apne account credentials kisi aur ke sath share nahi kar sakte.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Unauthorized Access:</Text> Agar aapko suspicious activity lagti hai, toh turant support@taskpilot.com par inform karein.</Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Subscriptions aur Billing (Pro Plan)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot Free aur Paid dono options deta hai:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Free Tier:</Text> Free accounts ko app try karne ke liye lifetime 3 tasks banane ki suvidha milti hai.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Pro Plan (₹399/month):</Text> Unlimited daily reminders, 30-day recurring tasks aur progress tracking unlock karta hai.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Renewals aur Cancellations:</Text> Subscriptions billing cycle khatam hone se pehle cancel kiye ja sakte hain. Refunds standard guidelines ke according process hote hain.</Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Reminders aur Alert Accuracy</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot aapke daily tasks ko organize aur remind karne ke liye banaya gaya hai:
                    </Text>
                    <Text style={styles.bulletPoint}>• Notification delivery aapke device settings, battery saver aur network connection par depend karti hai.</Text>
                    <Text style={styles.bulletPoint}>• Emergency ya medical scheduling ke liye app par single dependency na rakhein.</Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Prohibited Conduct</Text>
                    <Text style={styles.paragraph}>
                      App ke source code ya API ke sath tampering ya reverse engineering na karein. Server abuse ya abusive content upload karna prohibited hai.
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Intellectual Property</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot ke sabhi trademarks, logo, visual designs aur software architecture sirf Task Pilot ke hain.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Account Termination</Text>
                    <Text style={styles.paragraph}>
                      Rules todne par account suspend ya delete kiya ja sakta hai. Aap kabhi bhi in-app support se apna account delete karne ki request kar sakte hain.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Contact Information</Text>
                    <Text style={styles.paragraph}>
                      Terms & Conditions ke sawaal ke liye <Text style={styles.linkText}>support@taskpilot.com</Text> par ya in-app Help & Support se contact karein.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Welcome to Task Pilot. By downloading, registering, or using our mobile application, you agree to be bound by these Terms and Conditions. Please review them carefully.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Acceptance of Terms</Text>
                    <Text style={styles.paragraph}>
                      By creating an account or accessing Task Pilot, you confirm that you are at least 13 years of age and legally capable of entering into binding agreements. If you do not agree to these terms, you must not use the application.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. User Accounts & Security</Text>
                    <Text style={styles.paragraph}>
                      To access Task Pilot features, you must register using an authentic email address:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Confidentiality:</Text> You are responsible for keeping your password and verification codes secure.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Account Ownership:</Text> You may not transfer or share your account credentials with other parties.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Unauthorized Access:</Text> Notify support@taskpilot.com immediately if you suspect unauthorized use of your account.</Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Subscriptions & Billing (Pro Plan)</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot offers both Free and Paid subscription tiers:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Free Tier:</Text> Free accounts can create up to 3 lifetime task reminders to experience the service.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Pro Plan (₹399/month):</Text> Unlocks unlimited daily reminders, 30-day recurring tasks, and progress tracking.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Renewals & Cancellations:</Text> Subscriptions renew automatically unless cancelled before the end of the billing cycle. Refunds are processed according to standard App Store / Google Play / payment gateway guidelines.</Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Reminders & Notification Accuracy</Text>
                    <Text style={styles.paragraph}>
                      Task Pilot is designed to help you organize and remember tasks. However:
                    </Text>
                    <Text style={styles.bulletPoint}>• Notification delivery depends on your device settings, operating system power-saving modes, battery optimization, and active network connections.</Text>
                    <Text style={styles.bulletPoint}>• Task Pilot should not be solely relied upon for life-critical, medical, or hazardous emergency scheduling.</Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Prohibited Conduct</Text>
                    <Text style={styles.paragraph}>
                      When using Task Pilot, you agree NOT to:
                    </Text>
                    <Text style={styles.bulletPoint}>• Reverse engineer, decompile, or tamper with the application's source code or API.</Text>
                    <Text style={styles.bulletPoint}>• Exploit bugs, perform denial-of-service attacks, or overwhelm backend servers.</Text>
                    <Text style={styles.bulletPoint}>• Upload or distribute abusive, defamatory, or unlawful content in support tickets or task descriptions.</Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Intellectual Property</Text>
                    <Text style={styles.paragraph}>
                      All intellectual property rights, trademarks, logos, visual designs, and software architecture related to Task Pilot are owned exclusively by Task Pilot and its creators.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Account Termination</Text>
                    <Text style={styles.paragraph}>
                      We reserve the right to suspend or terminate accounts that breach these Terms. You may delete your account and associated task data at any time via in-app support.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Contact Information</Text>
                    <Text style={styles.paragraph}>
                      For legal inquiries or questions regarding these Terms & Conditions, please contact us at <Text style={styles.linkText}>support@taskpilot.com</Text> or through the in-app Help & Support desk.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.85}
                onPress={onClose}
              >
                <Text style={styles.doneBtnText}>
                  {isHindi ? 'Accept Karein' : 'I Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    height: '90%',
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
  scrollIcon: {
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
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
  },
  highlightBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 20,
  },
  highlightText: {
    fontSize: 13.5,
    color: '#1E40AF',
    lineHeight: 20,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  paragraph: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    paddingLeft: 6,
    marginBottom: 5,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default TermsAndConditionsModal;
