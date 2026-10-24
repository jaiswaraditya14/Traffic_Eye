/* eslint-env jest */
import React from 'react';
import { Text, View } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AIStatusBadge from '../AIStatusBadge';
import { COLORS } from '../../../utils/theme';

jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    return { Ionicons: props => React.createElement('Ionicons', props) };
});

let view;

const renderBadge = props => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    act(() => {
        view = renderer.create(<AIStatusBadge {...props} />);
    });
    return view;
};

const expectBadge = (label, icon, color) => {
    expect(view.root.findByType(Text).props.children).toBe(label);
    expect(view.root.findByProps({ name: icon }).props.color).toBe(color);
};

afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
});

test('manual entry takes precedence over every other status', () => {
    renderBadge({
        result: null,
        confidence: 0,
        authenticityCheck: { status: 'POSSIBLE_INTEGRITY_ISSUE' },
    });

    expectBadge('Manual Entry', 'shield-outline', COLORS.textTertiary);
});

test('a zero-confidence manual-review result needs review', () => {
    renderBadge({ result: { requiresManualReview: true }, confidence: 0 });

    expectBadge('Needs Review', 'eye-outline', COLORS.warning);
});

test.each([0.42, 42])('nonzero AI requiring review is uncertain (confidence=%s)', confidence => {
    renderBadge({ result: { requiresManualReview: true }, confidence });

    expectBadge('AI Uncertain', 'help-circle-outline', '#C2410C');
});

test('a possible integrity issue is the only red warning', () => {
    renderBadge({
        result: { requiresManualReview: true },
        confidence: 0.42,
        authenticityCheck: { status: 'POSSIBLE_INTEGRITY_ISSUE' },
    });

    expectBadge('Integrity Warning', 'warning-outline', COLORS.error);
    expect(view.root.findByType(View).props.accessibilityLabel).toBe('AI status: Integrity Warning');
});

test('authenticity can be read from the raw result shape', () => {
    renderBadge({
        result: { authenticity_check: { status: 'POSSIBLE_INTEGRITY_ISSUE' } },
        confidence: 0.8,
    });

    expectBadge('Integrity Warning', 'warning-outline', COLORS.error);
});

test('legacy authenticity flags and low confidence do not create warnings', () => {
    renderBadge({
        result: { confidence: 0.2 },
        confidence: 0.2,
        authenticityCheck: {
            authentic: false,
            flags: ['legacy_flag'],
            status: 'INSUFFICIENT_EVIDENCE',
        },
    });

    expect(view.toJSON()).toBeNull();
});

test('normal AI results render no badge', () => {
    renderBadge({
        result: { requiresManualReview: false },
        confidence: 0.95,
        authenticityCheck: { status: 'SUFFICIENT' },
    });

    expect(view.toJSON()).toBeNull();
});
