#!/usr/bin/env node

/**
 * .astroファイル内の<style>タグをチェックするスクリプト
 * Stylelintは.astro内のCSSをチェックできないため、手動で抽出してチェックする
 *
 * ファイルごとに `npx stylelint` を起動すると 1 回あたり 0.5 秒ほどかかり、
 * 全体で 15 秒を超えていた。stylelint の Node API を 1 プロセスで呼び回す。
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import stylelint from "stylelint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, "src");

// .astroファイルを再帰的に検索
function findAstroFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== "node_modules") {
      files.push(...findAstroFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith(".astro")) {
      files.push(fullPath);
    }
  }

  return files;
}

// <style>タグの内容を抽出
function extractStyles(content) {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
  const styles = [];
  let match;

  while ((match = styleRegex.exec(content)) !== null) {
    styles.push(match[1]);
  }

  return styles.join("\n\n");
}

const astroFiles = findAstroFiles(srcDir);
let hasErrors = false;

console.log(`🔍 ${astroFiles.length}個の.astroファイルをチェック中...\n`);

for (const file of astroFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const styles = extractStyles(content);

  if (!styles.trim()) continue;

  const relativePath = path.relative(__dirname, file);

  // 拡張子だけ .css にした名前で渡し、.css ファイルと同じ設定で検査させる
  const { errored, report } = await stylelint.lint({
    code: styles,
    codeFilename: file.replace(/\.astro$/, ".css"),
    cwd: __dirname,
    formatter: "string",
  });

  if (errored) {
    hasErrors = true;
    console.log(`\n❌ ${relativePath}`);
    console.log(report);
  } else {
    console.log(`✅ ${relativePath}`);
  }
}

console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.log("❌ エラーが見つかりました");
  process.exit(1);
} else {
  console.log("✅ すべての.astroファイルのCSSがクリーンです！");
  process.exit(0);
}
