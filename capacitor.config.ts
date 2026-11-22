import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pk.ebooking.flyaviation',
  appName: 'eBooking.pk - Fly Aviation',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F7F9FC',
  },
};

export default config;
