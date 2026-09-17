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
                  <Text style={styles.title} numberOfLines={1}>
                    Terms & Conditions
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
                      TaskAlert mein aapka swagat hai. Yeh Terms & Conditions ("Terms") TaskAlert application aur related services ("TaskAlert", "hum", "humein", ya "hamara") ke access aur use ko govern karti hain. Account banakar ya TaskAlert use karke, aap in Terms ka palan karne ke liye agree karte hain. Agar aap in Terms se sahmat nahi hain, toh kripya Service ka use na karein.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. TaskAlert Ke Baare Mein (About TaskAlert)</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ek task-management aur productivity application hai jo users ko tasks aur reminders create, organize, schedule aur manage karne mein help karne ke liye design kiya gaya hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ka use personal aur business dono purposes ke liye kiya ja sakta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ek productivity tool hai aur iska maksad professional, emergency, medical, legal, financial ya anya critical services ko replace karna nahi hai.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. User Accounts</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert use karne ke liye, aapko ek account create karna hoga. Registration ke dauraan, aapko yeh details provide karni ho sakti hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• Aapka naam</Text>
                    <Text style={styles.bulletPoint}>• Aapka email address</Text>
                    <Text style={styles.bulletPoint}>• Ek password</Text>
                    <Text style={styles.paragraph}>
                      Aapka email address TaskAlert dwara provide kiye gaye verification process ke through verify hona zaroori hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Sahi details provide karne aur apne login credentials ki confidentiality maintain karne ke liye aap khud zimmedar hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Aapka TaskAlert account personal hai. Aapko apne login credentials kisi aur ke sath share nahi karne chahiye aur na hi unauthorized persons ko account access karne dena chahiye.
                    </Text>
                    <Text style={styles.paragraph}>
                      Apne account ke through hone wali sabhi activities ke liye aap responsible hain aur agar aapko lagta hai ki account unauthorized access hua hai, toh humein turant notify karein.
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Task aur Reminder Data</Text>
                    <Text style={styles.paragraph}>
                      Users TaskAlert ke andar tasks aur reminders create, edit, schedule aur delete kar sakte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Aap jo tasks aur content create aur submit karte hain, uska ownership aapke paas hi rehta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert aapki task information ko process aur store karta hai taaki Service task-management aur reminder functionality provide kar sake aur aap apne account se apni details access kar sakein.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert aapke task content ko sell nahi karta aur na hi advertising ke liye use karta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Aapki task information publicly display nahi hoti aur na hi Service ke doosre users ke sath share ki jaati hai.
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Free Plan</Text>
                    <Text style={styles.paragraph}>
                      Free Plan mein ek user maximum 3 tasks create kar sakta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Ek baar 3 tasks create karne ki limit puri ho jaane par, user Free Plan ke under additional tasks create nahi kar sakta.
                    </Text>
                    <Text style={styles.paragraph}>
                      Kisi existing task ko delete karne se task-creation allowance reset ya increase nahi hota.
                    </Text>
                    <Text style={styles.paragraph}>
                      Additional task-management functionality ke liye Pro subscription required ho sakti hai.
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Pro Subscription</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ₹399 mein 30 days ke liye Pro subscription offer karta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Pro subscription additional features provide karta hai, jinmein shamil hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• Unlimited task creation (unlimited kaam add karein)</Text>
                    <Text style={styles.bulletPoint}>• Timeline/repeat feature ka use karke previously created tasks ko selected dates ya periods par reuse aur repeat karne ki ability</Text>
                    <Text style={styles.paragraph}>
                      Pro access purchase/activation date se 30 days tak available rehta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Pro subscriptions currently automatically renew nahi hote hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      30 days ki Pro period expire hone ke baad, user ko Pro features continue rakhne ke liye dobara purchase karna hoga.
                    </Text>
                    <Text style={styles.paragraph}>
                      Hum future mein subscription features ko introduce, modify, add ya remove kar sakte hain.
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Payments</Text>
                    <Text style={styles.paragraph}>
                      Pro subscriptions ke payments Razorpay ya TaskAlert dwara provide kiye gaye payment-processing partners ke through process hote hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Purchase karke, aap payment provider ko unki terms aur policies ke anusar transaction process karne ke liye authorize karte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert aapke complete payment-card details apne servers par store nahi karta.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Refund Policy</Text>
                    <Text style={styles.paragraph}>
                      Sabhi Pro purchases non-refundable hain, siwaye wahan jahan applicable law ke mutabiq refund mandatory ho ya jahan TaskAlert technical payment issue ke liye corrective action lena decide kare.
                    </Text>
                    <Text style={styles.paragraph}>
                      Agar aapki payment successfully deduct ho gayi hai lekin technical issue ki wajah se Pro access activate nahi hua hai, toh aap in-app support ya ticket system ke through contact kar sakte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Hum transaction ko investigate karenge aur jahan zaroori ho, service activate karke ya appropriate action lekar issue solve karenge.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Notifications aur Reminders</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert scheduled tasks aur reminders se related notifications send kar sakta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task settings ke according, reminder notifications send ki ja sakti hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• Scheduled task se lagbhag 10 minutes pehle, aur</Text>
                    <Text style={styles.bulletPoint}>• Scheduled task ke exact time par</Text>
                    <Text style={styles.paragraph}>
                      Notification delivery ke liye aapke device par notification permissions enabled hona zaroori hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert yeh guarantee nahi deta ki har notification hamesha exact time par ya deliver hogi hi.
                    </Text>
                    <Text style={styles.paragraph}>
                      Technical issues, device settings, OS restrictions, battery optimization, network issues ya 3rd-party service issues ke chalte notifications delay, interrupt ya miss ho sakti hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Apne tasks ko monitor aur manage karne ke liye aap khud zimmedar hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ko emergency, medical, life-critical, hazardous ya legal situations ke liye sole reminder system ki tarah use nahi kiya jana chahiye jahan reminder miss hone se bada loss ho sake.
                    </Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. Acceptable Use (Sahi Upyog)</Text>
                    <Text style={styles.paragraph}>
                      Aap TaskAlert ko sirf lawful purposes ke liye use karne par agree karte hain. Aapko yeh sab bilkul nahi karna chahiye:
                    </Text>
                    <Text style={styles.bulletPoint}>• Illegal activities ke liye use karna.</Text>
                    <Text style={styles.bulletPoint}>• Kisi doosre user ke account ya data ko unauthorized access karna.</Text>
                    <Text style={styles.bulletPoint}>• Hamare systems, servers, databases ya infrastructure par unauthorized access lena.</Text>
                    <Text style={styles.bulletPoint}>• Service ke source code ko hack, reverse engineer, decompile ya derive karna.</Text>
                    <Text style={styles.bulletPoint}>• App ke unauthorized derivative versions copy, modify, reproduce ya distribute karna.</Text>
                    <Text style={styles.bulletPoint}>• Malware, viruses ya malicious code introduce karna.</Text>
                    <Text style={styles.bulletPoint}>• Spam, abuse, harassment ya malicious activities ke liye use karna.</Text>
                    <Text style={styles.bulletPoint}>• Service ya infrastructure ko disrupt, damage ya overload karna.</Text>
                    <Text style={styles.bulletPoint}>• Security measures, usage limits ya restrictions ko bypass karna.</Text>
                    <Text style={styles.bulletPoint}>• Applicable laws ya regulations violate karna.</Text>
                    <Text style={styles.paragraph}>
                      Prohibited activities mein shamil accounts ke khilaaf hum appropriate action lene ka right reserve karte hain.
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. Intellectual Property (Baudhik Sampada)</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert aur iski underlying technology TaskAlert ki ownership aur property hai. Isme shamil hain:
                    </Text>
                    <Text style={styles.bulletPoint}>• TaskAlert name</Text>
                    <Text style={styles.bulletPoint}>• Logo aur branding</Text>
                    <Text style={styles.bulletPoint}>• Application design aur UI</Text>
                    <Text style={styles.bulletPoint}>• Source code</Text>
                    <Text style={styles.bulletPoint}>• Software aur features</Text>
                    <Text style={styles.bulletPoint}>• Graphics, text aur proprietary material</Text>
                    <Text style={styles.paragraph}>
                      In Terms ke mutabiq Service use karne ke limited right ke alawa koi ownership rights aapko transfer nahi hote hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Aap bina hamari prior written permission ke TaskAlert ke kisi bhi part ko copy, reproduce, modify, distribute, sell, license ya derivative work nahi bana sakte.
                    </Text>
                    <Text style={styles.paragraph}>
                      Aapke dwara Service ke andar banaye content par aapka ownership barkarar rehta hai.
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. Service Availability</Text>
                    <Text style={styles.paragraph}>
                      Hum TaskAlert ko hamesha available aur reliable rakhne ka pura prayas karte hain, lekin hum yeh guarantee nahi dete ki Service hamesha available, uninterrupted, error-free, secure ya technical bugs se free rahegi.
                    </Text>
                    <Text style={styles.paragraph}>
                      Maintenance, upgrades, server issues, security measures ya technical problems ke chalte TaskAlert temporarily unavailable ho sakta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Hum zaroori hone par Service ke parts ko modify, update, improve, suspend ya discontinue kar sakte hain.
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. Features aur Plans Mein Badlaav</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert Free ya Pro versions mein features add, modify, improve, restrict ya remove kar sakta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Hum future mein naye plans, features ya pricing structures bhi introduce kar sakte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Agar Pro subscription price change hoti hai, toh nayi price future purchases par apply hogi. Existing purchased 30-day Pro period par koi effect nahi hoga.
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. Third-Party Services</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert Service chalane ke liye third-party service providers par rely karta hai, jaise payment processing, email delivery, notifications, hosting aur server infrastructure.
                    </Text>
                    <Text style={styles.paragraph}>
                      In services mein Razorpay, Expo, Firebase, Resend, Gmail ya hosting providers shamil ho sakte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Third-party services ka use unke apne terms aur privacy policies ke anusar govern hota hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Third-party services ke kaaran hone wale interruptions ya failures ke liye TaskAlert solely responsible nahi hai.
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. Account Suspension aur Termination</Text>
                    <Text style={styles.paragraph}>
                      Agar hume pata chalta hai ki aapne in Terms ka violation kiya hai ya fraudulent, abusive, illegal ya security-threatening activity ki hai, toh TaskAlert aapka account suspend ya terminate kar sakta hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Yeh right Free aur Pro dono accounts par apply hota hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Agar Terms violation ki wajah se account terminate kiya jata hai, toh aap kisi bhi unused Pro period ke refund ke hakdar nahi honge.
                    </Text>
                    <Text style={styles.paragraph}>
                      Termination ke baad, operational, security, legal ya dispute resolution ke liye data limited time tak retain ho sakta hai aur uske baad delete kar diya jata hai.
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. Disclaimer (Aswikaran)</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ek productivity aur task-management tool ke taur par provide kiya jata hai.
                    </Text>
                    <Text style={styles.paragraph}>
                      Hum yeh guarantee nahi dete ki:
                    </Text>
                    <Text style={styles.bulletPoint}>• Tasks hamesha bina kisi interruption ke available rahenge.</Text>
                    <Text style={styles.bulletPoint}>• Notifications hamesha deliver hongi.</Text>
                    <Text style={styles.bulletPoint}>• Notifications hamesha exact time par hi aayengi.</Text>
                    <Text style={styles.bulletPoint}>• Service hamesha errors ya technical bugs se free rahegi.</Text>
                    <Text style={styles.bulletPoint}>• Data ya features kabhi temporarily unavailable nahi honge.</Text>
                    <Text style={styles.paragraph}>
                      Aap TaskAlert ka use apne discretion aur risk par karte hain. Emergency, medical, legal ya critical matters ke liye ispar akele depend na karein.
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. Limitation of Liability</Text>
                    <Text style={styles.paragraph}>
                      Applicable law dwara permitted maximum extent tak, TaskAlert aur iske creators, employees ya affiliates indirect, incidental, consequential ya special damages ke liye liable nahi honge.
                    </Text>
                    <Text style={styles.paragraph}>
                      Isme missed, delayed ya failed notifications, service interruptions, technical failures ya network problems se hone wale losses shamil hain.
                    </Text>
                  </View>

                  {/* Section 17 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>17. Privacy Policy</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert ka use hamari Privacy Policy ke through bhi govern hota hai, jo batati hai ki hum personal information kaise collect, use aur protect karte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Hamari Privacy Policy in Terms ka ek part hai.
                    </Text>
                  </View>

                  {/* Section 18 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>18. In Terms Mein Badlaav (Changes to These Terms)</Text>
                    <Text style={styles.paragraph}>
                      Hum service features, legal requirements ya business practices ko reflect karne ke liye samay-samay par in Terms ko update kar sakte hain.
                    </Text>
                    <Text style={styles.paragraph}>
                      Jab hum changes karenge, toh hum "Last Updated" date update karenge aur application ke through notice provide karenge.
                    </Text>
                    <Text style={styles.paragraph}>
                      Updated Terms aane ke baad continue use revised Terms ki acceptance mana jayega.
                    </Text>
                  </View>

                  {/* Section 19 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>19. Governing Law (Kanoon aur Jurisdiction)</Text>
                    <Text style={styles.paragraph}>
                      Yeh Terms India ke applicable laws ke anusar govern aur interpret ki jaayengi.
                    </Text>
                    <Text style={styles.paragraph}>
                      In Terms ya Service se related kisi bhi dispute ka jurisdiction India ke appropriate courts ke under hoga.
                    </Text>
                  </View>

                  {/* Section 20 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>20. Contact Us (Sampark Karein)</Text>
                    <Text style={styles.paragraph}>
                      Agar in Terms ya TaskAlert ke regarding aapke koi questions, concerns, complaints ya support requests hain, toh aap in-app support/tickets ya hamare support email <Text style={styles.linkText}>support@taskalert.com</Text> par contact kar sakte hain.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>
                      Welcome to TaskAlert. These Terms & Conditions ("Terms") govern your access to and use of the TaskAlert application and related services ("TaskAlert", "we", "us", or "our"). By creating an account or using TaskAlert, you agree to comply with these Terms. If you do not agree with these Terms, please do not use the Service.
                    </Text>
                  </View>

                  {/* Section 1 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>1. About TaskAlert</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert is a task-management and productivity application designed to help users create, organize, schedule, and manage tasks and reminders.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert may be used for both personal and business purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert is a productivity tool and is not intended to replace professional, emergency, medical, legal, financial, or other critical services.
                    </Text>
                  </View>

                  {/* Section 2 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>2. User Accounts</Text>
                    <Text style={styles.paragraph}>
                      To use TaskAlert, you must create an account.
                    </Text>
                    <Text style={styles.paragraph}>
                      During registration, you may be required to provide:
                    </Text>
                    <Text style={styles.bulletPoint}>• Your name</Text>
                    <Text style={styles.bulletPoint}>• Your email address</Text>
                    <Text style={styles.bulletPoint}>• A password</Text>
                    <Text style={styles.paragraph}>
                      Your email address must be verified using the verification process provided by TaskAlert.
                    </Text>
                    <Text style={styles.paragraph}>
                      You are responsible for providing accurate information and maintaining the confidentiality of your login credentials.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your TaskAlert account is personal to you. You must not share your login credentials with others or allow unauthorized persons to access your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      You are responsible for activities performed through your account and should notify us if you believe your account has been accessed without authorization.
                    </Text>
                  </View>

                  {/* Section 3 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>3. Task and Reminder Data</Text>
                    <Text style={styles.paragraph}>
                      Users may create, edit, schedule, and delete tasks and reminders within TaskAlert.
                    </Text>
                    <Text style={styles.paragraph}>
                      You retain ownership of the task and other content that you create and submit to TaskAlert.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert processes and stores your task information so that the Service can provide its task-management and reminder functionality and allow you to access your information when using your account.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert does not sell your task content or use it for advertising purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      Task information is not publicly displayed or shared with other users through the Service.
                    </Text>
                  </View>

                  {/* Section 4 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>4. Free Plan</Text>
                    <Text style={styles.paragraph}>
                      The Free Plan allows a user to create up to 3 tasks.
                    </Text>
                    <Text style={styles.paragraph}>
                      Once the maximum of 3 tasks has been reached, the user cannot create additional tasks under the Free Plan.
                    </Text>
                    <Text style={styles.paragraph}>
                      Deleting an existing task does not reset or increase the user's task-creation allowance.
                    </Text>
                    <Text style={styles.paragraph}>
                      Additional task-management functionality may require a Pro subscription.
                    </Text>
                  </View>

                  {/* Section 5 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>5. Pro Subscription</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert offers a Pro subscription for ₹399 for 30 days.
                    </Text>
                    <Text style={styles.paragraph}>
                      A Pro subscription provides additional functionality, including:
                    </Text>
                    <Text style={styles.bulletPoint}>• Unlimited task creation</Text>
                    <Text style={styles.bulletPoint}>• The ability to reuse or repeat previously created tasks across selected dates or periods using the available timeline/repeat functionality</Text>
                    <Text style={styles.paragraph}>
                      Pro access remains available for 30 days from the applicable purchase/activation period.
                    </Text>
                    <Text style={styles.paragraph}>
                      Pro subscriptions currently do not automatically renew.
                    </Text>
                    <Text style={styles.paragraph}>
                      After the 30-day Pro period expires, the user must make another purchase to continue using Pro features.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may introduce, modify, add, or remove subscription features in the future.
                    </Text>
                  </View>

                  {/* Section 6 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>6. Payments</Text>
                    <Text style={styles.paragraph}>
                      Payments for Pro subscriptions are processed through Razorpay or other payment-processing services made available by TaskAlert.
                    </Text>
                    <Text style={styles.paragraph}>
                      By making a purchase, you authorize the applicable payment provider to process the transaction according to its applicable terms and policies.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert does not store your complete payment-card details on its own servers unless expressly stated otherwise.
                    </Text>
                  </View>

                  {/* Section 7 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>7. Refund Policy</Text>
                    <Text style={styles.paragraph}>
                      All Pro purchases are non-refundable, except where a refund is required by applicable law or where TaskAlert determines that a technical payment issue requires corrective action.
                    </Text>
                    <Text style={styles.paragraph}>
                      If your payment has been successfully deducted but your Pro access has not been activated due to a technical issue, you may contact TaskAlert through the available support or ticket system.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may investigate the transaction and, where appropriate, resolve the issue by activating the purchased service or taking another appropriate corrective action.
                    </Text>
                  </View>

                  {/* Section 8 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>8. Notifications and Reminders</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert may send notifications relating to scheduled tasks and reminders.
                    </Text>
                    <Text style={styles.paragraph}>
                      Depending on the task settings, reminder notifications may be sent:
                    </Text>
                    <Text style={styles.bulletPoint}>• Approximately 10 minutes before the scheduled task, and</Text>
                    <Text style={styles.bulletPoint}>• At the scheduled task time</Text>
                    <Text style={styles.paragraph}>
                      Notification delivery requires the appropriate notification permissions on your device.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert does not guarantee that every notification will always be delivered exactly on time or delivered at all.
                    </Text>
                    <Text style={styles.paragraph}>
                      Notifications may be delayed, interrupted, or missed due to technical issues, device settings, operating-system restrictions, network conditions, third-party services, maintenance, or other circumstances outside our reasonable control.
                    </Text>
                    <Text style={styles.paragraph}>
                      You remain responsible for monitoring and managing your tasks.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert should not be used as the sole system for emergency, medical, life-critical, hazardous, legal, or other situations where failure of a reminder could result in serious harm or loss.
                    </Text>
                  </View>

                  {/* Section 9 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>9. Acceptable Use</Text>
                    <Text style={styles.paragraph}>
                      You agree to use TaskAlert only for lawful purposes.
                    </Text>
                    <Text style={styles.paragraph}>
                      You must not:
                    </Text>
                    <Text style={styles.bulletPoint}>• Use TaskAlert for illegal activities.</Text>
                    <Text style={styles.bulletPoint}>• Attempt to access another user's account or information without authorization.</Text>
                    <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to our systems, servers, databases, or infrastructure.</Text>
                    <Text style={styles.bulletPoint}>• Hack, reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service.</Text>
                    <Text style={styles.bulletPoint}>• Copy, modify, reproduce, distribute, or create unauthorized derivative versions of the application.</Text>
                    <Text style={styles.bulletPoint}>• Introduce malware, viruses, malicious code, or other harmful material.</Text>
                    <Text style={styles.bulletPoint}>• Use the Service for spam, abuse, harassment, or malicious activities.</Text>
                    <Text style={styles.bulletPoint}>• Attempt to disrupt, damage, overload, or interfere with the Service or its infrastructure.</Text>
                    <Text style={styles.bulletPoint}>• Circumvent or attempt to bypass security measures, usage limits, or access restrictions.</Text>
                    <Text style={styles.bulletPoint}>• Use the Service in a way that violates applicable laws or regulations.</Text>
                    <Text style={styles.paragraph}>
                      We reserve the right to take appropriate action against accounts involved in prohibited activities.
                    </Text>
                  </View>

                  {/* Section 10 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>10. Intellectual Property</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert and its underlying technology are owned by or licensed to TaskAlert.
                    </Text>
                    <Text style={styles.paragraph}>
                      This includes, without limitation:
                    </Text>
                    <Text style={styles.bulletPoint}>• TaskAlert name</Text>
                    <Text style={styles.bulletPoint}>• Logo and branding</Text>
                    <Text style={styles.bulletPoint}>• Application design and user interface</Text>
                    <Text style={styles.bulletPoint}>• Source code</Text>
                    <Text style={styles.bulletPoint}>• Software</Text>
                    <Text style={styles.bulletPoint}>• Features</Text>
                    <Text style={styles.bulletPoint}>• Graphics</Text>
                    <Text style={styles.bulletPoint}>• Text and other proprietary materials</Text>
                    <Text style={styles.paragraph}>
                      Except for the limited right to use the Service in accordance with these Terms, no ownership rights are transferred to you.
                    </Text>
                    <Text style={styles.paragraph}>
                      You may not copy, reproduce, modify, distribute, sell, license, reverse engineer, or create derivative works from any part of TaskAlert without our prior written permission.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your ownership of content that you create within the Service remains unaffected.
                    </Text>
                  </View>

                  {/* Section 11 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>11. Service Availability</Text>
                    <Text style={styles.paragraph}>
                      We aim to keep TaskAlert available and functional, but we do not guarantee that the Service will always be:
                    </Text>
                    <Text style={styles.bulletPoint}>• Available</Text>
                    <Text style={styles.bulletPoint}>• Uninterrupted</Text>
                    <Text style={styles.bulletPoint}>• Error-free</Text>
                    <Text style={styles.bulletPoint}>• Secure</Text>
                    <Text style={styles.bulletPoint}>• Free from bugs or technical issues</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert may occasionally be unavailable because of maintenance, upgrades, server issues, security measures, technical problems, or circumstances beyond our reasonable control.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may modify, update, improve, suspend, or discontinue parts of the Service when reasonably necessary.
                    </Text>
                  </View>

                  {/* Section 12 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>12. Changes to Features and Plans</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert may add, modify, improve, restrict, or remove features from the Free or Pro versions of the Service.
                    </Text>
                    <Text style={styles.paragraph}>
                      We may also introduce new plans, features, pricing structures, or functionality in the future.
                    </Text>
                    <Text style={styles.paragraph}>
                      If the Pro subscription price changes, the new price will apply to future purchases. A price change will not alter the already-purchased 30-day Pro period.
                    </Text>
                  </View>

                  {/* Section 13 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>13. Third-Party Services</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert may rely on third-party service providers to operate certain parts of the Service, including payment processing, email delivery, notifications, hosting, infrastructure, or other technical services.
                    </Text>
                    <Text style={styles.paragraph}>
                      These services may include providers such as Razorpay, Expo, Firebase, Resend, Gmail, hosting providers, or other services used by TaskAlert from time to time.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your use of third-party services may also be subject to those providers' own terms and policies.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert is not responsible for interruptions, failures, or limitations caused solely by third-party services.
                    </Text>
                  </View>

                  {/* Section 14 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>14. Account Suspension and Termination</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert may suspend or terminate your account if we reasonably determine that you have violated these Terms or engaged in prohibited, fraudulent, abusive, illegal, or security-threatening activity.
                    </Text>
                    <Text style={styles.paragraph}>
                      This right applies to both Free and Pro accounts.
                    </Text>
                    <Text style={styles.paragraph}>
                      If your account is terminated because of a violation of these Terms, you will not be entitled to a refund for any unused Pro subscription period, except where required by applicable law.
                    </Text>
                    <Text style={styles.paragraph}>
                      Following termination, your task and account data may be retained for a limited period for operational, security, legal, or other legitimate purposes. If no further action is required, such data may subsequently be deleted in accordance with our data-retention practices and Privacy Policy.
                    </Text>
                  </View>

                  {/* Section 15 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>15. Disclaimer</Text>
                    <Text style={styles.paragraph}>
                      TaskAlert is provided as a productivity and task-management service.
                    </Text>
                    <Text style={styles.paragraph}>
                      We do not guarantee that:
                    </Text>
                    <Text style={styles.bulletPoint}>• Tasks will always be available without interruption.</Text>
                    <Text style={styles.bulletPoint}>• Notifications will always be delivered.</Text>
                    <Text style={styles.bulletPoint}>• Notifications will always arrive at the exact intended time.</Text>
                    <Text style={styles.bulletPoint}>• The Service will always be free from errors or technical problems.</Text>
                    <Text style={styles.bulletPoint}>• Data or functionality will never be temporarily unavailable.</Text>
                    <Text style={styles.paragraph}>
                      You use TaskAlert at your own discretion and risk.
                    </Text>
                    <Text style={styles.paragraph}>
                      TaskAlert is not an emergency alert system and should not be relied upon for emergency, medical, legal, financial, safety-critical, or life-critical matters.
                    </Text>
                  </View>

                  {/* Section 16 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>16. Limitation of Liability</Text>
                    <Text style={styles.paragraph}>
                      To the maximum extent permitted by applicable law, TaskAlert and its owners, operators, employees, affiliates, and service providers will not be liable for indirect, incidental, consequential, special, or punitive damages arising from or related to your use of, or inability to use, the Service.
                    </Text>
                    <Text style={styles.paragraph}>
                      This includes, where permitted by law, losses resulting from missed, delayed, or failed notifications, task availability issues, service interruptions, technical failures, device issues, network problems, or reliance on the Service for critical matters.
                    </Text>
                    <Text style={styles.paragraph}>
                      Nothing in these Terms is intended to exclude or limit liability that cannot legally be excluded or limited under applicable law.
                    </Text>
                  </View>

                  {/* Section 17 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>17. Privacy Policy</Text>
                    <Text style={styles.paragraph}>
                      Your use of TaskAlert is also governed by our Privacy Policy, which explains how we collect, use, store, and protect personal information.
                    </Text>
                    <Text style={styles.paragraph}>
                      Our Privacy Policy forms part of these Terms.
                    </Text>
                  </View>

                  {/* Section 18 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>18. Changes to These Terms</Text>
                    <Text style={styles.paragraph}>
                      We may update these Terms from time to time to reflect changes to the Service, features, pricing, legal requirements, or business practices.
                    </Text>
                    <Text style={styles.paragraph}>
                      When we make changes, we may update the "Last Updated" date and, where appropriate, provide notice through the application or other reasonable means.
                    </Text>
                    <Text style={styles.paragraph}>
                      Your continued use of TaskAlert after updated Terms become effective constitutes acceptance of the revised Terms, to the extent permitted by applicable law.
                    </Text>
                  </View>

                  {/* Section 19 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>19. Governing Law</Text>
                    <Text style={styles.paragraph}>
                      These Terms shall be governed by and interpreted in accordance with the applicable laws of India, without regard to conflict-of-law principles.
                    </Text>
                    <Text style={styles.paragraph}>
                      Any disputes relating to these Terms or the Service shall be subject to the jurisdiction of the courts having appropriate jurisdiction in India, subject to applicable law.
                    </Text>
                  </View>

                  {/* Section 20 */}
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>20. Contact Us</Text>
                    <Text style={styles.paragraph}>
                      If you have questions, concerns, complaints, or support requests regarding these Terms or TaskAlert, you may contact us through the support/contact options provided within the application or through our designated support contact at <Text style={styles.linkText}>support@taskalert.com</Text>.
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
                  {isHindi ? 'I Accept (Sweekar Karein)' : 'I Accept'}
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
