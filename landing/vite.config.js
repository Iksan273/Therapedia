import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  server: {
    port: 3001,
    open: false,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 600,
  },
});
