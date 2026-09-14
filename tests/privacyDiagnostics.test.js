/* eslint-env jest */
import fs from 'fs';
import path from 'path';

const privacyCriticalModules = [
    'src/utils/fileHash.js',
    'src/utils/exifParserCore.js',
    'src/utils/exifParserCoreCommonJS.js',
    'src/utils/localAuthenticity.js',
    'src/components/common/ImageCropModal.js',
    'src/hooks/useImagePicker.js',
    'src/hooks/useLocation.js',
    'src/services/ai/preprocessing.js',
    'src/services/ai/ruleEngine.js',
];

test.each(privacyCriticalModules)('%s has no evidence or error console diagnostics', file => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(source).not.toMatch(/console\.(log|warn|error)\s*\(/);
});
