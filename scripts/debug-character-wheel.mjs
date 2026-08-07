/**
 * Coffee Character Wheel デバッグ SVG 生成スクリプト
 *
 * extract-character-wheel.mjs と同じ解析ロジックを使い、
 * 「groupTransform + pathLocalTransform を適用した後の姿」を
 * 静的 SVG として書き出す。ZoomableWheel と同一の描画をテキストで確認可能。
 *
 * Usage: node scripts/debug-character-wheel.mjs
 * 出力:  public/character-wheel-debug.svg
 *        public/character-wheel-debug-{0..7}.svg  (オクタント別)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const svgPath = path.join(
  repoRoot,
  "7i4Hvu-Coffee-Character-Wheel-Poster-PDF.svg",
);
const outDir = path.join(repoRoot, "public");
const outFull = path.join(outDir, "character-wheel-debug.svg");

// ─── shared utils (extract-character-wheel.mjs と同じ) ───────────────────────

const FALLBACK_CLIP = {
  minX: 28.6382,
  maxX: 559.883,
  minY: 231.534,
  maxY: 706.727,
};
const FALLBACK_WORLD = {
  scaleX: 1.3333333,
  scaleY: 1.3333333,
  flipY: true,
  tx: 0,
  ty: 1122.52,
};
/** ホイール下端のティックとラベルが clipPath の矩形からはみ出す分の余白 */
const CLIP_PAD = 80;

let CLIP = FALLBACK_CLIP;
let worldParams = FALLBACK_WORLD;
let hubPdf = { x: 0, y: 0 };
let hubW = { x: 0, y: 0 };

function pdfToWorld(px, py) {
  const x = worldParams.scaleX * px + worldParams.tx;
  const y =
    (worldParams.flipY ? -worldParams.scaleY : worldParams.scaleY) * py +
    worldParams.ty;
  return { x, y };
}

function inClipPdf(tx, ty) {
  return (
    tx >= CLIP.minX - CLIP_PAD &&
    tx <= CLIP.maxX + CLIP_PAD &&
    ty >= CLIP.minY - CLIP_PAD &&
    ty <= CLIP.maxY + CLIP_PAD
  );
}

function parseWheelClipFromSvg(svg) {
  const block = svg.match(/id=["']clipPath1982["'][\s\S]*?<\/clipPath>/i);
  if (!block) return null;
  const dMatch = block[0].match(/\bd=["']([^"']+)["']/i);
  if (!dMatch) return null;
  const d = dMatch[1].trim();
  const rect = d.match(
    /M\s*([\d.]+)\s*,\s*([\d.]+)\s+H\s*([\d.]+)\s+V\s*([\d.]+)/i,
  );
  if (!rect) return null;
  const [, x1, y1, x2, y2] = rect.map(Number);
  return {
    minX: Math.min(x1, x2),
    maxX: Math.max(x1, x2),
    minY: Math.min(y1, y2),
    maxY: Math.max(y1, y2),
  };
}

function parseRootMatrixFromSvg(svg) {
  const m = svg.match(
    /matrix\(\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*\)/,
  );
  if (!m) return null;
  const [, a, b, c, d, e, f] = m.map(Number);
  if (Number.isNaN(a) || Number.isNaN(d)) return null;
  if (Math.abs(b) > 1e-5 || Math.abs(c) > 1e-5) return null;
  return { scaleX: a, scaleY: Math.abs(d), flipY: d < 0, tx: e, ty: f };
}

function hexToRgb(style) {
  const m = style.match(/fill:\s*#([0-9a-fA-F]{6})\b/);
  if (!m) return "rgb(128,128,128)";
  const [r, g, b] = [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)].map(
    (h) => parseInt(h, 16),
  );
  return `rgb(${r},${g},${b})`;
}

function parsePathHex(style) {
  const m = style.match(/fill:\s*#([0-9a-fA-F]{6})\b/i);
  return m ? m[1].toLowerCase() : null;
}

function parseFilledPaths(svg) {
  const paths = [];
  const re =
    /<g\b[\s\S]*?\btransform="translate\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)"[\s\S]*?>\s*<path\b([^>]*)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const tx = Number(m[1]),
      ty = Number(m[2]);
    const attrs = m[3];
    const dm = attrs.match(/\bd="([^"]+)"/);
    if (!dm) continue;
    const d = dm[1];
    let style = "";
    const styleMatch = attrs.match(/\bstyle="([^"]*)"/);
    if (styleMatch) style = styleMatch[1];
    const fillAttr = attrs.match(/\bfill="([^"]+)"/);
    if (fillAttr && !/fill\s*:/i.test(style))
      style = `${style ? `${style};` : ""}fill:${fillAttr[1]}`;
    if (!/fill:\s*#/.test(style)) continue;
    if (/fill:\s*none/i.test(style)) continue;
    if (/fill:url/i.test(style)) continue;
    if (!inClipPdf(tx, ty)) continue;
    paths.push({ tx, ty, style, d });
  }
  return paths;
}

