module.exports = function (api) {
  api.cache(true);
  const isProd = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
      ...(isProd ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
    ],
  };
};
