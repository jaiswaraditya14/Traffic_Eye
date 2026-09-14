/* eslint-env jest */
import { rewardAvailability } from '../../../utils/productExperience';
test('insufficient points exact shortfall', () => expect(rewardAvailability({ pts: 100 }, 40)).toEqual({ disabled: true, label: 'Need 60 more points' }));
test('already redeemed blocks second redemption', () => expect(rewardAvailability({ pts: 100 }, 500, true)).toEqual({ disabled: true, label: 'Redeemed ✓' }));
test.each([{ pts: 10, available: false }, { pts: 10, is_active: false }, { pts: 10, stock: 0 }, { pts: 0 }, { pts: NaN }])('unavailable %j', item => expect(rewardAvailability(item, 1000)).toEqual({ disabled: true, label: 'Coming soon' }));
test('exact balance allows redemption', () => expect(rewardAvailability({ pts: 100 }, 100).disabled).toBe(false));
