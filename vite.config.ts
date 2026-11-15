import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" 让构建结果可以放在 GitHub Pages 子路径下（路由使用 hash，不需要服务器重写）。
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: { include: ["tests/**/*.test.ts"] },
});
