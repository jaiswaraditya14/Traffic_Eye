import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, AuthProvider } from './src/context';
import { AppNavigator } from './src/navigation';

export default function App() {
<<<<<<< Updated upstream
=======
  const { fontsLoaded, fontError } = useDMSansFonts();
  
  console.log('Fonts status:', { fontsLoaded, fontError });

  // Hold splash until fonts are ready
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#002452' }}>
        <ActivityIndicator color="#F59E0B" size="large" />
      </View>
    );
  }

>>>>>>> Stashed changes
  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProvider>
    </AuthProvider>
  );
}
