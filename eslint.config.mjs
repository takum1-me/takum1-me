// @ts-check

import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";

// 設定の組み立ては ESLint 本体の defineConfig を使う
// （typescript-eslint の tseslint.config は非推奨になった）。
export default defineConfig(
  // ESLint 9 のデフォルト無視は node_modules と .git だけなので、
  // 生成物・ビルド成果物・外部から持ってきたものは自分で外す。
  // これが無いと dist/ や .claude/worktrees/ まで lint 対象になり、
  // ローカルと CI で「lint」の意味が変わってしまう。
  globalIgnores([
    "dist/",
    ".astro/",
    ".wrangler/",
    ".claude/",
    "skills/",
    "Coffee-Character-Wheel-Poster-PDF_files/",
  ]),

  js.configs.recommended,

  // .ts / .tsx のみ。.astro のフロントマターは eslint-plugin-astro 側が面倒を見る
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [tseslint.configs.recommended],
  },

  ...eslintPluginAstro.configs["jsx-a11y-recommended"],

  // React の hooks チェック。ソース側に exhaustive-deps の抑制コメントが
  // 書かれており、プラグインを入れないとその指定自体がエラーになる。
  //
  // v7 の recommended は React Compiler 系の 16 ルールまで含み、
  // Astro のハイドレーション時に window を読む既存の実装（Header など）を
  // 一律で咎めてしまうので、ここでは従来の 2 ルールだけを有効にする。
  {
    files: ["**/*.tsx"],
    // プラグイン本体の configs の型が ESLint の Plugin と噛み合わないだけで、
    // ルールの実体は問題ない。型の辻褄はここで合わせる。
    plugins: {
      "react-hooks": /** @type {import("eslint").ESLint.Plugin} */ (
        /** @type {unknown} */ (reactHooks)
      ),
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // `const { log: _log, ...rest } = record` のような
  // 「意図的に捨てる」書き方を許す
  {
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // ブラウザで動くもの（React コンポーネントと .astro のインラインスクリプト）
  {
    files: ["**/*.tsx", "**/*.astro"],
    languageOptions: { globals: globals.browser },
  },

  // Node で動くもの（ビルドスクリプトと設定ファイル）
  {
    files: ["*.mjs", "*.js", "scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },

  // 型定義ファイルは宣言だけなので未使用チェックが誤爆する
  {
    files: ["**/*.d.ts"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
);
