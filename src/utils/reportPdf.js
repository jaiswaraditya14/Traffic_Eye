import { escapeHtml } from './productExperience';
export function reportSummary(reports) {
    return { total: reports.length, approved: reports.filter(r => r.status === 'approved').length,
        rejected: reports.filter(r => r.status === 'rejected').length, pending: reports.filter(r => r.status === 'pending').length };
}
export function buildReportPdfHtml(reports, fromDate, toDate) {
    const summary = reportSummary(reports);
    const text = value => escapeHtml(value ?? '—');
    const rows = reports.length === 0
        ? '<tr><td colspan="6">No reports found for the selected date range.</td></tr>'
        : reports.map(report => '<tr>' + [report.violation_type, report.vehicle_number, report.location_address, report.severity, report.status,
        report.submitted_at ? new Date(report.submitted_at).toLocaleString('en-IN') : 'Pending'].map(value => '<td>' + text(value) + '</td>').join('') + '</tr>').join('');
    return '<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:32px}body{font:12px sans-serif;color:#0A1E3F}h1{font-size:24px}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{padding:8px;border:1px solid #CBD5E1;overflow-wrap:anywhere;vertical-align:top}th{background:#FEF3C7}thead{display:table-header-group}tr{page-break-inside:avoid}</style></head><body><h1>Traffic Eye — Report Summary</h1><p>' + text(fromDate.toLocaleDateString('en-IN')) + ' – ' + text(toDate.toLocaleDateString('en-IN')) + '</p><p>Total: ' + summary.total + ' · Approved: ' + summary.approved + ' · Rejected: ' + summary.rejected + ' · Pending: ' + summary.pending + '</p><table><thead><tr><th>Violation</th><th>Plate</th><th>Location</th><th>Severity</th><th>Status</th><th>Submitted</th></tr></thead><tbody>' + rows + '</tbody></table><p>Contains report evidence metadata. Share only with authorized recipients.</p></body></html>';
}
