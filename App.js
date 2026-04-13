import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider, AuthProvider } from './src/context';
import { AppNavigator } from './src/navigation';
import { useDMSansFonts } from './src/utils/fonts';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

export default function App() {
<<<<<<< HEAD
<<<<<<< Updated upstream
=======
  const { fontsLoaded, fontError } = useDMSansFonts();
  
  console.log('Fonts status:', { fontsLoaded, fontError });
=======
  const { fontsLoaded, fontError } = useDMSansFonts();
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a

  // Hold splash until fonts are ready
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#002452' }}>
        <ActivityIndicator color="#F59E0B" size="large" />
      </View>
    );
  }

<<<<<<< HEAD
>>>>>>> Stashed changes
=======
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProvider>
    </AuthProvider>
  );
}
