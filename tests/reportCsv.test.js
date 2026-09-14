/* eslint-env jest */
import { buildReportCsv, csvCell } from '../src/utils/reportCsv';

test('CSV escapes quotes, commas, and line breaks', () => {
    const csv = buildReportCsv([{ date: '01/09/2026', violation: 'Helmet, "missing"', vehiclePlateNumber: 'MH12', address: 'Line 1\nLine 2' }]);
    expect(csv).toContain('"Helmet, ""missing"""');
    expect(csv).toContain('"Line 1\nLine 2"');
    expect(csv.startsWith('\uFEFF')).toBe(true);
});

test.each(['=HYPERLINK("https://bad.invalid")', '+1+1', '-2+3', '@SUM(A1:A2)', '  =CMD()'])(
    'CSV neutralizes spreadsheet formulas: %s', value => expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`),
);

test('50-row CSV has one header and one line per report', () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({ date: String(index), violation: 'Safe', vehiclePlateNumber: 'MH12', address: 'Mumbai' }));
    expect(buildReportCsv(rows).split('\r\n').filter(Boolean)).toHaveLength(51);
});
