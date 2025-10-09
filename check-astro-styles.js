#!/usr/bin/env node

/**
 * .astroファイル内の<style>タグをチェックするスクリプト
 * Stylelintは.astro内のCSSをチェックできないため、手動で抽出してチェックする
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, "src");
const tempDir = path.join(__dirname, ".temp-astro-styles");

// 一時ディレクトリを作成
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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

  if (styles.trim()) {
    const relativePath = path.relative(__dirname, file);
    const tempCssFile = path.join(
      tempDir,
      `${path.basename(file, ".astro")}.css`,
    );

    fs.writeFileSync(tempCssFile, styles);

    try {
      execSync(`npx stylelint "${tempCssFile}"`, {
        stdio: "pipe",
        encoding: "utf-8",
      });
      console.log(`✅ ${relativePath}`);
    } catch (error) {
      hasErrors = true;
      console.log(`\n❌ ${relativePath}`);
      if (error.stdout) {
        console.log(error.stdout.toString());
      }
      if (error.stderr) {
        console.log(error.stderr.toString());
      }
    }
  }
}

// 一時ディレクトリを削除
fs.rmSync(tempDir, { recursive: true, force: true });

console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.log("❌ エラーが見つかりました");
  process.exit(1);
} else {
  console.log("✅ すべての.astroファイルのCSSがクリーンです！");
  process.exit(0);
}
