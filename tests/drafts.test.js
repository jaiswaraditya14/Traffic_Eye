/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { saveDraft, getDrafts, removeDraft, clearAllDrafts, getDraftCount } from '../src/services/drafts';

describe('Offline Drafts Service', () => {
    beforeEach(async () => {
        await clearAllDrafts();
    });

    test('saves a draft and returns stored entry with UUID', async () => {
        const draft = {
            image_uri: 'file:///path/to/img.jpg',
            violation_type: 'Speeding',
            vehicle_number: 'MH12AB1234',
        };
        const saved = await saveDraft(draft);
        expect(saved.id).toBeDefined();
        expect(saved.violation_type).toBe('Speeding');

        const all = await getDrafts();
        expect(all).toHaveLength(1);
        expect(all[0].id).toBe(saved.id);
    });

    test('removes a draft by ID', async () => {
        const d1 = await saveDraft({ violation_type: 'Red Light' });
        const d2 = await saveDraft({ violation_type: 'No Helmet' });
        expect(await getDraftCount()).toBe(2);

        await removeDraft(d1.id);
        const remaining = await getDrafts();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe(d2.id);
    });

    test('clears all drafts', async () => {
        await saveDraft({ violation_type: 'Parking' });
        await saveDraft({ violation_type: 'Wrong Way' });
        expect(await getDraftCount()).toBe(2);

        await clearAllDrafts();
        expect(await getDraftCount()).toBe(0);
    });
});
