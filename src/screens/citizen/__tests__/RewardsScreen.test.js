/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import Rewards from '../Rewards';
import { rewardService } from '../../../services';

let mockPoints = 500;
const mockRefreshProfile = jest.fn();
jest.mock('../../../context', () => ({ useAuth: () => ({ profile: { points_balance: mockPoints }, refreshProfile: mockRefreshProfile }) }));
jest.mock('../../../hooks/useReducedMotion', () => () => true);
jest.mock('@react-navigation/native', () => ({ useFocusEffect: callback => require('react').useEffect(callback, [callback]) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View, useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('../../../components', () => ({
    FocusAwareStatusBar: () => null,
    Celebration: () => null,
    PressableScale: props => require('react').createElement(require('react-native').Pressable, props),
    ConfirmationModal: props => props.visible ? require('react').createElement(require('react-native').View, null,
        require('react').createElement(require('react-native').Text, null, props.message),
        require('react').createElement(require('react-native').Pressable, { accessibilityLabel: 'Confirm reward redemption', onPress: props.onConfirm })) : null,
    FeedbackToast: props => props.visible ? require('react').createElement(require('react-native').Text, { accessibilityRole: 'alert' }, props.message) : null,
    StatSkeleton: () => require('react').createElement(require('react-native').Text, null, 'Loading balance'),
}));
jest.mock('../../../services', () => ({
    REDEEM_CATALOG: [{ id: 'coffee', title: 'Coffee', description: 'Partner drink', pts: 100, icon: 'cafe' }],
    rewardService: { getActivityHistory: jest.fn(), getRedeemedItems: jest.fn(), redeemItem: jest.fn() },
}));

const flush = () => new Promise(resolve => setImmediate(resolve));
const flattenText = value => Array.isArray(value) ? value.flatMap(flattenText) : (typeof value === 'string' || typeof value === 'number' ? [String(value)] : []);
const renderedText = () => view.root.findAllByType(Text).flatMap(node => flattenText(node.props.children)).join(' ');
let view;
beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    mockPoints = 500;
    mockRefreshProfile.mockResolvedValue();
    rewardService.getActivityHistory.mockResolvedValue({ success: true, history: [] });
    rewardService.getRedeemedItems.mockResolvedValue({ success: true, redeemed: {} });
    rewardService.redeemItem.mockResolvedValue({ success: true, couponCode: 'SAFE-CODE', expiresAt: '2099-01-01' });
});
afterEach(async () => { if (view) await act(async () => view.unmount()); view = null; jest.clearAllMocks(); });
async function mount() { await act(async () => { view = renderer.create(<Rewards />); await flush(); }); }

test('insufficient points disable the card with the exact shortfall', async () => {
    mockPoints = 40; await mount();
    const card = view.root.findByProps({ accessibilityLabel: 'Coffee, Need 60 more points' });
    expect(card.props.disabled).toBe(true);
});

test('rapid confirmation invokes one server redemption and shows the coupon', async () => {
    let resolveRedeem;
    rewardService.redeemItem.mockReturnValue(new Promise(resolve => { resolveRedeem = resolve; }));
    await mount();
    await act(async () => view.root.findByProps({ accessibilityLabel: 'Coffee, Redeem' }).props.onPress());
    const confirm = view.root.findByProps({ accessibilityLabel: 'Confirm reward redemption' });
    act(() => { confirm.props.onPress(); confirm.props.onPress(); });
    expect(rewardService.redeemItem).toHaveBeenCalledTimes(1);
    resolveRedeem({ success: true, couponCode: 'SAFE-CODE', expiresAt: '2099-01-01' });
    await act(async () => { await flush(); });
    expect(renderedText()).toContain('SAFE-CODE');
});

test('server failure is visible and leaves redemption retryable', async () => {
    rewardService.redeemItem.mockResolvedValue({ success: false });
    await mount();
    await act(async () => view.root.findByProps({ accessibilityLabel: 'Coffee, Redeem' }).props.onPress());
    await act(async () => view.root.findByProps({ accessibilityLabel: 'Confirm reward redemption' }).props.onPress());
    expect(renderedText()).toContain('Redemption could not be confirmed');
    expect(view.root.findByProps({ accessibilityLabel: 'Coffee, Redeem' }).props.disabled).toBe(false);
});

test('already-redeemed item opens its existing coupon without another redemption', async () => {
    rewardService.getRedeemedItems.mockResolvedValue({ success: true, redeemed: { coffee: { couponCode: 'EXISTING', expiresAt: '2099-01-01' } } });
    await mount();
    await act(async () => view.root.findByProps({ accessibilityLabel: 'Coffee, Redeemed ✓' }).props.onPress());
    expect(rewardService.redeemItem).not.toHaveBeenCalled();
    expect(renderedText()).toContain('EXISTING');
});
