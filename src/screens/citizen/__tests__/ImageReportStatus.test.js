/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ReportTimeline, { timelineNodes } from '../../../components/common/ReportTimeline';
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
test.each([['pending', ['Submitted', 'Under Review']], ['approved', ['Submitted', 'Approved']], ['rejected', ['Submitted', 'Rejected']], [null, ['Submitted']]])('timeline %s', (status, labels) => expect(timelineNodes({ status }).map(n => n.label)).toEqual(labels));
test('missing reviewed timestamp is never substituted', () => expect(timelineNodes({ status: 'approved', reviewed_at: null, submitted_at: '2026-09-12' })[1].timestamp).toBeNull());
test('pending has only Submitted complete and no fake decision', () => {
    const nodes = timelineNodes({ status: 'pending', submitted_at: '2026-09-12' });
    expect(nodes.map(node => [node.label, node.done])).toEqual([['Submitted', true], ['Under Review', false]]);
    expect(nodes.map(node => node.label)).not.toEqual(expect.arrayContaining(['Approved', 'Rejected']));
});
test('rejection displays the public officer remark as the rejection reason', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true; let view;
    await act(async () => { view = renderer.create(<ReportTimeline report={{ status: 'rejected', officer_review: [{ remarks: 'Plate obscured; retake in daylight' }] }} />); });
    expect(JSON.stringify(view.toJSON())).toContain('Rejection reason');
    expect(JSON.stringify(view.toJSON())).toContain('Plate obscured; retake in daylight');
    await act(async () => view.unmount());
});
test.each([['approved', 70, true], ['approved', 0, false], ['pending', 70, false], ['rejected', 70, false]])('actual earned badge (%s,%s)', async (status, reward, shown) => {
    global.IS_REACT_ACT_ENVIRONMENT = true; let view;
    await act(async () => { view = renderer.create(<ReportTimeline report={{ status, reward_amount: reward, reviewed_at: null }} />); });
    const text = JSON.stringify(view.toJSON()); expect(text.includes('points earned')).toBe(shown); expect(text).toContain('Pending');
    await act(async () => view.unmount());
});
