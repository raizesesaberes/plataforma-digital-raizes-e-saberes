const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const fs = require('node:fs');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [fs.realpathSync(path.join(__dirname, 'node_modules'))];
config.cacheStores = [new FileStore({root: path.join(__dirname, '.metro-cache-local-preview')})];
module.exports = config;
