const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

// Xcode "Bundle React Native code" never runs npm prestart — sync shared JSON here.
require('./scripts/sync-shared-json.cjs');

/** @type {import('metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'src/components/MapView.web.tsx'),
      type: 'sourceFile',
    };
  }

  if (platform === 'web' && moduleName === 'zustand') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && moduleName.startsWith('zustand/')) {
    const subPath = moduleName.replace('zustand/', '');
    return {
      filePath: path.resolve(__dirname, `node_modules/zustand/${subPath}.js`),
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
