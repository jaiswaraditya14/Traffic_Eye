export const SEVERITY_PRIORITY = { critical: 4, high: 3, medium: 2, low: 1 };
export const validTime = value => value == null ? null : (Number.isFinite(Date.parse(value)) ? Date.parse(value) : null);
export const sortOfficerQueue = reports => [...reports].sort((a, b) =>
    (SEVERITY_PRIORITY[String(b.severity).toLowerCase()] || 0) - (SEVERITY_PRIORITY[String(a.severity).toLowerCase()] || 0)
    || (validTime(a.submitted_at) ?? Infinity) - (validTime(b.submitted_at) ?? Infinity)
    || String(a.id).localeCompare(String(b.id)));

export function filterHeatmapReports(reports, severities, range, now = new Date()) {
    const cutoff = new Date(now);
    if (range === 'today') cutoff.setHours(0, 0, 0, 0);
    else if (range === 'week') cutoff.setDate(cutoff.getDate() - 7);
    else if (range === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
    return reports.filter(report => {
        const at = validTime(report.submitted_at);
        return hasValidReportCoordinates(report)
            && severities.includes(String(report.severity).toLowerCase())
            && (range === 'all' || (at != null && at >= cutoff.getTime() && at <= now.getTime()));
    });
}
export function hasValidReportCoordinates(report) {
    const latitude = typeof report?.latitude === 'number' ? report.latitude : parseFloat(report?.latitude);
    const longitude = typeof report?.longitude === 'number' ? report.longitude : parseFloat(report?.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
        && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
        && !(latitude === 0 && longitude === 0);
}
export function officerJurisdictionFilters(profile) {
    if (!profile || profile.role !== 'officer') return [];
    const filters = [];
    const badgeDigits = typeof profile.badge_id === 'string' ? profile.badge_id.match(/\d+$/)?.[0] : null;
    if (badgeDigits) filters.push(`location_address.ilike.%400${badgeDigits.padStart(3, '0')}%`);
    const jurisdiction = typeof profile.jurisdiction === 'string'
        ? profile.jurisdiction.replace(/[^A-Za-z0-9 -]/g, '').trim()
        : '';
    if (jurisdiction) filters.push(`location_address.ilike.%${jurisdiction}%`);
    return [...new Set(filters)];
}
export function validateNewReport({ image, location, address }) {
    const errors = {};
    if (!image) errors.image = 'Capture a photo or choose one from your gallery.';
    if (!Number.isFinite(location?.latitude) || Math.abs(location.latitude) > 90 ||
        !Number.isFinite(location?.longitude) || Math.abs(location.longitude) > 180) errors.location = 'Choose a valid incident location.';
    if (typeof address !== 'string' || !address.trim()) errors.address = 'Enter the incident address.';
    return errors;
}
export const sourceLabel = source => /EXIF/.test(source || '') ? '📍 EXIF' : /LIVE|DEVICE/.test(source || '') ? '📱 Device GPS' : '✏️ Manual';
export const confidencePercent = (value, unit = 'percent') => Math.max(0, Math.min(100, (Number(value) || 0) * (unit === 'fraction' ? 100 : 1)));
export function aiStageIndex(label) {
    if (/ready|preparing report/i.test(label)) return 4;
    if (/audit|validating|cross-check/i.test(label)) return 3;
    if (/ocr|reading vehicle|reading plate/i.test(label)) return 2;
    if (/vision|analyzing|detecting|reconnecting/i.test(label)) return 1;
    return 0;
}
export function rewardAvailability(reward, balance, redeemed = false) {
    if (redeemed) return { disabled: true, label: 'Redeemed ✓' };
    if (reward.is_active === false || reward.available === false || reward.stock === 0) return { disabled: true, label: 'Coming soon' };
    const cost = Number(reward.pts ?? reward.points_required ?? reward.cost);
    if (!Number.isFinite(cost) || cost <= 0) return { disabled: true, label: 'Coming soon' };
    const missing = Math.max(0, cost - (Number(balance) || 0));
    return { disabled: missing > 0, label: missing ? 'Need ' + missing + ' more points' : 'Redeem' };
}
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
