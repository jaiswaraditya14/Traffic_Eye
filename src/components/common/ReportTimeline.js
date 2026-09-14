import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../utils/theme';
import StatusPill from './StatusPill';
import { validTime } from '../../utils/productExperience';

export function timelineNodes(report) {
    const nodes = [{ label: 'Submitted', timestamp: report.submitted_at, done: true, icon: 'document-text-outline' }];
    if (report.status === 'pending') nodes.push({ label: 'Under Review', detail: 'Awaiting officer review', done: false, icon: 'time-outline' });
    if (report.status === 'approved' || report.status === 'rejected') nodes.push({
        label: report.status === 'approved' ? 'Approved' : 'Rejected', timestamp: report.reviewed_at,
        done: true, icon: report.status === 'approved' ? 'checkmark-circle' : 'close-circle',
    });
    return nodes;
}
export default function ReportTimeline({ report }) {
    const nodes = timelineNodes(report);
    const review = Array.isArray(report.officer_review) ? report.officer_review[0] : report.officer_review;
    return <View style={styles.container}>
        {nodes.map((node, index) => <View key={node.label} style={styles.row}>
            <View style={styles.rail}>
                <Ionicons name={node.icon} size={24} color={node.done ? COLORS.primary : COLORS.secondary} />
                {index < nodes.length - 1 && <View style={[styles.line, !nodes[index + 1].done && { borderStyle: 'dashed' }]} />}
            </View>
            <View style={{ flex: 1, paddingBottom: SPACING.lg }}>
                <Text style={styles.title}>{node.label}</Text>
                <Text style={styles.detail}>{node.detail || (validTime(node.timestamp) === null ? 'Pending' : new Date(node.timestamp).toLocaleString('en-IN'))}</Text>
            </View>
        </View>)}
        {['approved', 'rejected'].includes(report.status) && !!review?.remarks && <View style={styles.remarks}><Text style={styles.title}>{report.status === 'rejected' ? 'Rejection reason' : 'Officer remarks'}</Text><Text style={styles.detail}>{review.remarks}</Text></View>}
        {report.status === 'approved' && Number(report.reward_amount) > 0 && <StatusPill status="pending" label={'+' + report.reward_amount + ' points earned'} />}
    </View>;
}
const styles = StyleSheet.create({
    container: { padding: SPACING.lg }, row: { flexDirection: 'row', gap: SPACING.md }, rail: { alignItems: 'center', width: 26 },
    line: { flex: 1, borderLeftWidth: 2, borderColor: COLORS.border, marginVertical: 4 },
    title: { ...TYPOGRAPHY.body, color: COLORS.primary, fontWeight: '700' }, detail: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
    remarks: { padding: SPACING.md, backgroundColor: COLORS.surfaceContainer, borderRadius: 12, marginBottom: SPACING.md },
});
