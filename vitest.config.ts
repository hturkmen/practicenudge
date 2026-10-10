import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // tsconfig keeps jsx as "preserve" for Next; the test transform needs it compiled (Vite 8 uses oxc).
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
