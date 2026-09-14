/* eslint-env jest */
import { officerJurisdictionFilters, sortOfficerQueue } from '../../../utils/productExperience';
test('severity priority, then oldest first; does not mutate input', () => {
    const input = [{ id: 'low', severity: 'low' }, { id: 'new', severity: 'high', submitted_at: '2026-09-12' }, { id: 'critical', severity: 'critical' }, { id: 'medium', severity: 'medium' }, { id: 'old', severity: 'high', submitted_at: '2026-09-01' }];
    expect(sortOfficerQueue(input).map(r => r.id)).toEqual(['critical', 'old', 'new', 'medium', 'low']); expect(input[0].id).toBe('low');
});
test('missing dates sort last, severities are case insensitive', () => expect(sortOfficerQueue([{ id: 'unknown', severity: 'HIGH' }, { id: 'dated', severity: 'high', submitted_at: '2026-09-01' }])[0].id).toBe('dated'));
test('top five selected after sorting complete queue', () => {
    const input = Array.from({ length: 8 }, (_, i) => ({ id: String(i), severity: i === 7 ? 'critical' : 'low' }));
    expect(sortOfficerQueue(input).slice(0, 5)).toHaveLength(5); expect(sortOfficerQueue(input)[0].id).toBe('7');
});
test('jurisdiction filters include badge pincode and sanitized station name', () => {
    expect(officerJurisdictionFilters({ role: 'officer', badge_id: 'MH-7', jurisdiction: 'North,Zone%' })).toEqual([
        'location_address.ilike.%400007%', 'location_address.ilike.%NorthZone%',
    ]);
});
test('citizens and unassigned officers do not fabricate jurisdiction filters', () => {
    expect(officerJurisdictionFilters({ role: 'citizen', badge_id: '7', jurisdiction: 'North' })).toEqual([]);
    expect(officerJurisdictionFilters({ role: 'officer' })).toEqual([]);
});
