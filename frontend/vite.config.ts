import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  resolve: {
    alias: {
      // allow imports like `src/components/...`
      src: path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    port: 4173,
  },
});
