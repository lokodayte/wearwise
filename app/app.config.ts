import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Wearwise',
  slug: 'wearwise',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F0F0F',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.wearwise.app',
    infoPlist: {
      NSCameraUsageDescription: 'Wearwise needs camera access to photograph your garments.',
      NSPhotoLibraryUsageDescription: 'Wearwise needs photo access to import garment images.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F0F0F',
    },
    package: 'com.wearwise.app',
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-camera',
      { cameraPermission: 'Wearwise needs camera access to photograph your garments.' },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#6C63FF',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
