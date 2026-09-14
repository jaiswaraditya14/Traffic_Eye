import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { readDemoMode, persistDemoMode } from '../services/demoMode';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const mounted = useRef(true);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
  // True until the AsyncStorage onboarding flag read completes.
  // AppNavigator must not select the unauthenticated route until this resolves.
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [demoMode, setDemoModeState] = useState(false);
  const [demoLoading, setDemoLoading] = useState(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    readDemoMode().then(enabled => { if (active) setDemoModeState(enabled); }).catch(() => {}).finally(() => { if (active) setDemoLoading(false); });
    return () => { active = false; };
  }, []);
  const setDemoMode = async enabled => {
    await persistDemoMode(enabled);
    if (!mounted.current) return;
    setDemoModeState(enabled);
    setCurrentReport(null);
  };
  const [userRole, setUserRole] = useState(null); // 'citizen' or 'officer'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [reports, setReports] = useState([]);
  // NOTE: userPoints and user are legacy convenience state — source of truth
  // is AuthContext profile.points_balance and profile fields.
  const [userPoints, setUserPoints] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    // Read persisted onboarding flag from AsyncStorage on mount.
    // This ensures onboarding only appears on the very first app launch.
    const loadOnboardingState = async () => {
      try {
        const value = await AsyncStorage.getItem('@traffic_eye_has_seen_onboarding');
        if (active && value === 'true') {
          setHasSeenOnboardingState(true);
        }
      } catch (e) {
        // AsyncStorage read failure — default to showing onboarding (safe fallback)
      } finally {
        // Always resolve the loading gate so route selection is not blocked indefinitely
        if (active) setOnboardingLoading(false);
      }
    };
    loadOnboardingState();
    return () => { active = false; };
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
    demoMode, demoLoading, setDemoMode,
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
