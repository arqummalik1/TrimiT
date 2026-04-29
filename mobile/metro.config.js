const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Alias react-native-maps to our web mock when bundling for web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'src/components/MapView.web.tsx'),
      type: 'sourceFile',
    };
  }
  
  // Force Zustand to use CJS version to avoid import.meta issues on web
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
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
