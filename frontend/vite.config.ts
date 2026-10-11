// STATUS: UPDATED

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const rootDir = process.cwd();
  const parentDir = path.resolve(rootDir, "..");
  const backendDir = path.resolve(parentDir, "backend");

  const backendEnv = loadEnv(mode, backendDir, "VITE_");
  const parentEnv = loadEnv(mode, parentDir, "VITE_");
  const localEnv = loadEnv(mode, rootDir, "VITE_");

  const env = { ...backendEnv, ...parentEnv, ...localEnv };

  const backendUrl = (
    env["VITE_API_BASE_URL"] ||
    env["VITE_API_URL"] ||
    "http://localhost:5000"
  )
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "");

  return {
    define: {
      ...(env["VITE_API_BASE_URL"]
        ? {
            "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
              env["VITE_API_BASE_URL"],
            ),
            "process.env.VITE_API_BASE_URL": JSON.stringify(
              env["VITE_API_BASE_URL"],
            ),
          }
        : {}),
      ...(env["VITE_VOXIDE_PUBLIC_KEY"]
        ? {
            "import.meta.env.VITE_VOXIDE_PUBLIC_KEY": JSON.stringify(
              env["VITE_VOXIDE_PUBLIC_KEY"],
            ),
          }
        : {}),
    },
    plugins: [
      ...tanstackStart({
        server: {
          entry: "server",
        },
      }),
      nitro(),
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],

    server: {
      host: true,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/health": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});