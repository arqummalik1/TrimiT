module.exports = function (api) {
  const isProd = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: isProd
      ? [['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]]
      : [],
  };
};
