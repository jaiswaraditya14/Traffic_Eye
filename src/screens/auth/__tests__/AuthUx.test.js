/* eslint-env jest */
import React from 'react';
import { Alert, Animated, Text, TextInput, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import CitizenSignUp from '../CitizenSignUp';
import ForgotPassword from '../ForgotPassword';
import NewPassword from '../NewPassword';
import SignUpSuccess from '../SignUpSuccess';
import { supabase } from '../../../services';

const mockSignUpCitizen = jest.fn();

jest.mock('../../../context', () => ({
    useAuth: () => ({ signUpCitizen: mockSignUpCitizen }),
}));
jest.mock('../../../services', () => ({
    supabase: {
        auth: {
            resend: jest.fn(),
            resetPasswordForEmail: jest.fn(),
            getSession: jest.fn(),
            updateUser: jest.fn(),
            signOut: jest.fn(),
        },
    },
}));
jest.mock('../../../components', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        MobileContainer: props => React.createElement(View, null, props.children),
        FocusAwareStatusBar: () => null,
    };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => ({
    LinearGradient: require('react-native').View,
}));

let view;
let navigation;

const textOf = node => node.findAllByType(Text)
    .map(text => text.children.join(''))
    .join(' ');

async function mount(Component, props = {}) {
    await act(async () => {
        view = renderer.create(<Component navigation={navigation} {...props} />);
    });
}

async function fill(placeholder, value) {
    const input = view.root.findAllByType(TextInput)
        .find(node => node.props.placeholder === placeholder);
    expect(input).toBeDefined();
    await act(async () => input.props.onChangeText(value));
}

async function press(label) {
    const textNodes = view.root.findAll(node =>
        node.children && node.children.some(c => typeof c === 'string' && c.includes(label))
    );
    let button = null;
    for (const textNode of textNodes) {
        let current = textNode;
        while (current) {
            if (typeof current.props?.onPress === 'function') {
                button = current;
                break;
            }
            current = current.parent;
        }
        if (button) break;
    }
    expect(button).toBeDefined();
    await act(async () => button.props.onPress());
}

beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) };
    mockSignUpCitizen.mockResolvedValue({ error: null });
    supabase.auth.resend.mockResolvedValue({ error: null });
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({ start: callback => callback?.({ finished: true }) }));
    jest.spyOn(Animated, 'spring').mockImplementation(() => ({ start: callback => callback?.({ finished: true }) }));
    jest.spyOn(Animated, 'parallel').mockImplementation(() => ({ start: callback => callback?.({ finished: true }) }));
    jest.spyOn(Animated, 'loop').mockImplementation(() => ({ start: jest.fn(), stop: jest.fn() }));
});

afterEach(async () => {
    if (view) await act(async () => view.unmount());
    view = null;
    jest.restoreAllMocks();
});

test('signup shows the six-character rule and resends verification through Supabase', async () => {
    await mount(CitizenSignUp);
    expect(JSON.stringify(view.toJSON())).toContain('Password must be at least 6 characters.');

    await fill('Full Name', 'Test Citizen');
    await fill('you@authority.com', ' citizen@example.com ');
    await fill('+91 00000 00000', '+91 99999 99999');
    await fill('At least 6 characters', 'secret');
    await fill('Re-enter password', 'secret');
    await press('Submit Enrollment');

    expect(mockSignUpCitizen).toHaveBeenCalledWith('citizen@example.com', 'secret', 'Test Citizen', '+91 99999 99999');
    await press("Didn't receive the email? Resend");

    expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'citizen@example.com',
        options: { emailRedirectTo: 'trafficeye://signup-success' },
    });
    expect(Alert.alert).toHaveBeenCalledWith('Email Resent', expect.stringContaining('citizen@example.com'));
});

test('forgot password shows check-your-email confirmation before OTP entry', async () => {
    await mount(ForgotPassword);
    await fill('you@authority.com', ' citizen@example.com ');
    await press('Send OTP Code');

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('citizen@example.com', {
        redirectTo: 'trafficeye://auth/callback',
    });
    expect(navigation.navigate).toHaveBeenCalledWith('SignUpSuccess', {
        mode: 'passwordReset',
        email: 'citizen@example.com',
    });

    await act(async () => view.unmount());
    view = null;
    await mount(SignUpSuccess, { route: { params: { mode: 'passwordReset', email: 'citizen@example.com' } } });
    expect(JSON.stringify(view.toJSON())).toContain('Check your email');
    await press('Enter Verification Code');
    expect(navigation.navigate).toHaveBeenCalledWith('OtpVerification', { email: 'citizen@example.com' });
});

test('new password accepts six characters and keeps success visible until sign-out', async () => {
    await mount(NewPassword, { route: { params: { email: 'officer@example.com', role: 'officer' } } });
    expect(JSON.stringify(view.toJSON())).toContain('Must be at least 6 characters');

    await fill('At least 6 characters', 'secret');
    await fill('Repeat new password', 'secret');
    await press('Update Password');

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'secret' });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(JSON.stringify(view.toJSON())).toContain('Password Updated!');

    await press('Go to Sign In');
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('OfficerSignIn');
});
