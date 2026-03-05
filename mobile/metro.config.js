const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch shared types/tools from monorepo root
config.watchFolders = [path.resolve(__dirname, '../src/shared')];

module.exports = config;
