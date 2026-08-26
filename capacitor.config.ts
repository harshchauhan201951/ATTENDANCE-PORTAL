import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.raceracademy.app",
  appName: "RACER ACADEMY",
  webDir: "public",

  server: {
    url: "https://attendance-portal-mu-three.vercel.app",
    cleartext: false,
  },
};

export default config;