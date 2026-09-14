import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationProvider } from './src/context/NotificationContext';
import * as SplashScreen from 'expo-splash-screen';
import { createNavigationContainerRef } from '@react-navigation/native';
import { AppProvider, AuthProvider } from './src/context';
import { AppNavigator } from './src/navigation';
import { useDMSansFonts } from './src/utils/fonts';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { setupNotifications } from './src/services/notifications';

// Keep the native splash screen visible until fonts + auth state are ready.
// Must be called at module level — calling inside useEffect is too late.
SplashScreen.preventAutoHideAsync().catch(() => {
    // preventAutoHideAsync can throw if the splash was already hidden (e.g. in Expo Go dev).
    // Safe to ignore — the JS SplashScreen animation will still play.
});

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

// Navigation ref — allows navigating from outside the Navigator tree (e.g. on notification tap)
export const navigationRef = createNavigationContainerRef();

export default function App() {
  const { fontsLoaded, fontError } = useDMSansFonts();

  useEffect(() => {
    // Set up Android notification channel + request OS permission
    // This is safe to call every startup — channels are idempotent
    setupNotifications().catch(err => {
      if (__DEV__) console.warn('[App] Notification setup failed:', err?.message);
    });

  }, []);

  // While fonts are loading, keep the native splash on screen by rendering
  // a plain navy view that matches the splash background color exactly.
  // Do NOT render an ActivityIndicator here — that causes the visible flash
  // between native splash and JS SplashScreen animation.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#0A1E3F' }} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <NotificationProvider navigationRef={navigationRef}>
          <StatusBar style="auto" />
          <AppNavigator navigationRef={navigationRef} />
        </NotificationProvider>
        </AppProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
