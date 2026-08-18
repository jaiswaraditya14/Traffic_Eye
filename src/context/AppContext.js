import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
  // True until the AsyncStorage onboarding flag read completes.
  // AppNavigator must not select the unauthenticated route until this resolves.
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'citizen' or 'officer'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [reports, setReports] = useState([]);
  // NOTE: userPoints and user are legacy convenience state — source of truth
  // is AuthContext profile.points_balance and profile fields.
  const [userPoints, setUserPoints] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Read persisted onboarding flag from AsyncStorage on mount.
    // This ensures onboarding only appears on the very first app launch.
    const loadOnboardingState = async () => {
      try {
        const value = await AsyncStorage.getItem('@traffic_eye_has_seen_onboarding');
        if (value === 'true') {
          setHasSeenOnboardingState(true);
        }
      } catch (e) {
        // AsyncStorage read failure — default to showing onboarding (safe fallback)
      } finally {
        // Always resolve the loading gate so route selection is not blocked indefinitely
        setOnboardingLoading(false);
      }
    };
    loadOnboardingState();
  }, []);

  const setHasSeenOnboarding = async (value) => {
    setHasSeenOnboardingState(value);
    try {
      await AsyncStorage.setItem('@traffic_eye_has_seen_onboarding', value ? 'true' : 'false');
    } catch (e) {
      // AsyncStorage write failure — non-fatal
    }
  };

  const value = {
    hasSeenOnboarding,
    setHasSeenOnboarding,
    onboardingLoading,
    userRole,
    setUserRole,
    isAuthenticated,
    setIsAuthenticated,
    currentReport,
    setCurrentReport,
    reports,
    setReports,
    userPoints,
    setUserPoints,
    user,
    setUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
