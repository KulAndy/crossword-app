import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint2";

export default defineConfig({
  base: "/crosswords/",
  build: {
    minify: "esbuild",
    sourcemap: false,
  },
  plugins: [
    react(),
    eslint({
      include: ["src/**/*.{ts,tsx}"],
      cache: false,
    }),
  ],
});
