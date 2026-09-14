/* eslint-env jest */
import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import ErrorBoundary from '../ErrorBoundary';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../PressableScale', () => require('react-native').Pressable);

test.each([true, false])('render failure is recoverable and private (development=%s)', async development => {
    const previous = global.__DEV__;
    global.__DEV__ = development;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnLog = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let broken = true;
    function Child() {
        if (broken) throw new Error('Bearer synthetic-secret file:///private-evidence.jpg');
        return <Text>Recovered</Text>;
    }
    let view;
    try {
        await act(async () => { view = renderer.create(<ErrorBoundary><Child /></ErrorBoundary>); });
        const output = JSON.stringify(view.toJSON());
        expect(output).toContain('Something went wrong');
        expect(output).not.toContain('synthetic-secret');
        expect(output).not.toContain('private-evidence');
        expect(JSON.stringify(warnLog.mock.calls)).not.toContain('synthetic-secret');
        if (!development) expect(warnLog).not.toHaveBeenCalled();
        broken = false;
        await act(async () => view.root.findByType(ErrorBoundary).instance.handleRetry());
        expect(JSON.stringify(view.toJSON())).toContain('Recovered');
    } finally {
        if (view) await act(async () => view.unmount());
        global.__DEV__ = previous;
        errorLog.mockRestore(); warnLog.mockRestore();
    }
});
