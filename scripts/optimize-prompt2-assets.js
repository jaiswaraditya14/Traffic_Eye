// User-approved local sizing/padding of built-in image-generation outputs.
// Usage: node scripts/optimize-prompt2-assets.js <generated-images-directory>
const fs = require('fs');
const path = require('path');
const { getJimpImageAsync, createSquareAsync } = require('@expo/image-utils/build/jimp');
const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source) throw new Error('Provide the image-generation output directory.');
async function main() {
    const names = ['exec-32eedf55-9fe7-474a-ad06-9ade4ef790df.png', 'exec-4a89120f-6def-495b-a119-374b72ec004a.png', 'exec-aa2274ec-9019-4bf1-81e5-632decd51948.png', 'exec-72030884-2547-48a8-b5ad-02c1a8fa69e9.png', 'exec-a7e7e292-be5f-44c5-ba6e-664c833794bf.png'];
    for (const [index, name] of names.entries()) {
        const image = await getJimpImageAsync(path.join(source, name));
        const target = index === 4 ? 'icon.png' : `onboarding_${index + 1}.png`;
        await image.resize(1024, 1024).writeAsync(path.join(root, 'assets/images', target));
        console.log(target, '1024×1024');
    }
    const foreground = await getJimpImageAsync(path.join(source, 'exec-1f6be907-4d0e-4501-bb48-90f4b4832430.png'));
    let left = foreground.bitmap.width, top = foreground.bitmap.height, right = 0, bottom = 0;
    foreground.scan(0, 0, foreground.bitmap.width, foreground.bitmap.height, function (x, y, i) {
        if (this.bitmap.data[i + 3] > 0) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
    });
    if (left === 0 && right === foreground.bitmap.width - 1 && top === 0 && bottom === foreground.bitmap.height - 1) throw new Error('Foreground is not transparent.');
    const width = right - left + 1, height = bottom - top + 1;
    const scale = 640 / Math.max(width, height);
    foreground.crop(left, top, width, height).resize(Math.round(width * scale), Math.round(height * scale));
    const canvas = await getJimpImageAsync(await createSquareAsync({ size: 1024, color: '#00000000' }));
    canvas.composite(foreground, Math.floor((1024 - foreground.bitmap.width) / 2), Math.floor((1024 - foreground.bitmap.height) / 2));
    await canvas.writeAsync(path.join(root, 'assets/images/adaptive-icon.png'));
    console.log('adaptive-icon.png 1024×1024, alpha preserved, foreground within central 62.5%');
    const preview = path.join(root, 'docs/prompt2-qa'); fs.mkdirSync(preview, { recursive: true });
    const icon = await getJimpImageAsync(path.join(root, 'assets/images/icon.png'));
    await icon.resize(48, 48).writeAsync(path.join(preview, 'icon-48.png'));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
