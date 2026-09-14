/* eslint-env node */
const path = require('path');
const Jimp = require('jimp-compact');

const WHITE = Jimp.rgbaToInt(255, 255, 255, 255);
const TRANSPARENT = Jimp.rgbaToInt(0, 0, 0, 0);

function buildIcon(size) {
    const image = new Jimp(size, size, TRANSPARENT);
    const scale = size / 96;
    const left = 12 * scale;
    const right = 84 * scale;
    const centerY = 48 * scale;
    const outline = Math.max(1, 5 * scale);
    const pupilRadius = 9 * scale;

    image.scan(0, 0, size, size, function draw(x, y, index) {
        const t = (x - left) / (right - left);
        const halfHeight = t >= 0 && t <= 1 ? 22 * scale * Math.sin(Math.PI * t) : 0;
        const dy = Math.abs(y - centerY);
        const eyeOutline = halfHeight > 0 && dy <= halfHeight && dy >= Math.max(0, halfHeight - outline);
        const pupil = Math.hypot(x - size / 2, y - centerY) <= pupilRadius;
        if (eyeOutline || pupil) {
            this.bitmap.data[index] = 255;
            this.bitmap.data[index + 1] = 255;
            this.bitmap.data[index + 2] = 255;
            this.bitmap.data[index + 3] = 255;
        }
    });
    return image;
}

async function main() {
    const root = path.resolve(__dirname, '..');
    const outputs = [
        ['assets/images/notification-icon.png', 96],
        ['android/app/src/main/res/drawable-mdpi/notification_icon.png', 24],
        ['android/app/src/main/res/drawable-hdpi/notification_icon.png', 36],
        ['android/app/src/main/res/drawable-xhdpi/notification_icon.png', 48],
        ['android/app/src/main/res/drawable-xxhdpi/notification_icon.png', 72],
        ['android/app/src/main/res/drawable-xxxhdpi/notification_icon.png', 96],
    ];
    for (const [relativePath, size] of outputs) {
        await buildIcon(size).writeAsync(path.join(root, relativePath));
    }
}

main().catch(error => {
    process.stderr.write(`Notification icon generation failed: ${error?.code || 'UNKNOWN'}\n`);
    process.exitCode = 1;
});
