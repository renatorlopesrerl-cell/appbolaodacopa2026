import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.palpiteirodacopa',
  appName: 'Palpiteiro da Copa 2026',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['bolaodacopa2026.app', '*.supabase.co']
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_notification", // Use a valid icon in drawable folders
      iconColor: "#488AFF",
      sound: "beep.wav"
    },
    AdMob: {
      appId: "ca-app-pub-7684468298593275~6396459942"
    }
  }
};

export default config;
