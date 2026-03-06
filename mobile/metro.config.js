const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch shared types/tools from monorepo root
config.watchFolders = [path.resolve(__dirname, '../src/shared')];

// Allow Metro to resolve .mjs files (required for @google/genai)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'mjs');

// Resolve node_modules from mobile directory even for files outside (e.g. ../src/shared/*)
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
