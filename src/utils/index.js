// Utils barrel export
export {
    COLORS,
    SPACING,
    FONT_SIZES,
    LINE_HEIGHTS,
    FONT_WEIGHTS,
    BORDER_RADIUS,
    SHADOWS,
    GRADIENTS,
    globalStyles,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
} from './theme';
export {
    ROLES,
    REPORT_STATUS,
    PRIORITY,
    NOTIFICATION_TYPES,
    VIOLATION_TYPES,
} from './constants';
export {
    isValidEmail,
    isValidPassword,
    isValidPhone,
    isValidBadgeId,
    validateRequiredFields,
    passwordsMatch,
} from './validation';
export {
    formatDate,
    formatRelativeTime,
    formatNumber,
    formatPoints,
    truncateText,
} from './formatters';
export {
    parseExifGPS,
    parseCoordinateComponent,
    applyRef,
    validateCoordinates,
    hasValidGpsValues,
    extractImageLocation,
    parseJpegBinaryExif,
    logExifDiagnostics,
} from './exifParser';
export { computeFileSha256 } from './fileHash';
// imageHash.js removed — duplicate detection now uses plate-OCR + Supabase DB matching
