import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.palpiteirodacopa',
  appName: 'Palpiteiro da Copa 2026',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['bolaodacopa2026.app', '*.supabase.co']
  }
};

export default config;
