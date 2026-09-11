import React, { useEffect } from 'react';
import { Platform, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/hooks';
import RootNavigator from './src/navigation/RootNavigator';
import { NotificationService } from './src/services/notifications/notification.service';

if (Platform.OS !== 'web' && LogBox && typeof LogBox.ignoreLogs === 'function') {
  LogBox.ignoreLogs([
    '[expo-notifications]',
    'expo-notifications functionality is not fully supported in Expo Go',
    'The method or property ServerRegistrationModule',
    'ServerRegistrationModule.getRegistrationInfoAsync',
    'Cannot connect to Expo CLI',
  ]);
}

export default function App() {
  useEffect(() => {
    NotificationService.init().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" backgroundColor="#EDF2F4" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
