import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    ...tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      "/api": {
        target: process.env["VITE_API_URL"] || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