function parseTexts(svg) {
  const texts = [];
  const parts = svg.split("<text");
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const tm = chunk.match(/transform="matrix\(([^)]+)\)"/);
    if (!tm) continue;
    const nums = tm[1].split(/[\s,]+/).map(Number);
    if (nums.length < 6 || nums.some((n) => Number.isNaN(n))) continue;
    const [, , , , ex, ey] = nums;
    if (!inClipPdf(ex, ey)) continue;
    const tspans = [...chunk.matchAll(/<tspan[^>]*>([^<]*)</g)].map((x) =>
      x[1].trim(),
    );
    const label = tspans.join(" ").replace(/\s+/g, " ").trim();
    if (label.length < 2 || label.length > 42) continue;
    if (/was developed|collaboration|Australian coffee industry/i.test(label))
      continue;
    if (/^(Cofee|Coffee) Character Wheel$/i.test(label)) continue;
    texts.push({ ex, ey, nums, label });
  }
  return texts;
}

function distPdf(tx, ty, t) {
  return Math.hypot(tx - t.ex, ty - t.ey);
}

function hubAnglePdf(tx, ty) {
  return Math.atan2(ty - hubPdf.y, tx - hubPdf.x);
}

function angleDiffRad(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

// ─── メイン ──────────────────────────────────────────────────────────────────

function main() {
  const svg = fs.readFileSync(svgPath, "utf8");

  CLIP = parseWheelClipFromSvg(svg) ?? FALLBACK_CLIP;
  worldParams = parseRootMatrixFromSvg(svg) ?? FALLBACK_WORLD;
  hubPdf = { x: (CLIP.minX + CLIP.maxX) / 2, y: (CLIP.minY + CLIP.maxY) / 2 };
  hubW = pdfToWorld(hubPdf.x, hubPdf.y);

  const scaleX = worldParams.scaleX;
  const scaleY = worldParams.scaleY;

  const rawPaths = parseFilledPaths(svg);
  const texts = parseTexts(svg);

  const clipWidth = CLIP.maxX - CLIP.minX;
  const matchRadius = Math.min(150, Math.max(88, clipWidth * 0.22));

  // ─ 簡易ラベルマッチ（greedy; LENGTH 3枚は雑割り当てで構わない）
  const pairs = [];
  for (let pi = 0; pi < rawPaths.length; pi++) {
    const p = rawPaths[pi];
    for (const t of texts) {
      const dd = distPdf(p.tx, p.ty, t);
      if (dd <= matchRadius) pairs.push({ pi, t, d: dd });
    }
  }
  pairs.sort((a, b) => {
    const dd = a.d - b.d;
    if (Math.abs(dd) > 4) return dd;
    return (
      Math.abs(
        angleDiffRad(
          hubAnglePdf(rawPaths[a.pi].tx, rawPaths[a.pi].ty),
          hubAnglePdf(a.t.ex, a.t.ey),
        ),
      ) -
      Math.abs(
        angleDiffRad(
          hubAnglePdf(rawPaths[b.pi].tx, rawPaths[b.pi].ty),
          hubAnglePdf(b.t.ex, b.t.ey),
        ),
      )
    );
  });
  const pathUsed = new Set();
  const labelUsed = new Set();
  /** @type {Map<number, string>} */
  const nameMap = new Map();
  for (const x of pairs) {
    const tKey = `${x.t.ex},${x.t.ey}`;
    if (pathUsed.has(x.pi) || labelUsed.has(tKey)) continue;
    pathUsed.add(x.pi);
    labelUsed.add(tKey);
    nameMap.set(x.pi, x.t.label);
  }

  // ─ 全セグメントを screen 座標に変換して SVG 化
  // pathLocalTransform: matrix(scaleX,0,0,-scaleY,0,0)
  const pathMatrix = `matrix(${scaleX},0,0,${-scaleY},0,0)`;

  const entries = rawPaths.map((p, i) => {
    const pw = pdfToWorld(p.tx, p.ty);
    const relPx = pw.x - hubW.x;
    const relPy = pw.y - hubW.y;
    const name = nameMap.get(i) ?? "";
    const color = hexToRgb(p.style);
    const hex = parsePathHex(p.style) ?? "808080";
    const dx = p.tx - hubPdf.x;
    const dy = p.ty - hubPdf.y;
    const r = Math.hypot(dx, dy);
    const oct = Math.floor(
      (((Math.atan2(dy, dx) + Math.PI) * 8) / (2 * Math.PI)) % 8,
    );
    return { i, relPx, relPy, d: p.d, name, color, hex, r, oct };
  });

  let maxAbs = 40;
  for (const e of entries)
    maxAbs = Math.max(maxAbs, Math.abs(e.relPx), Math.abs(e.relPy));
  const pad = 40;
  const vb = Math.ceil(maxAbs + pad);
  const size = vb * 2;

  // ─ 全体 SVG
  writeSvg(outFull, entries, size, pathMatrix, "ALL segments");
  console.log(`wrote ${outFull}`);

  // ─ オクタント別 (0〜7)
  const octNames = [
    "Oct0(E)",
    "Oct1(NE)",
    "Oct2(N)",
    "Oct3(NW)",
    "Oct4(W)",
    "Oct5(SW)",
    "Oct6(S)",
    "Oct7(SE)",
  ];
  for (let oct = 0; oct < 8; oct++) {
    const sub = entries.filter((e) => e.oct === oct);
    if (sub.length === 0) continue;
    const outOct = path.join(outDir, `character-wheel-debug-oct${oct}.svg`);
    writeSvg(outOct, sub, size, pathMatrix, octNames[oct]);
    console.log(`wrote ${outOct}  (${sub.length} segments)`);
  }

  // ─ ラベルありセグメント一覧を標準出力
  console.log("\n=== Named segments ===");
  for (const e of entries) {
    if (e.name) {
      console.log(
        `pdf-${e.i}  oct=${e.oct}  r=${e.r.toFixed(1).padStart(6)}` +
          `  groupXY=(${e.relPx.toFixed(1)},${e.relPy.toFixed(1)})` +
          `  hex=#${e.hex}  "${e.name}"`,
      );
    }
  }
  console.log("\n=== Unlabeled segments ===");
  for (const e of entries) {
    if (!e.name) {
      console.log(
        `pdf-${e.i}  oct=${e.oct}  r=${e.r.toFixed(1).padStart(6)}  hex=#${e.hex}`,
      );
    }
  }
}

/**
 * セグメントのリストを受け取り、groupTransform + pathLocalTransform を適用した SVG を書く。
 * テキストラベルと中心マーカー + 八方位ガイドラインを追加。
 */
function writeSvg(outPath, entries, size, pathMatrix, title) {
  const half = size / 2;
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-${half} -${half} ${size} ${size}">`,
  );
  lines.push(`  <title>${escXml(title)}</title>`);

  // 背景
  lines.push(
    `  <rect x="-${half}" y="-${half}" width="${size}" height="${size}" fill="#1a1a2e"/>`,
  );

  // ガイドライン (八方位)
  const guideDist = half * 0.95;
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI * 2) / 8;
    const x2 = (Math.cos(ang) * guideDist).toFixed(1);
    const y2 = (Math.sin(ang) * guideDist).toFixed(1);
    lines.push(
      `  <line x1="0" y1="0" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="0.5"/>`,
    );
  }

  // 同心円 (r=50,100,150,...)
  for (let r = 50; r <= half; r += 50) {
    lines.push(
      `  <circle cx="0" cy="0" r="${r}" fill="none" stroke="#333" stroke-width="0.5"/>`,
    );
  }

  // 各セグメント
  for (const e of entries) {
    lines.push(`  <!-- pdf-${e.i} oct=${e.oct} name="${escXml(e.name)}" -->`);
    lines.push(
      `  <g transform="translate(${e.relPx.toFixed(4)},${e.relPy.toFixed(4)})">`,
    );
    lines.push(`    <g transform="${pathMatrix}">`);
    lines.push(
      `      <path d="${escXml(e.d)}" fill="${e.color}" fill-opacity="0.85" stroke="#fff" stroke-width="0.3"/>`,
    );
    lines.push(`    </g>`);

    // ラベル: groupTransform 直下（pathMatrix の外側）に配置
    if (e.name) {
      lines.push(
        `    <text x="0" y="0" font-size="6" fill="#fff" text-anchor="middle" dominant-baseline="central"` +
          ` font-family="sans-serif" paint-order="stroke" stroke="#000" stroke-width="1.5">${escXml(e.name)}</text>`,
      );
    }
    // 小さいドット：アンカーポイント確認用
    lines.push(
      `    <circle cx="0" cy="0" r="1.5" fill="#ff0" fill-opacity="0.8"/>`,
    );
    lines.push(`  </g>`);
  }

  // 中心マーカー
  lines.push(`  <circle cx="0" cy="0" r="3" fill="#fff" fill-opacity="0.6"/>`);
  lines.push(
    `  <line x1="-${half}" y1="0" x2="${half}" y2="0" stroke="#555" stroke-width="0.3" stroke-dasharray="4,4"/>`,
  );
  lines.push(
    `  <line x1="0" y1="-${half}" x2="0" y2="${half}" stroke="#555" stroke-width="0.3" stroke-dasharray="4,4"/>`,
  );

  lines.push(`</svg>`);
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main();
