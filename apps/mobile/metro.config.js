// Expo monorepo (npm workspaces)ni o'zi aniqlaydi. Viewer bundle'i asset sifatida kiradi.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('html');

module.exports = config;
