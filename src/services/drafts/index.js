import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

const DRAFTS_KEY = 'traffic_eye_draft_reports';

export async function saveDraft(draft) {
    const drafts = await getDrafts();
    const generatedId = (typeof randomUUID === 'function' ? randomUUID() : null) || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const entry = {
        id: draft.id || generatedId,
        image_uri: draft.image_uri || draft.imageUri || null,
        location: draft.location || null,
        address: draft.address || draft.location_address || null,
        violation_type: draft.violation_type || draft.violationType || null,
        violation_description: draft.violation_description || draft.description || null,
        severity: draft.severity || 'medium',
        vehicle_number: draft.vehicle_number || draft.vehicleNumber || null,
        ai_results: draft.ai_results || draft.aiResults || null,
        created_at: draft.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    const existingIndex = drafts.findIndex(d => d.id === entry.id);
    if (existingIndex >= 0) {
        drafts[existingIndex] = entry;
    } else {
        drafts.unshift(entry);
    }
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    return entry;
}

export async function getDrafts() {
    try {
        const raw = await AsyncStorage.getItem(DRAFTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function removeDraft(draftId) {
    const drafts = await getDrafts();
    const filtered = drafts.filter(d => d.id !== draftId);
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(filtered));
    return filtered;
}

export async function clearAllDrafts() {
    await AsyncStorage.removeItem(DRAFTS_KEY);
}

export async function getDraftCount() {
    const drafts = await getDrafts();
    return drafts.length;
}
