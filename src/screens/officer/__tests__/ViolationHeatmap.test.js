/* eslint-env jest */
import { filterHeatmapReports } from '../../../utils/productExperience';
const now = new Date('2026-09-13T12:00:00');
const coordinates = { latitude: 19.076, longitude: 72.8777 };
const points = [
    { id: 1, severity: 'high', status: 'approved', violation_type: 'No Helmet', location_address: 'Vakola Bridge, 400055', submitted_at: '2026-09-13T01:00:00', ...coordinates },
    { id: 2, severity: 'low', status: 'pending', violation_type: 'Wrong Parking', location_address: 'Chembur Naka, 400071', submitted_at: '2026-09-08T12:00:00', ...coordinates },
    { id: 3, severity: 'critical', status: 'rejected', violation_type: 'Signal Jump', location_address: 'Bandra Linking Road', submitted_at: '2026-08-20T12:00:00', ...coordinates },
    { id: 4, severity: 'medium', status: 'approved', violation_type: 'No Helmet', location_address: 'Vakola Pipeline', submitted_at: null, ...coordinates },
];

test('severity multi-select', () => expect(filterHeatmapReports(points, ['high', 'low'], 'all', now).map(p => p.id)).toEqual([1, 2]));
test.each([['today', [1]], ['week', [1, 2]], ['month', [1, 2, 3]], ['all', [1, 2, 3, 4]]])('%s uses actual submission dates', (range, ids) => expect(filterHeatmapReports(points, ['high', 'low', 'critical', 'medium'], range, now).map(p => p.id)).toEqual(ids));
test('no selected severities is empty', () => expect(filterHeatmapReports(points, [], 'all', now)).toEqual([]));
test('severity and week filters combine', () => expect(filterHeatmapReports(points, ['low'], 'week', now).map(p => p.id)).toEqual([2]));
test('invalid/future dates excluded from bounded ranges', () => expect(filterHeatmapReports([{ severity: 'high', submitted_at: 'invalid', ...coordinates }, { severity: 'high', submitted_at: '2027-01-01', ...coordinates }], ['high'], 'week', now)).toEqual([]));
test.each([
    { latitude: null, longitude: 72 }, { latitude: 91, longitude: 72 }, { latitude: 19, longitude: -181 },
    { latitude: '12junk', longitude: 72 }, { latitude: 'invalid', longitude: 72 },
])('invalid coordinates are excluded: %j', invalid => {
    expect(filterHeatmapReports([{ severity: 'high', submitted_at: '2026-09-13T01:00:00', ...invalid }], ['high'], 'all', now)).toEqual([]);
});
test('valid zero coordinates remain visible on the officer map', () => {
    const zero = { id: 'zero', severity: 'high', latitude: 0, longitude: 0 };
    expect(filterHeatmapReports([zero], ['high'], 'all', now)).toEqual([zero]);
});

// New tests for multi-dimensional filter system
test('status filtering: verified/approved vs pending vs rejected', () => {
    expect(filterHeatmapReports(points, { statuses: ['approved'], range: 'all' }).map(p => p.id)).toEqual([1, 4]);
    expect(filterHeatmapReports(points, { statuses: ['pending'], range: 'all' }).map(p => p.id)).toEqual([2]);
    expect(filterHeatmapReports(points, { statuses: ['rejected'], range: 'all' }).map(p => p.id)).toEqual([3]);
});

test('violation type filtering', () => {
    expect(filterHeatmapReports(points, { violationTypes: ['No Helmet'], range: 'all' }).map(p => p.id)).toEqual([1, 4]);
    expect(filterHeatmapReports(points, { violationTypes: ['Wrong Parking'], range: 'all' }).map(p => p.id)).toEqual([2]);
});

test('area / pincode text filtering', () => {
    expect(filterHeatmapReports(points, { area: 'Vakola', range: 'all' }).map(p => p.id)).toEqual([1, 4]);
    expect(filterHeatmapReports(points, { area: '400071', range: 'all' }).map(p => p.id)).toEqual([2]);
});

test('combined filters: multi-select within category (OR), across categories (AND)', () => {
    // (Approved OR Pending) AND (No Helmet) AND (Vakola)
    const result = filterHeatmapReports(points, {
        statuses: ['approved', 'pending'],
        violationTypes: ['No Helmet'],
        area: 'Vakola',
        range: 'all',
    });
    expect(result.map(p => p.id)).toEqual([1, 4]);
});
