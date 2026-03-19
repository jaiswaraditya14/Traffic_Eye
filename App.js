import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider, AuthProvider } from './src/context';
import { AppNavigator } from './src/navigation';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AppProvider>
    </AuthProvider>
  );
}
