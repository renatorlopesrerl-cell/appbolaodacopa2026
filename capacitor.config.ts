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
      smallIcon: "ic_stat_icon_config_sample", // Ensure a valid icon exists or use default
      iconColor: "#488AFF",
      sound: "beep.wav"
    }
  }
};

export default config;
