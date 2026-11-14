const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// getSentryExpoConfig = expo getDefaultConfig + идентификаторы отладки (debug id) в бандле для загрузки sourcemaps в Sentry.
// Сама загрузка не запускается при сборке или export: см. раздел «Sentry» в GUIDE.md.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
