import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const backendUrl =
    (env["VITE_API_BASE_URL"] || env["VITE_API_URL"] || "http://localhost:5000")
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/$/, "");

  return {
    plugins: [
      ...tanstackStart({ server: { entry: "server" } }),
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],
    server: {
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
