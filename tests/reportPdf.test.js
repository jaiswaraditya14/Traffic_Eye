/* eslint-env jest */
import { buildReportPdfHtml, reportSummary } from '../src/utils/reportPdf';
test('escapes all user-controlled columns', () => {
    const malicious = '<script>alert("x" & \'y\')</script>';
    const html = buildReportPdfHtml([{ violation_type: malicious, vehicle_number: malicious, location_address: malicious, severity: malicious, status: malicious }], new Date(2026, 8, 1), new Date(2026, 8, 13));
    expect(html).not.toContain('<script>'); expect(html.match(/&lt;script&gt;/g)).toHaveLength(5); expect(html).toContain('&amp;'); expect(html).toContain('&quot;'); expect(html).toContain('&#39;');
});
test('summary actual statuses', () => expect(reportSummary([{ status: 'pending' }, { status: 'approved' }, { status: 'rejected' }])).toEqual({ total: 3, approved: 1, rejected: 1, pending: 1 }));
test('escapes Tom & Jerry and renders an explicit empty-state row', () => {
    expect(buildReportPdfHtml([{ violation_type: 'Tom & Jerry', vehicle_number: 'X' }], new Date(2026, 8, 1), new Date(2026, 8, 2))).toContain('Tom &amp; Jerry');
    const empty = buildReportPdfHtml([], new Date(2026, 8, 1), new Date(2026, 8, 2));
    expect(empty).toContain('No reports found for the selected date range.');
    expect(empty).toContain('colspan="6"');
});
test('50-row export remains a complete, escaped table', () => {
    const reports = Array.from({ length: 50 }, (_, index) => ({ violation_type: `Row ${index} & safe`, vehicle_number: `MH${index}`, location_address: 'Mumbai', severity: 'high', status: 'approved' }));
    const html = buildReportPdfHtml(reports, new Date(2026, 8, 1), new Date(2026, 8, 30));
    expect((html.match(/<tr>/g) || [])).toHaveLength(51);
    expect((html.match(/Row \d+ &amp; safe/g) || [])).toHaveLength(50);
    expect(html.endsWith('</body></html>')).toBe(true);
});
