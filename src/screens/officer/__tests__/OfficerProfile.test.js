/* eslint-env jest */

describe('OfficerProfile review stats logic', () => {
    function computeOfficerStats(reviews, officerId, now = new Date('2026-11-20T12:00:00Z')) {
        let verified = 0;
        let rejected = 0;
        let thisMonth = 0;

        // Strictly filter to this officer's activity only
        const officerReviews = (reviews || []).filter(r => r.officer_id === officerId);

        for (const r of officerReviews) {
            const dec = (r.decision || '').toLowerCase();
            if (dec === 'approved' || dec === 'verified') verified++;
            else if (dec === 'rejected') rejected++;

            const rawDate = r.review_timestamp || r.created_at;
            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                        thisMonth++;
                    }
                }
            }
        }

        return { verified, rejected, thisMonth };
    }

    test('counts only reviews authored by the specific officer, ignoring overall reviews', () => {
        const officerA = 'officer-uuid-aaa';
        const officerB = 'officer-uuid-bbb';

        const mixedReviews = [
            { id: 1, officer_id: officerA, decision: 'approved', review_timestamp: '2026-11-10T10:00:00Z' },
            { id: 2, officer_id: officerA, decision: 'rejected', review_timestamp: '2026-11-12T10:00:00Z' },
            { id: 3, officer_id: officerB, decision: 'approved', review_timestamp: '2026-11-14T10:00:00Z' },
            { id: 4, officer_id: officerB, decision: 'approved', review_timestamp: '2026-11-15T10:00:00Z' },
            { id: 5, officer_id: officerB, decision: 'rejected', review_timestamp: '2026-11-16T10:00:00Z' },
        ];

        const statsA = computeOfficerStats(mixedReviews, officerA);
        expect(statsA).toEqual({
            verified: 1,
            rejected: 1,
            thisMonth: 2,
        });

        const statsB = computeOfficerStats(mixedReviews, officerB);
        expect(statsB).toEqual({
            verified: 2,
            rejected: 1,
            thisMonth: 3,
        });
    });

    test('accurately isolates "This Month" count from prior months', () => {
        const officerId = 'officer-uuid-test';
        const reviews = [
            { id: 1, officer_id: officerId, decision: 'approved', review_timestamp: '2026-11-05T10:00:00Z' },
            { id: 2, officer_id: officerId, decision: 'approved', review_timestamp: '2026-11-19T10:00:00Z' },
            { id: 3, officer_id: officerId, decision: 'rejected', review_timestamp: '2026-10-15T12:00:00Z' }, // previous month
            { id: 4, officer_id: officerId, decision: 'approved', review_timestamp: '2025-11-15T10:00:00Z' }, // previous year
        ];

        const stats = computeOfficerStats(reviews, officerId, new Date('2026-11-20T12:00:00Z'));
        expect(stats).toEqual({
            verified: 3,
            rejected: 1,
            thisMonth: 2, // Only the two November 2026 reviews
        });
    });

    test('handles null dates, empty reviews, or unknown officers gracefully', () => {
        expect(computeOfficerStats([], 'officer-1')).toEqual({ verified: 0, rejected: 0, thisMonth: 0 });
        expect(computeOfficerStats(null, 'officer-1')).toEqual({ verified: 0, rejected: 0, thisMonth: 0 });

        const malformed = [
            { id: 1, officer_id: 'officer-1', decision: 'approved', review_timestamp: null, created_at: null },
            { id: 2, officer_id: 'officer-1', decision: 'unknown_status', review_timestamp: '2026-11-10T10:00:00Z' },
        ];
        expect(computeOfficerStats(malformed, 'officer-1')).toEqual({ verified: 1, rejected: 0, thisMonth: 1 });
    });
});
