import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { buildReportPdfHtml, reportSummary } from '../../utils/reportPdf';
import { buildReportCsv } from '../../utils/reportCsv';
import { COLORS } from '../../utils/theme';
import * as Sharing from 'expo-sharing';

import { useAuth } from '../../context';
import { fetchReportsByDateRange } from '../../services/reports';
import { FocusAwareStatusBar, FeedbackToast, EmptyState, PressableScale, CardSkeleton } from '../../components';

const C = {
    navy: COLORS.primaryDark,
    navyMid: '#16325C',
    navyLight: '#234B80',
    amber: COLORS.secondary,
    amberLight: COLORS.secondarySurface,
    amberDark: '#92400E',
    white: COLORS.surface,
    offWhite: COLORS.surfaceContainerLow,
    surface: COLORS.surface,
    textPrimary: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    textTertiary: COLORS.gray400,
    border: COLORS.surfaceContainerHigh,
    borderLight: COLORS.surfaceContainer,
    success: '#059669',
    successSurface: '#D1FAE5',
    error: COLORS.errorLight,
    errorSurface: COLORS.errorSurface,
};

export default function OfficerReportExport({ navigation }) {
    const { profile } = useAuth();
    const mounted = useRef(true);
    const sequence = useRef(0);
    const exportBusy = useRef(false);
    const [toast, setToast] = useState(null);
    const [pdfUri, setPdfUri] = useState(null);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current++; }; }, []);

    // Default Date Range: 1st of current month to Today
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [toDate, setToDate] = useState(() => new Date());

    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'rejected'

    // Pickers
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    // Data State
    const [reports, setReports] = useState([]);
    const [loadingCount, setLoadingCount] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Helpers to format dates as YYYY-MM-DD
    const formatDateYMD = (d) => {
        if (!d) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateReadable = (d) => {
        if (!d) return '';
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const isDateRangeInvalid = fromDate > toDate;

    // Fetch matching reports whenever dates or status filter change
    const loadReportCount = useCallback(async () => {
        const request = ++sequence.current;
        setPdfUri(null);
        if (!profile?.id || isDateRangeInvalid) {
            if (mounted.current && request === sequence.current) setLoadingCount(false);
            setReports([]);
            return;
        }

        setLoadingCount(true);
        try {
            const { data, error } = await fetchReportsByDateRange(
                fromDate,
                toDate,
                statusFilter,
                profile
            );
            if (request !== sequence.current || !mounted.current) return;
            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            if (request === sequence.current && mounted.current) { setToast('Unable to fetch reports. Pull down to retry.'); setReports([]); }
        } finally {
            setLoadingCount(false);
        }
    }, [fromDate, toDate, statusFilter, profile, isDateRangeInvalid]);

    useEffect(() => {
        loadReportCount();
    }, [loadReportCount]);

    // Quick Date Presets
    const applyPreset = (presetKey) => {
        const today = new Date();
        let newFrom = new Date();
        let newTo = new Date();

        if (presetKey === 'today') {
            newFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            newTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        } else if (presetKey === 'last7') {
            newFrom = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            newTo = today;
        } else if (presetKey === 'last30') {
            newFrom = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
            newTo = today;
        } else if (presetKey === 'thisMonth') {
            newFrom = new Date(today.getFullYear(), today.getMonth(), 1);
            newTo = today;
        }

        setFromDate(newFrom);
        setToDate(newTo);
    };

    // Date Picker Handlers
    const onFromDateChange = (event, selectedDate) => {
        setShowFromPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setFromDate(selectedDate);
        }
    };

    const onToDateChange = (event, selectedDate) => {
        setShowToPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setToDate(selectedDate);
        }
    };

    // Format single report timestamp for spreadsheet export
    const formatTimestampForSpreadsheet = (dateString) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        const pad = (n) => String(n).padStart(2, '0');
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = pad(d.getMinutes());
        const seconds = pad(d.getSeconds());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${day}/${month}/${year} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
    };

    // Format violation string preserving all violations
    const formatViolationForSpreadsheet = (report) => {
        // If raw array of violations exists, join them
        if (Array.isArray(report.ai_raw_result?.allViolations) && report.ai_raw_result.allViolations.length > 0) {
            return report.ai_raw_result.allViolations.join(', ');
        }
        if (Array.isArray(report.ai_raw_result?.violations) && report.ai_raw_result.violations.length > 0) {
            return report.ai_raw_result.violations.map(v => typeof v === 'string' ? v : v.type).filter(Boolean).join(', ');
        }
        return report.violation_type || 'Unspecified Violation';
    };

    // Export a standards-compatible CSV without a vulnerable workbook parser.
    const handleExportSpreadsheet = async () => {
        if (isDateRangeInvalid) {
            Alert.alert('Invalid Range', 'From Date cannot be later than To Date.');
            return;
        }

        if (!reports || reports.length === 0) {
            Alert.alert(
                'No Reports Found',
                `There are no reports recorded between ${formatDateYMD(fromDate)} and ${formatDateYMD(toDate)}.\n\nNo file was generated.`
            );
            return;
        }

        if (exportBusy.current) return;
        exportBusy.current = true;
        setExporting(true);
        try {
            const spreadsheetRows = reports.map((r) => ({
                date: formatTimestampForSpreadsheet(r.submitted_at),
                violation: formatViolationForSpreadsheet(r),
                vehiclePlateNumber: r.vehicle_number || 'N/A',
                address: r.location_address || 'N/A',
            }));
            const csv = buildReportCsv(spreadsheetRows);
            const fromStr = formatDateYMD(fromDate);
            const toStr = formatDateYMD(toDate);
            const fileName = `Traffic_Reports_${fromStr}_to_${toStr}.csv`;
            const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, csv, {
                encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
            });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: `Export Traffic Reports (${fromStr} to ${toStr})`,
                    UTI: 'public.comma-separated-values-text',
                });
            } else {
                Alert.alert('Export Complete', `File saved to device:\n${fileName}`);
            }
        } catch (error) {
            if (mounted.current) setToast('Could not generate the spreadsheet. Please retry.');
        } finally {
            exportBusy.current = false;
            if (mounted.current) setExporting(false);
        }
    };

    const generatePdf = async () => {
        if (exportBusy.current || loadingCount || isDateRangeInvalid || !reports.length) return;
        exportBusy.current = true; setExporting(true);
        try {
            const file = await Print.printToFileAsync({ html: buildReportPdfHtml(reports, fromDate, toDate) });
            if (mounted.current) setPdfUri(file.uri);
        } catch { if (mounted.current) setToast('PDF generation failed. Please try again.'); }
        finally { exportBusy.current = false; if (mounted.current) setExporting(false); }
    };
    const usePdf = async (share) => {
        if (!pdfUri || exportBusy.current) return;
        exportBusy.current = true;
        try {
            if (share) {
                if (!await Sharing.isAvailableAsync()) throw new Error('Sharing unavailable');
                if (mounted.current) await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share Traffic Eye reports' });
            } else await Print.printAsync({ uri: pdfUri });
        } catch { if (mounted.current) setToast('Could not open the PDF. Please retry on a supported device.'); }
        finally { exportBusy.current = false; }
    };
    const summary = reportSummary(reports);
    return (
        <View style={styles.container}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                
                {/* ── Official Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Officer Report Export</Text>
                            <Text style={styles.headerSubtitle}>Report records · PDF and CSV</Text>
                        </View>
                        <View style={styles.headerRightBadge}>
                            <Ionicons name="document-text" size={16} color={C.amber} />
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={loadingCount} onRefresh={loadReportCount} colors={[COLORS.secondary]} />}
                >
                    {/* ── Date Range Selection Card ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar" size={18} color={C.navy} />
                            <Text style={styles.cardTitle}>Select Date Range</Text>
                        </View>
                        <Text style={styles.cardDescription}>
                            Select the starting and ending dates to filter enforcement reports recorded within that period.
                        </Text>

                        {/* Quick Presets */}
                        <View style={styles.presetRow}>
                            {[
                                { key: 'today', label: 'Today' },
                                { key: 'last7', label: 'Last 7 Days' },
                                { key: 'last30', label: 'Last 30 Days' },
                                { key: 'thisMonth', label: 'This Month' },
                            ].map((p) => (
                                <TouchableOpacity
                                    key={p.key}
                                    style={styles.presetChip}
                                    onPress={() => applyPreset(p.key)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.presetText}>{p.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* From & To Selectors */}
                        <View style={styles.datesGrid}>
                            {/* From Date Box */}
                            <TouchableOpacity
                                style={[styles.dateBox, isDateRangeInvalid && styles.dateBoxError]}
                                onPress={() => setShowFromPicker(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.dateBoxLabel}>FROM DATE</Text>
                                <View style={styles.dateValueRow}>
                                    <Ionicons name="calendar-outline" size={16} color={C.navy} />
                                    <Text style={styles.dateValueText}>{formatDateReadable(fromDate)}</Text>
                                </View>
                                <Text style={styles.dateSubText}>{formatDateYMD(fromDate)}</Text>
                            </TouchableOpacity>

                            <View style={styles.dateArrowBox}>
                                <Ionicons name="arrow-forward" size={18} color={C.textTertiary} />
                            </View>

                            {/* To Date Box */}
                            <TouchableOpacity
                                style={[styles.dateBox, isDateRangeInvalid && styles.dateBoxError]}
                                onPress={() => setShowToPicker(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.dateBoxLabel}>TO DATE</Text>
                                <View style={styles.dateValueRow}>
                                    <Ionicons name="calendar-outline" size={16} color={C.navy} />
                                    <Text style={styles.dateValueText}>{formatDateReadable(toDate)}</Text>
                                </View>
                                <Text style={styles.dateSubText}>{formatDateYMD(toDate)}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Validation Error Banner */}
                        {isDateRangeInvalid && (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={18} color={C.error} />
                                <Text style={styles.errorBannerText}>
                                    Invalid date range: &quot;From Date&quot; cannot be after &quot;To Date&quot;.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* ── Status Filter Selector ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="funnel" size={18} color={C.navy} />
                            <Text style={styles.cardTitle}>Report Status Filter</Text>
                        </View>
                        <View style={styles.statusChipsRow}>
                            {[
                                { key: 'all', label: 'All Reports' },
                                { key: 'approved', label: 'Verified Only' },
                                { key: 'pending', label: 'Pending Only' },
                                { key: 'rejected', label: 'Rejected Only' },
                            ].map((s) => {
                                const active = statusFilter === s.key;
                                return (
                                    <TouchableOpacity
                                        key={s.key}
                                        style={[styles.statusChip, active && styles.statusChipActive]}
                                        onPress={() => setStatusFilter(s.key)}
                                        activeOpacity={0.8}
                                    >
                                        {active && <Ionicons name="checkmark" size={14} color={C.white} style={{ marginRight: 4 }} />}
                                        <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                                            {s.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>PDF Report Summary</Text>
                        {loadingCount ? <CardSkeleton /> : <Text style={{ color: COLORS.textSecondary, marginVertical: 12 }}>Total {summary.total} · Approved {summary.approved} · Rejected {summary.rejected} · Pending {summary.pending}</Text>}
                        {!loadingCount && !reports.length && <EmptyState icon="document-text-outline" title="No reports found in this date range" subtitle="Choose another range or pull down to refresh." />}
                        {reports.slice(0, 5).map(report => <View key={report.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.borderLight }}><Text style={{ color: COLORS.primary }}>{report.violation_type} · {report.vehicle_number || 'Plate unavailable'}</Text><Text style={{ color: COLORS.textSecondary }}>{report.location_address} · {report.severity} · {report.status} · {formatTimestampForSpreadsheet(report.submitted_at)}</Text></View>)}
                        <PressableScale accessibilityLabel="Generate PDF" disabled={exporting || loadingCount || !reports.length || isDateRangeInvalid} onPress={generatePdf} style={{ padding: 16, marginTop: 12, backgroundColor: COLORS.primary, borderRadius: 12 }}><Text style={{ color: COLORS.white }}>{exporting ? 'Generating…' : 'Generate PDF'}</Text></PressableScale>
                        {!!pdfUri && <View style={{ flexDirection: 'row', gap: 16 }}>
                            <PressableScale accessibilityLabel="Preview PDF" onPress={() => usePdf(false)} style={{ paddingVertical: 16 }}><Text>Preview PDF</Text></PressableScale>
                            <PressableScale accessibilityLabel="Share PDF" onPress={() => usePdf(true)} style={{ paddingVertical: 16 }}><Text>Share PDF</Text></PressableScale>
                        </View>}
                    </View>
                    {/* ── Export Summary & Preview Card ── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="stats-chart" size={18} color={C.navy} />
                            <Text style={styles.cardTitle}>Export Summary</Text>
                        </View>

                        {loadingCount ? (
                            <View style={styles.centerLoading}>
                                <ActivityIndicator size="small" color={C.navy} />
                                <Text style={styles.loadingText}>Counting matching reports...</Text>
                            </View>
                        ) : isDateRangeInvalid ? (
                            <Text style={styles.invalidRangePlaceholder}>Please correct the date range above.</Text>
                        ) : reports.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="folder-open-outline" size={28} color={C.amber} />
                                </View>
                                <Text style={styles.emptyTitle}>No Reports Found</Text>
                                <Text style={styles.emptySubtitle}>
                                    No reports found between {formatDateYMD(fromDate)} and {formatDateYMD(toDate)}.
                                </Text>
                            </View>
                        ) : (
                            <View>
                                <View style={styles.summaryBadgeRow}>
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countNumber}>{reports.length}</Text>
                                        <Text style={styles.countLabel}>Report{reports.length !== 1 ? 's' : ''} Ready</Text>
                                    </View>
                                    <View style={styles.fileFormatBox}>
                                        <Ionicons name="grid" size={16} color={C.success} />
                                        <Text style={styles.fileFormatText}>Spreadsheet (.csv)</Text>
                                    </View>
                                </View>

                                {/* Filename preview */}
                                <View style={styles.filenameBox}>
                                    <Ionicons name="document-text-outline" size={14} color={C.textSecondary} />
                                    <Text style={styles.filenameText} numberOfLines={1}>
                                        Traffic_Reports_{formatDateYMD(fromDate)}_to_{formatDateYMD(toDate)}.csv
                                    </Text>
                                </View>

                                {/* Columns specification badge */}
                                <View style={styles.columnsSpecBox}>
                                    <Text style={styles.columnsSpecTitle}>Export Columns (1 report per row):</Text>
                                    <View style={styles.columnsTagsRow}>
                                        {['1. Date', '2. Violation', '3. Vehicle Plate Number', '4. Address'].map((col, idx) => (
                                            <View key={idx} style={styles.colTag}>
                                                <Text style={styles.colTagText}>{col}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* ── Footer CTA Button ── */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.exportBtn,
                            (isDateRangeInvalid || reports.length === 0 || exporting) && styles.exportBtnDisabled,
                        ]}
                        onPress={handleExportSpreadsheet}
                        disabled={isDateRangeInvalid || reports.length === 0 || exporting}
                        activeOpacity={0.88}
                    >
                        <View style={styles.exportBtnInner}>
                            {exporting ? (
                                <>
                                    <ActivityIndicator size="small" color={C.white} />
                                    <Text style={styles.exportBtnText}>Generating Spreadsheet...</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="download-outline" size={20} color={C.white} />
                                    <Text style={styles.exportBtnText}>
                                        {reports.length > 0
                                            ? `Export ${reports.length} Report${reports.length !== 1 ? 's' : ''} to CSV`
                                            : 'No Reports to Export'}
                                    </Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Native Date Pickers */}
                {showFromPicker && (
                    <DateTimePicker
                        value={fromDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onFromDateChange}
                        maximumDate={new Date()}
                    />
                )}

                {showToPicker && (
                    <DateTimePicker
                        value={toDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onToDateChange}
                        maximumDate={new Date()}
                    />
                )}

            </SafeAreaView>
            <FeedbackToast visible={!!toast} message={toast || ''} variant="error" onDismiss={() => setToast(null)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: 'rgba(255, 255, 255, 0.75)',
        marginTop: 2,
    },
    headerRightBadge: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },

    // Cards
    card: {
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: C.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
    },
    cardDescription: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: C.textSecondary,
        lineHeight: 18,
        marginBottom: 14,
    },

    // Presets
    presetRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    presetChip: {
        backgroundColor: C.borderLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.border,
    },
    presetText: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },

    // Dates Grid
    datesGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateBox: {
        flex: 1,
        backgroundColor: COLORS.surfaceContainerLow,
        borderWidth: 1.5,
        borderColor: C.border,
        borderRadius: 14,
        padding: 12,
    },
    dateBoxError: {
        borderColor: C.error,
        backgroundColor: '#FEF2F2',
    },
    dateBoxLabel: {
        fontSize: 10,
        fontFamily: 'Nunito-Bold',
        color: C.textTertiary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    dateValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    dateValueText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
    },
    dateSubText: {
        fontSize: 11,
        fontFamily: 'Nunito-Medium',
        color: C.textTertiary,
    },
    dateArrowBox: {
        paddingHorizontal: 2,
    },

    // Error Banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: C.errorSurface,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 12,
        padding: 10,
        marginTop: 12,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.error,
    },

    // Status Chips
    statusChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: C.borderLight,
        borderWidth: 1,
        borderColor: C.border,
    },
    statusChipActive: {
        backgroundColor: C.navy,
        borderColor: C.navy,
    },
    statusChipText: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },
    statusChipTextActive: {
        color: C.white,
    },

    // Summary Card
    centerLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: C.textSecondary,
    },
    invalidRangePlaceholder: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: C.error,
        textAlign: 'center',
        paddingVertical: 14,
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    emptyIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: C.amberLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        fontFamily: 'Nunito-Medium',
        color: C.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 16,
    },

    summaryBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    countNumber: {
        fontSize: 26,
        fontFamily: 'Nunito-ExtraBold',
        color: C.navy,
    },
    countLabel: {
        fontSize: 13,
        fontFamily: 'Nunito-SemiBold',
        color: C.textSecondary,
    },
    fileFormatBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.successSurface,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    fileFormatText: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        color: C.success,
    },

    filenameBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surfaceContainer,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    filenameText: {
        flex: 1,
        fontSize: 11,
        fontFamily: 'Nunito-SemiBold',
        color: C.textSecondary,
    },

    columnsSpecBox: {
        backgroundColor: COLORS.surfaceContainerLow,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    columnsSpecTitle: {
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
        marginBottom: 8,
    },
    columnsTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    colTag: {
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    colTagText: {
        fontSize: 10,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
    },

    // Footer
    footer: {
        backgroundColor: C.surface,
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 24,
    },
    exportBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: C.navy,
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    exportBtnDisabled: {
        backgroundColor: COLORS.gray400,
        shadowOpacity: 0,
        elevation: 0,
    },
    exportBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    exportBtnText: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
});
