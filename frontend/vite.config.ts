// STATUS: UPDATED

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  const configuredBackendUrl = env["VITE_API_BASE_URL"] || env["VITE_API_URL"];
  const backendUrl = configuredBackendUrl
    ? configuredBackendUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "")
    : "";

  if (!backendUrl && (mode === "development" || process.env["VERCEL"])) {
    throw new Error("Set VITE_API_BASE_URL or VITE_API_URL to the backend API URL.");
  }

  const proxyRules = backendUrl
    ? {
        "/api/**": { proxy: `${backendUrl}/api/**` },
        "/health": { proxy: `${backendUrl}/health` },
      }
    : {};
  const developmentProxy = backendUrl
    ? {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/health": {
          target: backendUrl,
          changeOrigin: true,
        },
      }
    : {};

  return {
    plugins: [
      ...tanstackStart({
        server: {
          entry: "server",
        },
      }),

      nitro({
        routeRules: proxyRules,
      }),

      react(),
      tailwindcss(),
    ],

    resolve: {
      tsconfigPaths: true,
    },

    server: {
      port: 5173,
      strictPort: true,

      proxy: developmentProxy,
    },
  };
});
