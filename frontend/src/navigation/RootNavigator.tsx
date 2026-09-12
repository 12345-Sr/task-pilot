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

export type RootStackParamList = {
  Welcome: undefined;
  Language: undefined;
  Signup: undefined;
  Login: undefined;
  ForgotPassword: { email?: string } | undefined;
  Main: undefined;
  AddTask: undefined;
  TaskDetail: { taskId: string };
  Premium: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  TodayTab: undefined;
  AddTaskTab: undefined;
  EveningTab: undefined;
  ProgressTab: undefined;
  SettingsTab?: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const { language } = useAppStore();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12);
  const tabBarHeight = 58 + bottomPadding;

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
          let icon = '•';
          if (route.name === 'TodayTab') icon = '🏠';
          if (route.name === 'AddTaskTab') icon = '➕';
          if (route.name === 'EveningTab') icon = '🌙';
          if (route.name === 'ProgressTab') icon = '📊';
          return (
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
              {icon}
            </Text>
          );
        },
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen
        name="TodayTab"
        component={TodayScreen}
        options={{ title: language === 'hi' ? 'Aaj Ke Kaam' : t(language, 'tab_today') }}
      />
      <Tab.Screen
        name="AddTaskTab"
        component={AddTaskScreen}
        options={{ title: language === 'hi' ? '+ Naya Kaam' : t(language, 'add_task_title') }}
      />
      <Tab.Screen
        name="EveningTab"
        component={EveningScreen}
        options={{ title: language === 'hi' ? 'Shaam Check' : t(language, 'tab_evening') }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        options={{ title: language === 'hi' ? 'Progress' : t(language, 'tab_progress') }}
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
          background: '#EDF2F4',
          card: '#FFFFFF',
          text: '#0F172A',
          border: '#E2E8F0',
          primary: colors.primary,
          notification: colors.primary,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Language"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="AddTask" component={AddTaskScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        <Stack.Screen
          name="Premium"
          component={PremiumScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.8,
  },
  tabIconFocused: {
    transform: [{ scale: 1.15 }],
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default RootNavigator;
