// ts-check

import { defineConfig } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";

export default defineConfig([
  ...eslintPluginAstro.configs["jsx-a11y-recommended"],
]);
