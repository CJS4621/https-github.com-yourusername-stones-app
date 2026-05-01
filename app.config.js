const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'Stones (Dev)' : 'Stones',
    slug: 'stones-fresh',
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: IS_DEV ? 'stones-dev' : 'stones',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'ca.stonesapp.stones.dev' : 'ca.stonesapp.stones',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-font'],
    extra: {
      eas: {
        projectId: '196c95f1-da05-476c-b4fc-2f2d1a791edb',
      },
    },
    owner: 'cjs4621',
  },
};
