import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.forkheartfork.app',
  appName: 'fork♥fork',
  webDir: 'dist',
  server: {
    // Remove this in production — only for live reload during dev
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F7F3EC',
    preferredContentMode: 'mobile',
    // Allows the WKWebView to scroll naturally
    scrollEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#F7F3EC',
    },
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#F7F3EC',
      showSpinner: false,
    },
  },
};

export default config;
