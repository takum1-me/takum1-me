// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { roastLogDevApi } from "./roast-log-dev-api.mjs";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    // roastLogDevApi は apply:"serve" なので dev だけ。ビルドには入らない
    plugins: [tailwindcss(), roastLogDevApi(import.meta.dirname)],
  },
});
