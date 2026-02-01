import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'citizen' or 'officer'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [userPoints, setUserPoints] = useState(120);
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    avatar: null,
  });

  const value = {
    showSplash,
    setShowSplash,
    hasSeenOnboarding,
    setHasSeenOnboarding,
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
