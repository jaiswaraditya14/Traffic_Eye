const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

export function csvCell(value) {
    let text = String(value ?? '');
    if (FORMULA_PREFIX.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

export function buildReportCsv(rows) {
    const header = ['Date', 'Violation', 'Vehicle Plate Number', 'Address'];
    const body = rows.map(row => [row.date, row.violation, row.vehiclePlateNumber, row.address]);
    return '\uFEFF' + [header, ...body].map(columns => columns.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
