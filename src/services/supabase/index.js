import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_CONFIG } from '../../config';

// Better storage handling for both Web and Mobile
const customStorage = {
    getItem: (key) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                const value = window.localStorage.getItem(key);
                return Promise.resolve(value);
            }
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key, value) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
                return Promise.resolve();
            }
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
                return Promise.resolve();
            }
        }
        return AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
