import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import * as path from "path";
import svgLoader from "vite-svg-loader";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: path.join(__dirname, "src") }],
    preserveSymlinks: true,
    // To allow importing `.d.ts` files.
    extensions: [
      ".mjs",
      ".js",
      ".ts",
      ".mts",
      ".jsx",
      ".tsx",
      ".json",
      ".d.ts",
    ],
  },
  plugins: [vue({ reactivityTransform: true }), svgLoader()],
  define: {
    global: {},
  },
});
