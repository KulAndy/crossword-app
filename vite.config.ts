import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/crossword-app/",
  plugins: [react()],
});
