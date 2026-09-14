/**
 * Compatibility entry point for the production EXIF suite.
 * The Jest suite imports src/utils/exifParser.js, exactly as the app does.
 * Do not reinstate a copied parser or simulated pipeline here.
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, [
    require.resolve('jest/bin/jest'),
    '--runInBand',
    '--runTestsByPath',
    path.join(repositoryRoot, 'src/utils/__tests__/exifParser.test.js'),
    ...process.argv.slice(2),
], {
    cwd: repositoryRoot,
    stdio: 'inherit',
});

if (result.error) {
    console.error('The production EXIF test runner could not start.');
}
process.exitCode = result.status ?? 1;
