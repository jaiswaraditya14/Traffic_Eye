// Generate visibly synthetic positive controls, never alter the user's JPEG.
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');
const { transformFileSync } = require('@babel/core');
const fixtureModule = { exports: {} };
const compiled = transformFileSync(path.join(__dirname, '../src/utils/__tests__/fixtures/gpsJpegFixture.js'), { plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
new Function('exports', 'module', compiled)(fixtureModule.exports, fixtureModule);
async function main() {
    const directory = path.join(__dirname, '../output/exif-verification');
    fs.mkdirSync(directory, { recursive: true });
    const image = new Jimp(640, 480, 0x225577ff);
    // Geometric control image, independent of the user fixture. No font assets required.
    image.scan(0, 0, 640, 480, function (x, y, index) {
        if ((Math.floor(x / 80) + Math.floor(y / 80)) % 2) {
            this.bitmap.data[index] = 230; this.bitmap.data[index + 1] = 180; this.bitmap.data[index + 2] = 40;
        }
    });
    const jpeg = await image.getBufferAsync(Jimp.MIME_JPEG);
    const app1 = Buffer.from(fixtureModule.exports.createGpsJpegFixture());
    fs.writeFileSync(path.join(directory, 'synthetic_gps.jpg'), Buffer.concat([jpeg.subarray(0, 2), app1.subarray(2, 200), jpeg.subarray(2)]));
    const zero = Buffer.from(app1);
    for (const offset of [132, 140, 148, 162, 170, 178]) zero.writeUInt32LE(0, offset);
    fs.writeFileSync(path.join(directory, 'synthetic_zero.jpg'), Buffer.concat([jpeg.subarray(0, 2), zero.subarray(2, 200), jpeg.subarray(2)]));
    console.log('Generated separate synthetic JPEG controls in output/exif-verification.');
}
main().catch(error => { console.error('Synthetic fixture generation failed:', error.message); process.exitCode = 1; });
