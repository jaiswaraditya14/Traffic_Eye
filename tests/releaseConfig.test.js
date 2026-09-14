/* eslint-env jest */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Jimp from 'jimp-compact';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath));

test('release config has an iOS identifier, EAS profiles, and dedicated notification art', () => {
    const app = JSON.parse(read('app.json').toString('utf8')).expo;
    const eas = JSON.parse(read('eas.json').toString('utf8'));
    expect(app.ios.bundleIdentifier).toBe('com.trafficviolationapp');
    expect(app.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-notifications')[1].icon).toBe('./assets/images/notification-icon.png');
    expect(eas.cli.version).toBe('>= 16.0.0');
    expect(eas.build).toEqual(expect.objectContaining({ development: expect.any(Object), preview: expect.any(Object), production: expect.any(Object) }));
});

test('Android notification icon is a nonempty white silhouette on transparency', async () => {
    const image = await Jimp.read(path.join(root, 'assets/images/notification-icon.png'));
    let white = 0, transparent = 0, other = 0;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, index) => {
        const [r, g, b, a] = [...image.bitmap.data.slice(index, index + 4)];
        if (a === 0) transparent++;
        else if (r === 255 && g === 255 && b === 255 && a === 255) white++;
        else other++;
    });
    expect([image.bitmap.width, image.bitmap.height]).toEqual([96, 96]);
    expect(white).toBeGreaterThan(500);
    expect(transparent).toBeGreaterThan(500);
    expect(other).toBe(0);
});

test('adaptive icon nontransparent content remains inside the documented safe zone', async () => {
    const image = await Jimp.read(path.join(root, 'assets/images/adaptive-icon.png'));
    let minX = image.bitmap.width, minY = image.bitmap.height, maxX = -1, maxY = -1;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, index) => {
        if (image.bitmap.data[index + 3] > 0) {
            minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
    });
    expect([image.bitmap.width, image.bitmap.height]).toEqual([1024, 1024]);
    expect({ minX, minY, maxX, maxY }).toEqual({ minX: 229, minY: 359, maxX: 824, maxY: 822 });
    expect(minX).toBeGreaterThanOrEqual(192); expect(minY).toBeGreaterThanOrEqual(192);
    expect(maxX).toBeLessThanOrEqual(832); expect(maxY).toBeLessThanOrEqual(832);
});

test('native Android manifest disables app-data backup and legacy external storage', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml').toString('utf8');
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toContain('android:requestLegacyExternalStorage');
});

test.each([
    ['supabase/functions/ai-analyze/index.ts', '9242C8D904AF397B724F657F99FDAF0BC8B9F7157EAB12873D366BCDE6339893'],
    ['supabase/functions/ai-analyze/providers.ts', '149336727015ADB9D7865B8F914B25E38B864732FDE2387DEE070A2689C45040'],
])('protected AI function remains byte-for-byte unchanged: %s', (file, expected) => {
    expect(crypto.createHash('sha256').update(read(file)).digest('hex').toUpperCase()).toBe(expected);
});
