// Isolated QA project only. Never used by the production app's Metro config.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const root = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(root, 'node_modules')];
config.resolver.resolveRequest = (context, name, platform) => {
    if (name === '@maplibre/maplibre-react-native') return { type: 'sourceFile', filePath: path.join(__dirname, 'map-stub.js') };
    const result = context.resolveRequest(context, name, platform);
    const file = result.filePath?.replaceAll('\\', '/');
    if (file && (/\/src\/context\//.test(file) || /\/src\/services\/(index\.js|reports\/index\.js|supabase\/index\.js|geoService\.js)$/.test(file) || /\/src\/hooks\/index\.js$/.test(file))) return { type: 'sourceFile', filePath: path.join(__dirname, 'fixtures.js') };
    return result;
};
module.exports = config;
