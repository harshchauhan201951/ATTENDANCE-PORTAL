import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.raceracademy.app",
  appName: "RACER ACADEMY",
  webDir: "public",

  plugins: { PushNotifications: { presentationOptions: ["alert", "sound", "badge", "banner", "list"] } },

  server: {
    url: "https://attendance-portal-mu-three.vercel.app",
    cleartext: false,
  },
};

export default config;

