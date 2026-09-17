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
                  <Text style={styles.title} numberOfLines={1}>
                    Privacy Policy
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    Last Updated: September 2026
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
                      TaskAlert ("TaskAlert", "hum", "humein", ya "hamara") aapki privacy ki respect karta hai aur aapki details protect karne ke liye committed hai. Yeh Privacy Policy explain karti hai ki hum kaunsi information collect karte hain, use kaise use karte hain, aur aapke paas kya choices hain.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Jo Information Hum Collect Karte Hain (Information We Collect)</Text>
                    <Text style={styles.paragraph}>
                      Jab aap ek TaskAlert account banate aur use karte hain, toh hum yeh information collect aur store kar sakte hain:
                    </Text>
                    <Text style={styles.subheading}>Account Information:</Text>
                    <Text style={styles.bulletPoint}>• Name (Aapka naam)</Text>
                    <Text style={styles.bulletPoint}>• Email address</Text>
                    <Text style={styles.bulletPoint}>• Password information (Secure hash ke through)</Text>
                    <Text style={styles.bulletPoint}>• Email verification status</Text>
                    <Text style={styles.paragraph}>
                      Aapka password security hashing algorithms ke through store hota hai aur readable plain-text format mein kabhi save nahi hota.
                    </Text>

                    <Text style={styles.subheading}>Task aur Reminder Information:</Text>
                    <Text style={styles.paragraph}>
                      Hum TaskAlert ke andar aapke dwara banayi gayi information store karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• Task names aur descriptions</Text>
                    <Text style={styles.bulletPoint}>• Scheduled dates</Text>
                    <Text style={styles.bulletPoint}>• Scheduled times</Text>
                    <Text style={styles.bulletPoint}>• Reminder settings</Text>
                    <Text style={styles.bulletPoint}>• Task completion status</Text>
                    <Text style={styles.bulletPoint}>• Timeline/repeat settings</Text>
                    <Text style={styles.bulletPoint}>• Task-management features chalane ke liye required other details</Text>
                    <Text style={styles.paragraph}>
                      Aap apne banaye hue tasks aur content ke pure owner rehte hain.
                    </Text>

                    <Text style={styles.subheading}>Device aur Notification Details:</Text>
                    <Text style={styles.paragraph}>
                      Reminder notifications bhejne ke liye, hum aapke device ya account se associated device push-notification token collect aur store karte hain. Isse TaskAlert aapke device par timely alerts deliver kar pata hai.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. Hum Information Ka Use Kaise Karte Hain</Text>
                    <Text style={styles.paragraph}>
                      Hum collected data ka use strictly in purposes ke liye karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• Aapka account create aur maintain karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Account authenticate aur verify karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Email address verification ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Login aur password recovery support provide karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Aapke tasks aur reminders ko store aur display karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Notifications schedule aur deliver karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Free aur Pro functionality provide karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Subscription payments securely process karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Customer support aur technical tickets resolve karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Service ko secure aur abuse-free maintain karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Fraud, spam ya unauthorized activity detect aur prevent karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Applicable legal obligations comply karne ke liye.</Text>
                    <Text style={styles.paragraph}>
                      Hum advertising ya promotions ke liye aapka personal data kisi third party ko sell nahi karte.
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Aapka Task Data Kaise Use Hota Hai</Text>
                    <Text style={styles.paragraph}>
                      Aapki task aur reminder details sirf TaskAlert ki features provide karne ke liye process aur store hoti hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      For example, tasks store hona zaroori hai taaki aap baad mein unhe access kar sakein aur timely reminders generate ho sakein.
                    </Text>
                    <Text style={styles.paragraph}>
                      Aapke tasks kabhi bhi publicly display nahi hote aur na hi doosre TaskAlert users ko dikhaye jaate hain.
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Account Authentication aur Security</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert aapke account ko protect karne ke liye standard authentication mechanisms use karta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Passwords plain-text ke bajaye salted cryptographic hash ke sath store kiye jaate hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Apna login credentials aur password secure rakhna aapki zimmedari hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Koi bhi online platform 100% security guarantee nahi kar sakta, lekin hum aapka data protect karne ke liye industry-grade technical aur organizational safeguards use karte hain.
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Notifications</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert reminders deliver karne ke liye push-notification services use karta hai. Notifications pane ke liye device par notification permission allow hona zaroori hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Notifications mein scheduled task ko identify karne ke liye zaroori details hoti hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Device settings, OS battery optimizations, network problems ya 3rd-party delivery infrastructure ke kaaran notifications delay ya interrupt ho sakti hain.
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Third-Party Service Providers</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ko smoothly operate karne ke liye hum trusted third-party providers use karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Payment processing:</Text> Razorpay</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Push notifications:</Text> Expo aur/ya Firebase</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Email delivery:</Text> Resend aur/ya Gmail</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Hosting & Servers:</Text> Cloud hosting aur database infrastructure</Text>
                    <Text style={styles.bulletPoint}>• Service maintain karne ke liye required other technical providers</Text>
                    <Text style={styles.paragraph}>
                      Yeh providers sirf service deliver karne ke purpose se information process karte hain. Hum inhe ads ke liye data sell nahi karte.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Payments</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert Pro purchase karne par payment processing Razorpay ya designated payment gateway ke through handle hoti hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Payment providers transaction process karne ke liye zaroori details collect karte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert aapke complete payment card details apne servers par store nahi karta. Payment records payment provider ki apni policies aur legal obligations ke anusar retain hote hain.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Data Sharing</Text>
                    <Text style={styles.paragraph}>
                      Hum aapki personal information ya tasks kabhi sell nahi karte. Information sirf zaroori situations mein disclose ho sakti hai, jaise:
                    </Text>
                    <Text style={styles.bulletPoint}>• Service providers jo TaskAlert operate karne mein madad karte hain.</Text>
                    <Text style={styles.bulletPoint}>• Service ki security aur integrity protect karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Fraud, abuse ya illegal activity investigate karne ke liye.</Text>
                    <Text style={styles.bulletPoint}>• Applicable laws, court orders ya government authorities ke legal requests comply karne ke liye.</Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. Data Retention</Text>
                    <Text style={styles.paragraph}>
                      Aapka data tab tak retain rehta hai jab tak aapka account active hai aur service provide karne ke liye zaroori hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Account terminate hone ke baad, security, legal ya dispute resolution ke liye data limited time tak retain ho sakta hai aur uske baad delete ya anonymize kar diya jata hai.
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. Account Deletion</Text>
                    <Text style={styles.paragraph}>
                      Currently, app ke andar automatic self-service deletion option available nahi hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Agar aap apna account ya personal details delete karwana chahte hain, toh aap in-app Support ticket ya <Text style={styles.linkText}>support@taskalert.com</Text> par request send kar sakte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Valid deletion request receive hone aur identity verify karne ke baad hum legal guidelines ke mutabiq account delete kar dete hain.
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. Data Security</Text>
                    <Text style={styles.paragraph}>
                      Hum unauthorized access aur data loss se bachane ke liye standard technical measures use karte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• HTTPS/TLS encrypted communication</Text>
                    <Text style={styles.bulletPoint}>• Strong password hashing</Text>
                    <Text style={styles.bulletPoint}>• Secure database access controls</Text>
                    <Text style={styles.bulletPoint}>• Server monitoring aur backups</Text>
                    <Text style={styles.paragraph}>
                      Lekin dhyan rahe ki internet par koi bhi electronic transmission 100% fail-proof nahi hota.
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. Children's Privacy</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert minors ya bachhon se knowingly personal data collect karne ke liye design nahi kiya gaya hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Agar kisi minor ka data unauthorized tarike se collect ho gaya ho, toh parents ya guardians support channel ke through contact karke data delete karwa sakte hain.
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. Cookies aur Tracking</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert core features ke liye personal information ya task details advertise karne ke liye tracking use nahi karta. Future mein tracking/analytics aane par policy update ki jayegi.
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. Aapke Rights (Your Rights)</Text>
                    <Text style={styles.paragraph}>
                      Applicable laws ke mutabiq aapke paas yeh rights ho sakte hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• Apne personal data ko access karne ka request.</Text>
                    <Text style={styles.bulletPoint}>• Inaccurate information ko correct karwane ka request.</Text>
                    <Text style={styles.bulletPoint}>• Account aur data delete karwane ka request.</Text>
                    <Text style={styles.bulletPoint}>• Data handling se related concerns ya queries raise karna.</Text>
                    <Text style={styles.paragraph}>
                      Rights exercise karne ke liye TaskAlert support team se contact karein. Requests process karne se pehle identity verification zaroori ho sakti hai.
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. Privacy Policy Mein Changes</Text>
                    <Text style={styles.paragraph}>
                      Hum technology, legal updates ya service practices ke according is Privacy Policy ko samay-samay par update kar sakte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Changes hone par "Last Updated" date revise hogi aur zaroori hone par notice diya jayega.
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. Contact Us</Text>
                    <Text style={styles.paragraph}>
                      Agar is Privacy Policy ya apne data handling ke regarding aapka koi sawaal ya complaint hai, toh humse in-app support/tickets ya direct email <Text style={styles.linkText}>support@taskalert.com</Text> par contact karein.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      TaskAlert ("TaskAlert", "we", "us", or "our") respects your privacy and is committed to protecting the information you provide while using our task-management and productivity service. This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices available to you.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. Information We Collect</Text>
                    <Text style={styles.paragraph}>
                      When you create and use a TaskAlert account, we may collect and store:
                    </Text>
                    <Text style={styles.subheading}>Account Information</Text>
                    <Text style={styles.bulletPoint}>• Name</Text>
                    <Text style={styles.bulletPoint}>• Email address</Text>
                    <Text style={styles.bulletPoint}>• Password information</Text>
                    <Text style={styles.bulletPoint}>• Email verification information</Text>
                    <Text style={styles.paragraph}>
                      Your password is stored using appropriate password-hashing/security mechanisms and is not intended to be stored as plain-text password data.
                    </Text>

                    <Text style={styles.subheading}>Task and Reminder Information</Text>
                    <Text style={styles.paragraph}>
                      We collect and store information that you create within TaskAlert, including:
                    </Text>
                    <Text style={styles.bulletPoint}>• Task names or descriptions</Text>
                    <Text style={styles.bulletPoint}>• Scheduled dates</Text>
                    <Text style={styles.bulletPoint}>• Scheduled times</Text>
                    <Text style={styles.bulletPoint}>• Reminder information</Text>
                    <Text style={styles.bulletPoint}>• Task status</Text>
                    <Text style={styles.bulletPoint}>• Timeline/repeat information</Text>
                    <Text style={styles.bulletPoint}>• Other information necessary to provide task-management functionality</Text>
                    <Text style={styles.paragraph}>
                      You retain ownership of the content you create.
                    </Text>

                    <Text style={styles.subheading}>Device and Notification Information</Text>
                    <Text style={styles.paragraph}>
                      To provide reminder notifications, we may collect and store a device or push-notification token associated with your account or device. This allows TaskAlert to send relevant notifications to your device.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. How We Use Your Information</Text>
                    <Text style={styles.paragraph}>
                      We use collected information to:
                    </Text>
                    <Text style={styles.bulletPoint}>• Create and maintain your account.</Text>
                    <Text style={styles.bulletPoint}>• Authenticate your account.</Text>
                    <Text style={styles.bulletPoint}>• Verify your email address.</Text>
                    <Text style={styles.bulletPoint}>• Provide login and password-recovery functionality.</Text>
                    <Text style={styles.bulletPoint}>• Store and display your tasks and reminders.</Text>
                    <Text style={styles.bulletPoint}>• Schedule and deliver notifications.</Text>
                    <Text style={styles.bulletPoint}>• Provide Free and Pro functionality.</Text>
                    <Text style={styles.bulletPoint}>• Process subscription payments.</Text>
                    <Text style={styles.bulletPoint}>• Provide customer support.</Text>
                    <Text style={styles.bulletPoint}>• Investigate and resolve technical issues.</Text>
                    <Text style={styles.bulletPoint}>• Maintain and secure the Service.</Text>
                    <Text style={styles.bulletPoint}>• Detect and prevent unauthorized or abusive activity.</Text>
                    <Text style={styles.bulletPoint}>• Comply with applicable legal obligations.</Text>
                    <Text style={styles.paragraph}>
                      We do not sell your personal information or task content for advertising purposes.
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. How Your Task Data Is Used</Text>
                    <Text style={styles.paragraph}>
                      Your task and reminder information is primarily processed and stored so that TaskAlert can provide the functionality you request.
                    </Text>
                    <Text style={styles.paragraph}>
                      For example, we need to store your tasks so that you can access them later through your account and so that scheduled reminders can be generated.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your tasks are not intended to be publicly displayed or made available to other TaskAlert users.
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Account Authentication and Security</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert uses authentication mechanisms to protect your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      Passwords are handled using password-hashing/security practices rather than being stored as readable plain-text passwords.
                    </Text>
                    <Text style={styles.paragraph}>
                      You are responsible for keeping your email address and password secure.
                    </Text>
                    <Text style={styles.paragraph}>
                      No online service can guarantee absolute security. While we take reasonable technical and organizational measures to protect your information, we cannot guarantee that unauthorized access, security incidents, or other failures will never occur.
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Notifications</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert may use push-notification services to deliver reminders to your device.
                    </Text>
                    <Text style={styles.paragraph}>
                      To receive notifications, you must provide the necessary notification permission on your device.
                    </Text>
                    <Text style={styles.paragraph}>
                      Notifications may include information necessary to identify or remind you about a scheduled task.
                    </Text>
                    <Text style={styles.paragraph}>
                      Notification delivery can be affected by device settings, operating-system restrictions, network conditions, third-party notification infrastructure, maintenance, or other technical circumstances.
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Third-Party Service Providers</Text>
                    <Text style={styles.paragraph}>
                      We may use third-party providers to help operate TaskAlert. These may include services for:
                    </Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Payment processing:</Text> Razorpay</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Push notifications:</Text> Expo and/or Firebase</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Email delivery:</Text> Resend and/or Gmail</Text>
                    <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Hosting/server infrastructure:</Text> Applicable hosting and infrastructure providers</Text>
                    <Text style={styles.bulletPoint}>• Other technical services required to operate and maintain TaskAlert</Text>
                    <Text style={styles.paragraph}>
                      These providers may process information on our behalf where necessary to provide their services. We do not sell your personal information to these providers for advertising purposes. Third-party providers may have their own privacy policies and terms governing their services.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Payments</Text>
                    <Text style={styles.paragraph}>
                      When you purchase TaskAlert Pro, payment processing is handled through Razorpay or another payment provider made available by TaskAlert.
                    </Text>
                    <Text style={styles.paragraph}>
                      Payment providers may collect information required to process your transaction.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert does not need to store your complete payment-card information in order to provide the subscription service. Payment information may also be retained by the applicable payment provider according to its own policies and legal obligations.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Data Sharing</Text>
                    <Text style={styles.paragraph}>
                      We do not sell your personal information or task content.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may disclose information only where reasonably necessary, including:
                    </Text>
                    <Text style={styles.bulletPoint}>• To service providers that help us operate TaskAlert.</Text>
                    <Text style={styles.bulletPoint}>• To protect the security and integrity of the Service.</Text>
                    <Text style={styles.bulletPoint}>• To investigate fraud, abuse, or unauthorized activity.</Text>
                    <Text style={styles.bulletPoint}>• To comply with applicable laws, regulations, legal processes, court orders, or valid requests from authorized government or law-enforcement authorities.</Text>
                    <Text style={styles.bulletPoint}>• Where disclosure is otherwise necessary or permitted by applicable law.</Text>
                    <Text style={styles.paragraph}>
                      Where legally permitted, we may take reasonable steps to limit disclosures to information relevant to the applicable request or purpose.
                    </Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. Data Retention</Text>
                    <Text style={styles.paragraph}>
                      We retain your account and task information for as long as reasonably necessary to provide the Service and maintain your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      If an account is terminated, relevant information may be retained for a limited period for security, legal, operational, backup, dispute-resolution, or other legitimate purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      After the applicable retention period, information may be deleted or anonymized. We may retain certain information where required by law or reasonably necessary to establish, exercise, or defend legal claims.
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. Account Deletion</Text>
                    <Text style={styles.paragraph}>
                      At present, TaskAlert does not provide a self-service account deletion option directly within the application.
                    </Text>
                    <Text style={styles.paragraph}>
                      If you want to request deletion of your account or personal information, you may contact TaskAlert through the available support/contact channel.
                    </Text>
                    <Text style={styles.paragraph}>
                      After receiving a valid deletion request, we may verify the request and process the deletion in accordance with applicable law and our legitimate operational and legal requirements.
                    </Text>
                    <Text style={styles.paragraph}>
                      Some information may need to be retained for a limited period where required or permitted by law.
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. Data Security</Text>
                    <Text style={styles.paragraph}>
                      We use reasonable technical and organizational measures designed to protect your information from unauthorized access, alteration, disclosure, or destruction.
                    </Text>
                    <Text style={styles.paragraph}>
                      These measures may include:
                    </Text>
                    <Text style={styles.bulletPoint}>• Secure communication using HTTPS/TLS</Text>
                    <Text style={styles.bulletPoint}>• Password hashing</Text>
                    <Text style={styles.bulletPoint}>• Access controls</Text>
                    <Text style={styles.bulletPoint}>• Server and database security measures</Text>
                    <Text style={styles.bulletPoint}>• Security monitoring and maintenance</Text>
                    <Text style={styles.bulletPoint}>• Backups and recovery measures</Text>
                    <Text style={styles.paragraph}>
                      However, no internet transmission or electronic storage system can be guaranteed to be completely secure.
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. Children's Privacy</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert is not intended to be used for purposes that require us to knowingly collect personal information from children in violation of applicable law.
                    </Text>
                    <Text style={styles.paragraph}>
                      If we become aware that we have collected personal information from a child in circumstances where such collection is not permitted, we may take appropriate steps to delete the information.
                    </Text>
                    <Text style={styles.paragraph}>
                      Parents or legal guardians who believe that a child has provided personal information to us may contact us through the available support channel.
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. Cookies and Tracking</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert's core task-management functionality does not require us to sell personal information or task content for advertising purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      If analytics, cookies, identifiers, or similar technologies are introduced in the future, this Privacy Policy may be updated to explain their use where required by applicable law.
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. Your Rights</Text>
                    <Text style={styles.paragraph}>
                      Depending on your location and applicable law, you may have rights relating to your personal information, which may include the right to:
                    </Text>
                    <Text style={styles.bulletPoint}>• Request access to certain personal information.</Text>
                    <Text style={styles.bulletPoint}>• Request correction of inaccurate information.</Text>
                    <Text style={styles.bulletPoint}>• Request deletion of personal information where legally applicable.</Text>
                    <Text style={styles.bulletPoint}>• Ask questions about how your information is processed.</Text>
                    <Text style={styles.bulletPoint}>• Raise privacy-related concerns or complaints.</Text>
                    <Text style={styles.paragraph}>
                      To exercise applicable rights, contact us using the support/contact information provided by TaskAlert. We may need to verify your identity before processing certain requests.
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. Changes to This Privacy Policy</Text>
                    <Text style={styles.paragraph}>
                      We may update this Privacy Policy from time to time to reflect changes to our Service, technology, legal requirements, or data practices.
                    </Text>
                    <Text style={styles.paragraph}>
                      When we make changes, we will update the "Last Updated" date and may provide additional notice where appropriate. We encourage you to review this Privacy Policy periodically.
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. Contact Us</Text>
                    <Text style={styles.paragraph}>
                      If you have questions, concerns, complaints, or requests relating to this Privacy Policy or the handling of your information, please contact us through the support/contact options provided by TaskAlert or directly via <Text style={styles.linkText}>support@taskalert.com</Text>.
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
                  {isHindi ? 'I Understand (Samajh Gaya)' : 'I Understand'}
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
    paddingBottom: 28,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subheading: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
    marginBottom: 4,
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
    marginBottom: 5,
    paddingLeft: 6,
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
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default PrivacyPolicyModal;
