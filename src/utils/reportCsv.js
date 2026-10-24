const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

export function csvCell(value) {
    let text = String(value ?? '');
    if (FORMULA_PREFIX.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

export function buildReportCsv(rows) {
    const hasStatus = rows.length > 0 && rows.some(r => r.status !== undefined);
    const header = hasStatus
        ? ['Date', 'Violation', 'Vehicle Plate Number', 'Address', 'Status']
        : ['Date', 'Violation', 'Vehicle Plate Number', 'Address'];
    const body = rows.map(row => {
        const base = [row.date, row.violation, row.vehiclePlateNumber, row.address];
        if (hasStatus) base.push(row.status || 'N/A');
        return base;
    });
    return '\uFEFF' + [header, ...body].map(columns => columns.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
