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
import { shadows } from '../theme/shadows';
import { useAppStore } from '../store';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
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
                <Text style={styles.shieldIcon}>🛡️</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title} numberOfLines={1}>Privacy Policy</Text>
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

            {/* Scrollable Policy Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {isHindi ? (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Task Pilot par hum aapki privacy ki poori respect karte hain. Hum aapka personal data ya task details kisi third party ko kabhi sell nahi karte.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Jo Data Hum Collect Karte Hain</Text>
                    <Text style={styles.paragraph}>
                      Task management aur reminders provide karne ke liye hum sirf zaroori data collect karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Account Data:</Text> Aapka naam, email address, securely hashed password, aur selected language.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Tasks & Reminders:</Text> Task title, description, scheduled date, deadline time aur completion status.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Device Push Token:</Text> Time par alert aur reminder bhejne ke liye device push notification token.</Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. Data Ka Use Kaise Hota Hai</Text>
                    <Text style={styles.paragraph}>
                      Hum aapke data ka use strictly service provide aur improve karne ke liye karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• Deadline se pehle accurate alerts aur sound reminder bhejne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Morning task summary aur evening confirmation dene ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Secure login authentication aur one-time verification OTP bhejne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Support tickets aur customer inquiries solve karne ke liye.</Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Data Security aur Storage</Text>
                    <Text style={styles.paragraph}>
                      Aapki information secure rakhne ke liye hum industry-standard safeguards use karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• App aur backend servers ke beech saara communication HTTPS/TLS se encrypted hota hai.</Text>
                    <Text style={styles.bulletPoint}>• Passwords cryptographic salt ke sath hash karke database me save kiye jaate hain.</Text>
                    <Text style={styles.bulletPoint}>• Regular security audits aur database backups kiye jaate hain.</Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Third Parties Ke Sath Data Sharing</Text>
                    <Text style={styles.paragraph}>
                      Hum sirf essential infrastructure providers ke sath data share karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Notification Providers (Expo / Firebase):</Text> Device par push alerts deliver karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Email Services (Gmail / Resend):</Text> Verification OTPs aur password reset mails ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Hum advertisements ke liye aapka personal data kisi company ko sell nahi karte.</Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Aapke Rights aur Data Deletion</Text>
                    <Text style={styles.paragraph}>
                      Aapki personal information par aapka poora control hai:
                    </Text>
                    <Text style={styles.bulletPoint}>• Aap app mein kisi bhi samay apne tasks ko edit ya delete kar sakte hain.</Text>
                    <Text style={styles.bulletPoint}>• Aap in-app Support ticket ya support@taskpilot.com par mail bhejkar account delete request kar sakte hain.</Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Contact Us</Text>
                    <Text style={styles.paragraph}>
                      Privacy Policy ke kisi bhi sawaal ke liye <Text style={styles.linkText}>support@taskpilot.com</Text> par ya in-app Help & Support desk se contact karein.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      At Task Pilot, we respect your privacy and are committed to protecting your personal information. We never sell your personal data or task details to third parties.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Information We Collect</Text>
                    <Text style={styles.paragraph}>
                      When you use Task Pilot, we collect only the information necessary to provide and enhance your task management and reminder experience:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Account Data:</Text> Your name, email address, password (securely hashed with bcrypt), and selected regional language.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Tasks & Reminders:</Text> Task titles, descriptions, scheduled dates, deadline times, and completion statuses.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Device & Push Tokens:</Text> Push notification tokens generated by your device so we can deliver timely deadline alerts and morning briefings.</Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. How We Use Your Data</Text>
                    <Text style={styles.paragraph}>
                      We use your data strictly for operational purposes:
                    </Text>
                    <Text style={styles.bulletPoint}>• Delivering accurate reminder notifications and sound alerts before deadlines.</Text>
                    <Text style={styles.bulletPoint}>• Generating morning summaries and evening review checks.</Text>
                    <Text style={styles.bulletPoint}>• Authenticating your login sessions and sending one-time verification codes (OTPs).</Text>
                    <Text style={styles.bulletPoint}>• Resolving customer support tickets and addressing technical inquiries.</Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Data Security & Storage</Text>
                    <Text style={styles.paragraph}>
                      We employ industry-standard security safeguards to keep your information secure:
                    </Text>
                    <Text style={styles.bulletPoint}>• All network communication between the app and our servers uses HTTPS/TLS encryption.</Text>
                    <Text style={styles.bulletPoint}>• Passwords are cryptographically salted and hashed before storage.</Text>
                    <Text style={styles.bulletPoint}>• Regular security audits and database backups are conducted to protect against unauthorized access.</Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Sharing with Third Parties</Text>
                    <Text style={styles.paragraph}>
                      We only share data with essential infrastructure providers required to operate the service:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Notification Services (Expo / Google Firebase):</Text> For routing real-time push alerts to your device.</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Email Services (Gmail / Resend):</Text> Strictly for sending verification OTPs and password reset emails.</Text>
                    <Text style={styles.bulletPoint}>• We do NOT sell, rent, or trade your personal information to advertising networks.</Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Your Rights & Data Deletion</Text>
                    <Text style={styles.paragraph}>
                      You have full control over your information:
                    </Text>
                    <Text style={styles.bulletPoint}>• You can create, edit, or delete any task at any time directly in the app.</Text>
                    <Text style={styles.bulletPoint}>• You can request complete deletion of your account and associated task history by submitting a Support Ticket or emailing support@taskpilot.com.</Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Contact Us</Text>
                    <Text style={styles.paragraph}>
                      If you have questions about this Privacy Policy or how your data is handled, feel free to reach out to our team at <Text style={styles.linkText}>support@taskpilot.com</Text> or via the in-app Help & Support desk.
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
                  {isHindi ? 'Theek Hai, Samajh Gaya' : 'I Understand'}
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
  shieldIcon: {
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
    fontWeight: '700',
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  highlightBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  highlightText: {
    fontSize: 13,
    color: '#9A3412',
    lineHeight: 19,
    fontWeight: '600',
  },
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bold: {
    fontWeight: '700',
    color: '#1E293B',
  },
  linkText: {
    color: colors.primaryOrange,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: colors.primaryOrange,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PrivacyPolicyModal;
