import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import { useAppStore } from '../store';
import { t } from '../i18n';

// Screens
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LanguageScreen from '../screens/LanguageScreen';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TodayScreen from '../screens/TodayScreen';
import AddTaskScreen from '../screens/AddTaskScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import EveningScreen from '../screens/EveningScreen';
import ProgressScreen from '../screens/ProgressScreen';
import PremiumScreen from '../screens/PremiumScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TaskHistoryScreen from '../screens/TaskHistoryScreen';
import PaymentCheckoutScreen from '../screens/PaymentCheckoutScreen';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Language: undefined;
  Signup: undefined;
  Login: undefined;
  ForgotPassword: { email?: string } | undefined;
  Main: undefined;
  AddTask: undefined;
  TaskDetail: { taskId: string };
  TaskHistory: undefined;
  Evening: undefined;
  Progress: undefined;
  Premium: undefined;
  PaymentCheckout: {
    orderData?: any;
    planPrice?: number;
    planTitle?: string;
  } | undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  TodayTab: undefined;
  HistoryTab: undefined;
  AddTaskTab: undefined;
  EveningTab: undefined;
  ProgressTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const { language } = useAppStore();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10);
  const tabBarHeight = 60 + bottomPadding;

  return (
    <Tab.Navigator
      key={`tabs-${language}`}
      initialRouteName="TodayTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarIcon: ({ focused }) => {
          if (route.name === 'TodayTab') {
            return (
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                🏠
              </Text>
            );
          }
          if (route.name === 'HistoryTab') {
            return (
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                🕒
              </Text>
            );
          }
          if (route.name === 'AddTaskTab') {
            return (
              <View style={styles.centerAddBtn}>
                <Text style={styles.centerAddText}>+</Text>
              </View>
            );
          }
          if (route.name === 'EveningTab') {
            return (
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                🌙
              </Text>
            );
          }
          if (route.name === 'ProgressTab') {
            return (
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                🔥
              </Text>
            );
          }
          if (route.name === 'SettingsTab') {
            return (
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                ⚙️
              </Text>
            );
          }
          return null;
        },
        tabBarLabel: ({ focused }) => {
          if (route.name === 'AddTaskTab') return null;
          let label = 'Home';
          if (route.name === 'TodayTab') label = t(language, 'tab_today_short') || 'Home';
          if (route.name === 'HistoryTab') label = language === 'hi' ? 'Itihaas' : 'History';
          if (route.name === 'EveningTab') label = t(language, 'tab_evening') || 'Evening';
          if (route.name === 'ProgressTab') label = t(language, 'tab_progress') || 'Streak';
          if (route.name === 'SettingsTab') label = t(language, 'tab_settings') || 'Settings';
          return (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? colors.primary : '#94A3B8' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          );
        },
        tabBarAllowFontScaling: false,
        tabBarItemStyle: { paddingHorizontal: 1 },
      })}
    >
      <Tab.Screen
        name="TodayTab"
        component={TodayScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={TaskHistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen
        name="AddTaskTab"
        component={AddTaskScreen}
        options={{ title: '' }}
      />
      <Tab.Screen
        name="EveningTab"
        component={EveningScreen}
        options={{ title: 'Evening' }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        options={{ title: 'Streak' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, language } = useAppStore();

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          background: '#F8FAF8',
          card: '#FFFFFF',
          text: '#0F172A',
          border: '#E2E8F0',
          primary: colors.primary,
          notification: colors.primary,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="AddTask" component={AddTaskScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        <Stack.Screen name="TaskHistory" component={TaskHistoryScreen} />
        <Stack.Screen name="Evening" component={EveningScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
        <Stack.Screen
          name="Premium"
          component={PremiumScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="PaymentCheckout"
          component={PaymentCheckoutScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EAEAEA',
    borderTopWidth: 1,
    paddingTop: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.85,
  },
  tabIconFocused: {
    transform: [{ scale: 1.12 }],
    opacity: 1,
  },
  centerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D5C3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#0D5C3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  centerAddText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 28,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default RootNavigator;
