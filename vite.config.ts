import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";

export default defineConfig({
  base: "/crosswords/",
  build: {
    minify: "terser",
    sourcemap: false,
  },
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: "eslint ./src --ext .ts,.tsx",
      },
    }),
  ],
});
