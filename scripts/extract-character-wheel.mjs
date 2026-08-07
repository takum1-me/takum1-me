/**
 * SVG + Coffee-Character-Wheel-Poster-PDF.html から ZoomableWheel 用セグメントを生成する。
 * Usage: node scripts/extract-character-wheel.mjs [path/to.svg]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const svgPath =
  process.argv[2] ??
  path.join(repoRoot, "7i4Hvu-Coffee-Character-Wheel-Poster-PDF.svg");
const htmlPath = path.join(repoRoot, "Coffee-Character-Wheel-Poster-PDF.html");
const outPath = path.join(repoRoot, "src/data/character-wheel-segments.ts");

/** PoPDF→SVG の典型的ルート行列・ホイール矩形（SVG に無いときのフォールバック） */
const FALLBACK_CLIP = {
  minX: 28.6382,
  maxX: 559.883,
  minY: 231.534,
  maxY: 706.727,
};

/**
 * clipPath1982 はホイール本体の矩形で、下端の外周ティックとその外側ラベル
 * （BALANCED / UNBALANCED / CLEAN … PUCKERING）がわずかにはみ出す。
 * 素の矩形で切ると 4 本組のティックが 2 本欠け、外周ラベルが 9 個消えるため、
 * 判定時だけ余白を足す。ポスター内で translate(...)+path 構造を持つのは
 * ホイールだけなので、この余白でタイトル・ロゴ・注釈を拾うことはない。
 */
const CLIP_PAD = 80;
const FALLBACK_WORLD = {
  scaleX: 1.3333333,
  scaleY: 1.3333333,
  flipY: true,
  tx: 0,
  ty: 1122.52,
};

/** @type {typeof FALLBACK_CLIP} */
let CLIP = FALLBACK_CLIP;
/** @type {typeof FALLBACK_WORLD} */
let worldParams = FALLBACK_WORLD;
/** @type {{ x: number; y: number }} */
let hubPdf = { x: 0, y: 0 };
/** @type {{ x: number; y: number }} */
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

/**
 * clipPath1982 の矩形（ホイールの論理座標系と一致）
 * @returns {typeof FALLBACK_CLIP | null}
 */
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
  const x1 = Number(rect[1]);
  const y1 = Number(rect[2]);
  const x2 = Number(rect[3]);
  const y2 = Number(rect[4]);
  return {
    minX: Math.min(x1, x2),
    maxX: Math.max(x1, x2),
    minY: Math.min(y1, y2),
    maxY: Math.max(y1, y2),
  };
}

/**
 * ルート &lt;g transform="matrix(a,b,c,d,e,f)"&gt;（PoPDF 経由の軸スケール・Y反転）
 * @returns {typeof FALLBACK_WORLD | null}
 */
function parseRootMatrixFromSvg(svg) {
  const m = svg.match(
    /matrix\(\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*\)/,
  );
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  const e = Number(m[5]);
  const f = Number(m[6]);
  if (Number.isNaN(a) || Number.isNaN(d)) return null;
  if (Math.abs(b) > 1e-5 || Math.abs(c) > 1e-5) return null;
  const scaleX = a;
  const scaleY = Math.abs(d);
  const flipY = d < 0;
  return { scaleX, scaleY, flipY, tx: e, ty: f };
}

function hexToRgb(style) {
  const m = style.match(/fill:\s*#([0-9a-fA-F]{6})\b/);
  if (!m) return "rgb(128, 128, 128)";
  const h = m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function luminance(rgb) {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return 0;
  const [r, g, b] = m.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function pickTextColor(bg) {
  return luminance(bg) > 0.62 ? "rgb(51, 51, 51)" : "rgb(255, 255, 255)";
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** #RGB / #RRGGBB / black / white → rgb(...) */
function cssColorToRgb(css) {
  let s = css.trim();
  if (/^black$/i.test(s)) return "rgb(0, 0, 0)";
  if (/^white$/i.test(s)) return "rgb(255, 255, 255)";
  if (s === "#FFF") s = "#FFFFFF";
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    if (h.length !== 6) return "rgb(255, 255, 255)";
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return "rgb(255, 255, 255)";
}

/**
 * HTML のスタイルと段落順から、ラベル文字列ごとの色キュー（出現順）を構築する。
 * @returns {{ queues: Map<string, string[]>; defaultParagraphRgb: string }}
 */
function parseHtmlLabelColorQueues(htmlContent) {
  const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : "";
  /** @type {Record<string, string>} */
  const classColors = {};
  for (const m of css.matchAll(/\.(s\d+)\s*\{[^}]*color:\s*([^;]+)/gi)) {
    classColors[m[1]] = m[2].trim();
  }
  const pRule = css.match(/\bp\s*\{([^}]*)\}/im);
  let defaultCss = "#FFFFFF";
  if (pRule) {
    const cm = pRule[1].match(/color:\s*([^;]+)/i);
    if (cm) defaultCss = cm[1].trim();
  }

  /** @type {Map<string, string[]>} */
  const queues = new Map();
  const paraRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = paraRe.exec(htmlContent))) {
    const full = pm[0];
    const inner = pm[1];
    if (/<span|<img/i.test(inner)) continue;
    let text = decodeEntities(inner.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 2 || text.length > 42) continue;
    if (/^coffee character wheel$/i.test(text)) continue;
    if (/^the coffee character wheel was developed/i.test(text)) continue;

    const clsM = full.match(/class="(s\d+)"/i);
    const cssCol =
      clsM && classColors[clsM[1]] ? classColors[clsM[1]] : defaultCss;
    const rgb = cssColorToRgb(cssCol);
    if (!queues.has(text)) queues.set(text, []);
    queues.get(text).push(rgb);
  }
  return { queues, defaultParagraphRgb: cssColorToRgb(defaultCss) };
}

function cloneQueues(/** @type {Map<string, string[]>} */ q) {
  return new Map([...q.entries()].map(([k, v]) => [k, [...v]]));
}

function shiftQueue(/** @type {Map<string, string[]>} */ queues, label) {
  const arr = queues.get(label);
  if (!arr || !arr.length) return null;
  return arr.shift() ?? null;
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

    const styleMatch = chunk.match(/style="([^"]*)"/);
    const style = styleMatch ? styleMatch[1] : "";

    const tspans = [...chunk.matchAll(/<tspan[^>]*>([^<]*)</g)].map((x) =>
      x[1].trim(),
    );
    const label = tspans.join(" ").replace(/\s+/g, " ").trim();
    if (label.length < 2 || label.length > 42) continue;
    if (/was developed|collaboration|Australian coffee industry/i.test(label))
      continue;
    if (/^(Cofee|Coffee) Character Wheel$/i.test(label)) continue;

    texts.push({ ex, ey, nums, label, style });
  }
  return texts;
}

function parseFilledPaths(svg) {
  const paths = [];
  /** id が先でもよい。stroke 用の二重 &lt;g&gt; は fill:none で除外 */
  const re =
    /<g\b[\s\S]*?\btransform="translate\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)"[\s\S]*?>\s*<path\b([^>]*)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const tx = Number(m[1]);
    const ty = Number(m[2]);
    const attrs = m[3];
    const dm = attrs.match(/\bd="([^"]+)"/);
    if (!dm) continue;
    const d = dm[1];
    let style = "";
    const styleMatch = attrs.match(/\bstyle="([^"]*)"/);
    if (styleMatch) style = styleMatch[1];
    const fillAttr = attrs.match(/\bfill="([^"]+)"/);
    if (fillAttr && !/fill\s*:/i.test(style)) {
      style = `${style ? `${style};` : ""}fill:${fillAttr[1]}`;
    }
    if (!/fill:\s*#/.test(style)) continue;
    if (/fill:\s*none/i.test(style)) continue;
    if (/fill:url/i.test(style)) continue;
    if (!inClipPdf(tx, ty)) continue;
    paths.push({ tx, ty, style, d });
  }
  return paths;
}

function distPdf(tx, ty, t) {
  return Math.hypot(tx - t.ex, ty - t.ey);
}

/** a−b を (−π, π] に正規化 */
function angleDiffRad(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** SVG path d を粗サンプル（内／外弧判定・外周ラベル用） */
function samplePathPoints(d) {
  let x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  /** @type {{ x: number; y: number }[]} */
  const pts = [{ x: 0, y: 0 }];
  let i = 0;
  const len = d.length;

  function skipWs() {
    while (i < len && /[\s,]/.test(d[i])) i++;
  }

  function readNumber() {
    skipWs();
    const start = i;
    if (i >= len) return NaN;
    if (d[i] === "+" || d[i] === "-") i++;
    while (i < len && /[0-9.eE+-]/.test(d[i])) i++;
    return parseFloat(d.slice(start, i));
  }

  /** @type {string} */
  let cmd = "";

  while (i < len) {
    skipWs();
    if (i >= len) break;
    if (/[MmLlHhVvCcZz]/.test(d[i])) {
      cmd = d[i++];
    }
    if (!cmd) {
      i++;
      continue;
    }

    const uc = cmd.toUpperCase();
    const rel = cmd !== uc;

    const nx = (vx) => (rel ? x + vx : vx);
    const ny = (vy) => (rel ? y + vy : vy);

    switch (uc) {
      case "M": {
        let first = true;
        while (i < len) {
          skipWs();
          if (i >= len || !/[0-9+\-.]/.test(d[i])) break;
          x = nx(readNumber());
          y = ny(readNumber());
          if (first) {
            sx = x;
            sy = y;
            first = false;
          }
          pts.push({ x, y });
        }
        cmd = rel ? "l" : "L";
        break;
      }
      case "L": {
        while (i < len) {
          skipWs();
          if (i >= len || !/[0-9+\-.]/.test(d[i])) break;
          x = nx(readNumber());
          y = ny(readNumber());
          pts.push({ x, y });
        }
        break;
      }
      case "H": {
        while (i < len) {
          skipWs();
          if (i >= len || !/[0-9+\-.]/.test(d[i])) break;
          x = nx(readNumber());
          pts.push({ x, y });
        }
        break;
      }
      case "V": {
        while (i < len) {
          skipWs();
          if (i >= len || !/[0-9+\-.]/.test(d[i])) break;
          y = ny(readNumber());
          pts.push({ x, y });
        }
        break;
      }
      case "C": {
        while (i < len) {
          skipWs();
          if (i >= len || !/[0-9+\-.]/.test(d[i])) break;
          const x0 = x,
            y0 = y;
          const x1 = nx(readNumber()),
            y1 = ny(readNumber());
          const x2 = nx(readNumber()),
            y2 = ny(readNumber());
          x = nx(readNumber());
          y = ny(readNumber());
          const samples = 14;
          for (let s = 1; s <= samples; s++) {
            const u = s / samples,
              o = 1 - u;
            pts.push({
              x:
                o ** 3 * x0 +
                3 * o ** 2 * u * x1 +
                3 * o * u ** 2 * x2 +
                u ** 3 * x,
              y:
                o ** 3 * y0 +
                3 * o ** 2 * u * y1 +
                3 * o * u ** 2 * y2 +
                u ** 3 * y,
            });
          }
        }
        break;
      }
      case "Z": {
        x = sx;
        y = sy;
        pts.push({ x, y });
        cmd = "";
        break;
      }
      default:
        cmd = "";
        i++;
    }
  }

  return pts;
}

/**
 * PDF ローカル座標 (x,y) をハブ基準スクリーン座標に変換する。
 * groupTransform で使った (relPx, relPy) はすでにスクリーン空間なので、
 * path の局所オフセットには root matrix (scaleX, flipY) を適用する。
 */
function pdfLocalToHubRelScreen(relPx, relPy, localX, localY) {
  return {
    hx: relPx + worldParams.scaleX * localX,
    hy: relPy - worldParams.scaleY * localY,
  };
}

/** ハブ基準スクリーン座標でのパス外形（ポリゴン近似） */
function pathPolygonHubRel(p) {
  const pw = pdfToWorld(p.tx, p.ty);
  const relPx = pw.x - hubW.x;
  const relPy = pw.y - hubW.y;
  return samplePathPoints(p.d).map(({ x, y }) =>
    pdfLocalToHubRelScreen(relPx, relPy, x, y),
  );
}

/** ray casting による点の内包判定（ハブ基準スクリーン座標） */
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].hx;
    const yi = poly[i].hy;
    const xj = poly[j].hx;
    const yj = poly[j].hy;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** shoelace 面積（絶対値） */
function polygonArea(poly) {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += poly[j].hx * poly[i].hy - poly[i].hx * poly[j].hy;
  }
  return Math.abs(sum) / 2;
}

/**
 * ポリゴンの角度スパン（円環対応: 頂点角の最大空隙の補集合）と半径範囲。
 * ラベルの角度内包判定・親子の扇の重なり判定に使う。
 */
function angularRadialRange(poly) {
  const angs = poly
    .map(({ hx, hy }) => Math.atan2(hy, hx))
    .sort((a, b) => a - b);
  let rMin = Infinity;
  let rMax = 0;
  for (const { hx, hy } of poly) {
    const r = Math.hypot(hx, hy);
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
  }
  let maxGap = angs[0] + 2 * Math.PI - angs[angs.length - 1];
  let spanStart = angs[0];
  for (let i = 1; i < angs.length; i++) {
    const gap = angs[i] - angs[i - 1];
    if (gap > maxGap) {
      maxGap = gap;
      spanStart = angs[i];
    }
  }
  return { spanStart, spanWidth: 2 * Math.PI - maxGap, rMin, rMax };
}

/**
 * レイ（角度 angRad）に沿ってハブ側から進み、ポリゴンに入る最初の半径を返す。
 * 中央の白いカップ形状の切り欠きや、ホイール本体から分離された扇でも
 * 「そのウェッジが実際に始まる位置」からラベルを書き始められる。
 */
function wedgeEntryRadius(poly, angRad, rMin, rMax) {
  const cos = Math.cos(angRad);
  const sin = Math.sin(angRad);
  for (let r = Math.max(20, rMin - 2); r <= rMax; r += 2) {
    if (pointInPolygon(cos * r, sin * r, poly)) return r;
  }
  return rMin;
}

/**
 * wedgeEntryRadius で求めた入口から外へ進み、ポリゴンを出る直前の半径を返す。
 * ウェッジの径方向の厚みが分かるので、ラベルをその中央に置ける。
 */
function wedgeExitRadius(poly, angRad, rEntry, rMax) {
  const cos = Math.cos(angRad);
  const sin = Math.sin(angRad);
  let last = rEntry;
  for (let r = rEntry; r <= rMax + 2; r += 2) {
    if (!pointInPolygon(cos * r, sin * r, poly)) break;
    last = r;
  }
  return last;
}

/** 角度 ang（rad）がスパン内にあるか（tol は両端の許容, rad） */
function angleInSpan(ang, range, tol) {
  let d = ang - range.spanStart;
  while (d < 0) d += 2 * Math.PI;
  while (d >= 2 * Math.PI) d -= 2 * Math.PI;
  return d <= range.spanWidth + tol || d >= 2 * Math.PI - tol;
}

/** 2 つの角度スパンの重なり（rad） */
function spanOverlap(a, b) {
  let rel = b.spanStart - a.spanStart;
  rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let ov = 0;
  if (rel < a.spanWidth) {
    ov += Math.min(a.spanWidth, rel + b.spanWidth) - rel;
  }
  const wrap = rel + b.spanWidth - 2 * Math.PI;
  if (wrap > 0) ov += Math.min(a.spanWidth, wrap);
  return ov;
}

function main() {
  const svg = fs.readFileSync(svgPath, "utf8");

  CLIP = parseWheelClipFromSvg(svg) ?? FALLBACK_CLIP;
  worldParams = parseRootMatrixFromSvg(svg) ?? FALLBACK_WORLD;
  hubPdf = {
    x: (CLIP.minX + CLIP.maxX) / 2,
    y: (CLIP.minY + CLIP.maxY) / 2,
  };
  hubW = pdfToWorld(hubPdf.x, hubPdf.y);
  console.log(
    `Wheel clip (PDF space): [${CLIP.minX}, ${CLIP.minY}]–[${CLIP.maxX}, ${CLIP.maxY}] · scaleX=${worldParams.scaleX} flipY=${worldParams.flipY}`,
  );

  let htmlQueues = new Map();
  if (fs.existsSync(htmlPath)) {
    const parsed = parseHtmlLabelColorQueues(fs.readFileSync(htmlPath, "utf8"));
    htmlQueues = parsed.queues;
  } else {
    console.warn("Missing HTML palette:", htmlPath);
  }

  const rawPaths = parseFilledPaths(svg);
  const texts = parseTexts(svg).map((t, li) => ({ ...t, li }));

  // "MOUTH-DRYING" はポスターで "MOUTH-" と "DRYING" の 2 つの <text> に
  // 分かれている。断片のままだと同じウェッジを取り合って片方が消えるため、
  // 直近の DRYING と統合して 1 ラベルにする。
  const mouthFrag = texts.find((t) => t.label === "MOUTH-");
  if (mouthFrag) {
    const continuation = texts
      .filter((t) => t.label === "DRYING")
      .sort(
        (a, b) =>
          distPdf(mouthFrag.ex, mouthFrag.ey, a) -
          distPdf(mouthFrag.ex, mouthFrag.ey, b),
      )[0];
    if (
      continuation &&
      distPdf(mouthFrag.ex, mouthFrag.ey, continuation) < 20
    ) {
      mouthFrag.label = "MOUTH-DRYING";
      mouthFrag.ex = (mouthFrag.ex + continuation.ex) / 2;
      mouthFrag.ey = (mouthFrag.ey + continuation.ey) / 2;
      texts.splice(texts.indexOf(continuation), 1);
    }
  }

  // ポスターの白ラベルは擬似ボールドのため同位置に二重描画されている
  // （WEIGHT / VISCOSITY 等）。残すと余った複製がティックバーを誤取得して
  // 迷子ラベルになるので、同一文字列・近接位置の複製を除去する。
  for (let i = texts.length - 1; i >= 1; i--) {
    const t = texts[i];
    const isDup = texts.some(
      (u, j) => j < i && u.label === t.label && distPdf(t.ex, t.ey, u) < 4,
    );
    if (isDup) texts.splice(i, 1);
  }

  const matchTexts = texts;

  // パスごとのハブ基準スクリーン座標ジオメトリ
  const polys = rawPaths.map((p) => pathPolygonHubRel(p));
  const polyAreas = polys.map((poly) => polygonArea(poly));
  const polyRanges = polys.map((poly) => angularRadialRange(poly));

  /** li → ハブ基準スクリーン座標のラベル位置 */
  const labelPos = new Map();
  for (const t of matchTexts) {
    const lw = pdfToWorld(t.ex, t.ey);
    const lx = lw.x - hubW.x;
    const ly = lw.y - hubW.y;
    labelPos.set(t.li, {
      lx,
      ly,
      ang: Math.atan2(ly, lx),
      rad: Math.hypot(lx, ly),
    });
  }

  const pathUsed = new Set();
  const labelUsed = new Set();
  /** @type {Map<number, { label: string; nums: number[]; style: string; ex: number; ey: number; li?: number }>} */
  const assign = new Map();
  /** Phase 1（ウェッジ内包）で決まったラベル = ウェッジ内に描くラベル */
  const insideLabelPis = new Set();

  // ── Phase 1: ラベルのアンカー点を内包するウェッジへ（面積の小さい順に確定） ──
  // アンカー距離のグリーディだと大ウェッジほど誤マッチする（ACIDITY が別の
  // 小ウェッジへ付く等）ため、実ジオメトリの内包判定で結び付ける。
  const containPairs = [];
  for (let pi = 0; pi < rawPaths.length; pi++) {
    for (const t of matchTexts) {
      const lp = labelPos.get(t.li);
      if (pointInPolygon(lp.lx, lp.ly, polys[pi])) {
        containPairs.push({ pi, t, area: polyAreas[pi] });
      }
    }
  }
  containPairs.sort((a, b) => a.area - b.area);
  for (const x of containPairs) {
    if (pathUsed.has(x.pi) || labelUsed.has(x.t.li)) continue;
    pathUsed.add(x.pi);
    labelUsed.add(x.t.li);
    assign.set(x.pi, x.t);
    insideLabelPis.add(x.pi);
  }

  // ── Phase 2: 内包で決まらないラベル（外周ティック等）は角度スパン内で半径ギャップ最小 ──
  const gapPairs = [];
  for (let pi = 0; pi < rawPaths.length; pi++) {
    if (pathUsed.has(pi)) continue;
    const range = polyRanges[pi];
    for (const t of matchTexts) {
      if (labelUsed.has(t.li)) continue;
      const lp = labelPos.get(t.li);
      if (!angleInSpan(lp.ang, range, 0.02)) continue;
      // 左側の長い外周ラベル（STONE FRUIT-LIKE 等）はアンカーがテキストの
      // 遠端にあり、ティック弧から 100 以上離れることがある
      const gap = Math.max(0, range.rMin - lp.rad, lp.rad - range.rMax);
      if (gap <= 150) gapPairs.push({ pi, t, gap });
    }
  }
  gapPairs.sort((a, b) => a.gap - b.gap);
  for (const x of gapPairs) {
    if (pathUsed.has(x.pi) || labelUsed.has(x.t.li)) continue;
    pathUsed.add(x.pi);
    labelUsed.add(x.t.li);
    assign.set(x.pi, x.t);
  }

  for (const t of matchTexts) {
    if (!labelUsed.has(t.li)) {
      console.warn(`No wedge matched label "${t.label}" (li=${t.li})`);
      if (process.env.DEBUG_LABELS) {
        const lp = labelPos.get(t.li);
        console.warn(
          `  label at ang=${((lp.ang * 180) / Math.PI).toFixed(1)}° rad=${lp.rad.toFixed(1)}`,
        );
        for (let pi = 0; pi < rawPaths.length; pi++) {
          const range = polyRanges[pi];
          if (!angleInSpan(lp.ang, range, 0.05)) continue;
          const gap = Math.max(0, range.rMin - lp.rad, lp.rad - range.rMax);
          const owner = assign.get(pi);
          console.warn(
            `  cand pdf-${pi} r=[${range.rMin.toFixed(0)},${range.rMax.toFixed(0)}] gap=${gap.toFixed(1)} used=${pathUsed.has(pi)} owner=${owner ? owner.label : "-"}`,
          );
        }
      }
    }
  }

  // HTML の色キューはポスター内の出現順（<text> の登場順）に消費する
  /** @type {{ pi: number; label: string }[]} */
  const assignmentLog = [...assign.entries()]
    .map(([pi, t]) => ({
      pi,
      label: t.label,
      li: t.li ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.li - b.li);

  const qHtml = cloneQueues(htmlQueues);
  /** @type {Map<number, string>} */
  const pathTextColor = new Map();
  for (const { pi, label } of assignmentLog) {
    const fromHtml = shiftQueue(qHtml, label);
    const fallback = pickTextColor(hexToRgb(rawPaths[pi].style));
    pathTextColor.set(pi, fromHtml ?? fallback);
  }
  /** @type {Array<Record<string, unknown>>} */
  const segments = rawPaths.map((p, i) => {
    const best = assign.get(i);
    const name = best ? best.label : "";

    const pw = pdfToWorld(p.tx, p.ty);
    const relPx = pw.x - hubW.x;
    const relPy = pw.y - hubW.y;

    let zoomAngleDeg = (Math.atan2(relPy, relPx) * 180) / Math.PI;

    let textTransform = "rotate(0)translate(0)rotate(0)";
    /** @type {"start" | "middle" | "end"} */
    let textAnchor = "start";
    const textColor = pathTextColor.get(i) ?? pickTextColor(hexToRgb(p.style));

    // ラベルはすべて Flavor Wheel と同じ「ハブ中心基準の放射状」レイアウトにする
    let textUsesPathLocalCoords = false;

    // ラベルの角度をポスターのラベル位置から算出（半径は後段で
    // Flavor Wheel と同じ規則により span から決める）
    let labelAngleDeg = 0;
    if (name && best) {
      const lw = pdfToWorld(best.ex, best.ey);
      const lx = lw.x - hubW.x;
      const ly = lw.y - hubW.y;
      labelAngleDeg = (Math.atan2(ly, lx) * 180) / Math.PI;
      zoomAngleDeg = labelAngleDeg;
    }

    const groupTransform = `translate(${relPx.toFixed(4)},${relPy.toFixed(4)})`;

    const dx = p.tx - hubPdf.x;
    const dy = p.ty - hubPdf.y;
    const r = Math.hypot(dx, dy);
    const oct = Math.floor(
      (((Math.atan2(dy, dx) + Math.PI) * 8) / (2 * Math.PI)) % 8,
    );

    /** @type {Record<string, unknown>} */
    const seg = {
      id: `pdf-${i}`,
      path: p.d,
      color: hexToRgb(p.style),
      name,
      textTransform,
      textAnchor,
      textColor,
      groupTransform,
      zoomAngleDeg,
      textUsesPathLocalCoords,
      r,
      oct,
      tx: p.tx,
      ty: p.ty,
      // ラベル配置用の中間値（depth 確定後に textTransform を決める）
      labelAngleDeg,
      labelInside: insideLabelPis.has(i),
      poly: polys[i],
      // 親子判定用の角度スパン（ハブ基準スクリーン座標）
      span: polyRanges[i],
    };
    return seg;
  });

  // ── 1. depth 割り当て ────────────────────────────────────────────────────
  // 「実カテゴリー名」が付いたウェッジは無条件で depth=1（ズームのルート）。
  // 無名は内側 (r_pdf < 139) のハブ装飾のみ depth=1。
  // SHORT/LONG/MEDIUM(LENGTH の目盛)・COFFEE ACID(ACIDITY の下位) は
  // カテゴリーではないため depth=1 にしない（外側として 2/3 に振る）。
  // OVERALL はホイール本体から分離された扇の中心なのでルート扱いにする。
  const R_D1_PDF = 139;
  const D1_CATEGORY_NAMES = new Set([
    "INTENSITY",
    "ACIDITY",
    "TEXTURE",
    "MOUTHFEEL",
    "LENGTH",
    "AFTERTASTE",
    "OVERALL",
  ]);
  for (const s of segments) {
    const innerCategory = s.name
      ? D1_CATEGORY_NAMES.has(s.name)
      : s.r < R_D1_PDF;
    s.depth = innerCategory ? 1 : undefined;
  }

  // 外側セグメントをオクタント別に分け、r 上位半数を depth=3、下位半数を depth=2 とする
  const outerByOct = Array.from({ length: 8 }, () => []);
  for (const s of segments) {
    if (s.depth === undefined) outerByOct[s.oct].push(s);
  }
  for (const list of outerByOct) {
    list.sort((a, b) => b.r - a.r);
    const half = Math.max(1, Math.floor(list.length / 2));
    list.forEach((s, idx) => {
      s.depth = idx < half ? 3 : 2;
    });
  }

  // ── 2. 扇の重なりによる parent 割り当て ──────────────────────────────────
  // アンカー点の角度最近傍だと BODY→AFTERTASTE のような取り違えが起きるため、
  // 「子の角度スパンを最も広く覆う候補」を親にする。重なりが小さいときのみ
  // 代表角（zoomAngleDeg = ラベル角 or アンカー角）の最近傍にフォールバック。
  const depth1Roots = segments.filter((s) => s.depth === 1 && s.name);
  const depth2Segs = segments.filter((s) => s.depth === 2);

  /** 代表角の差（スクリーン空間） */
  function angDiffForSeg(s, c) {
    return Math.abs(
      angleDiffRad(
        (s.zoomAngleDeg * Math.PI) / 180,
        (c.zoomAngleDeg * Math.PI) / 180,
      ),
    );
  }

  function nearestBySegAngle(s, candidates) {
    let best = null;
    let bestDiff = Infinity;
    for (const c of candidates) {
      const d = angDiffForSeg(s, c);
      if (d < bestDiff) {
        bestDiff = d;
        best = c;
      }
    }
    return best;
  }

  function pickParent(s, candidates) {
    let best = null;
    let bestOverlap = 0;
    for (const c of candidates) {
      const ov = spanOverlap(c.span, s.span);
      // ほぼ同率なら扇の狭い（より具体的な）候補を親にする
      // （例: ACIDITY の扇は INTENSITY の扇を丸ごと含むため）
      const tie =
        best !== null &&
        Math.abs(ov - bestOverlap) < 1e-6 &&
        c.span.spanWidth < best.span.spanWidth;
      if (ov > bestOverlap + 1e-6 || tie) {
        bestOverlap = ov;
        best = c;
      }
    }
    // 分離された扇（OVERALL 群）は視差で子の扇が親の扇より広がるため、
    // 重なりがわずかでもあれば最大重なりの候補を採用する
    if (best && bestOverlap > 1e-4) return best;
    return nearestBySegAngle(s, candidates);
  }

  for (const s of depth2Segs) {
    const p = pickParent(s, depth1Roots);
    if (p) s.parent = p.id;
  }
  for (const s of segments.filter((s) => s.depth === 3)) {
    const p2 = pickParent(s, depth2Segs);
    if (p2) {
      s.parent = p2.id;
    } else {
      const p1 = pickParent(s, depth1Roots);
      if (p1) s.parent = p1.id;
    }
  }

  // ── 3. ラベル配置（Flavor Wheel と同じ規則） ─────────────────────────────
  // 右半分: rotate(θ)translate(r)rotate(0) + anchor=start（半径 r から外向きに読む）
  // 左半分: rotate(θ)translate(r)rotate(-180) + anchor=end（180° 反転で正立・同じく外向き）
  // r は、ウェッジ内ラベル（Phase 1 で内包マッチ）ならそのウェッジの厚みの中央、
  // 外周ティックラベル（Phase 2）ならそのティック弧の外周 + 余白。
  // anchor=middle で中央置きすると語の内側半分が後描画のウェッジに隠れるため使わない。
  // 中央の白いカップ形状にラベルがかからない最小半径
  // （ポリゴンのベジェ粗サンプリングで entry が過小になる場合の保険）
  const HUB_CLEAR = 62;
  /** ラベルのおおよその字幅（component の CSS: d1=12px, それ以外=10px）。やや保守的に見積もる */
  const charW = (s) => (s.depth === 1 ? 7.9 : 6.9);

  // ウェッジ内ラベルはポスターのアンカーではなく扇の角度中心に置く。
  // ポスターのアンカーは 1 行目の書き出し位置なので、2 行ラベル
  // （HIGH COMPLEX / PHOSPHORIC ACID 等）だと中心から片側へ寄り、
  // 隣のウェッジのラベルと重なってしまう。
  for (const s of segments) {
    if (!s.name || !s.labelInside) continue;
    s.labelAngleDeg =
      ((s.span.spanStart + s.span.spanWidth / 2) * 180) / Math.PI;
  }

  // ラベルのレイ上でウェッジに入る半径／出る半径（＝そのラベルが使える径方向の幅）
  for (const s of segments) {
    if (!s.name || !s.labelInside) continue;
    const ang = (s.labelAngleDeg * Math.PI) / 180;
    const entry = wedgeEntryRadius(s.poly, ang, s.span.rMin, s.span.rMax);
    s.rayOut = wedgeExitRadius(s.poly, ang, entry, s.span.rMax);
    s.rayIn = Math.max(entry + 4, HUB_CLEAR);
  }

  /** 折り返し後の最長行の文字数（未折り返しなら全長） */
  const maxLineChars = (name) =>
    Math.max(
      ...String(name)
        .split("\n")
        .map((l) => l.length),
    );

  // ウェッジの径方向の深さに収まらないラベルはポスターと同様に 2 行へ折り返す
  // （PHOSPHORIC ACID / TARTARIC ACID 等。はみ出すと白文字が薄い背景に消える）
  for (const s of segments) {
    if (!s.name || !s.labelInside || !/\s/.test(s.name)) continue;
    const avail = s.rayOut - s.rayIn;
    if (String(s.name).length * charW(s) <= avail) continue;
    const words = String(s.name).split(" ");
    let best = 1;
    let bestDiff = Infinity;
    for (let k = 1; k < words.length; k++) {
      const left = words.slice(0, k).join(" ").length;
      const right = words.slice(k).join(" ").length;
      const diff = Math.abs(left - right);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = k;
      }
    }
    s.name = `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
  }

  // ウェッジ内ラベルは厚みの中央へ。折り返してもなお収まらない語
  // （PHOSPHORIC / ASTRINGENT 等）は内外へ同じだけはみ出させる。
  // 片側だけにはみ出させると白い隙間の上に白文字が乗って消える。
  // 外周ティックラベルはティック弧のすぐ外から書き始める。
  for (const s of segments) {
    if (!s.name) continue;
    if (!s.labelInside) {
      s.labelRadius = s.span.rMax + 8;
      continue;
    }
    const textLen = maxLineChars(s.name) * charW(s);
    const slack = s.rayOut - s.rayIn - textLen;
    s.labelRadius = Math.max(HUB_CLEAR, s.rayIn + slack / 2);
  }

  // ほぼ同一レイ上（角度差 4° 未満）で径方向に連続するウェッジ内ラベル
  // （AFTERTASTE→LENGTH 等）は、内側ラベルの末尾と重ならないよう外へずらす
  const insideLabeled = segments
    .filter((s) => s.name && s.labelInside)
    .sort((a, b) => a.labelRadius - b.labelRadius);
  for (let i = 0; i < insideLabeled.length; i++) {
    for (let j = 0; j < i; j++) {
      const outer = insideLabeled[i];
      const inner = insideLabeled[j];
      let dAng = Math.abs(outer.labelAngleDeg - inner.labelAngleDeg) % 360;
      if (dAng > 180) dAng = 360 - dAng;
      if (dAng > 4) continue;
      const innerEnd =
        inner.labelRadius + maxLineChars(inner.name) * charW(inner);
      if (outer.labelRadius < innerEnd + 4) outer.labelRadius = innerEnd + 4;
    }
  }

  for (const s of segments) {
    if (!s.name) continue;
    const ang = s.labelAngleDeg;
    const rightSide = Math.cos((ang * Math.PI) / 180) >= 0;
    s.textTransform = `rotate(${ang.toFixed(4)})translate(${s.labelRadius.toFixed(4)})rotate(${rightSide ? 0 : -180})`;
    s.textAnchor = rightSide ? "start" : "end";
    s.zoomAngleDeg = ang;
  }

  // ── 4. viewBox: セグメントとラベルの両方が収まるサイズを算出 ──────────────
  // ラベルは anchor=start/end なので labelRadius から外向きに全長ぶん伸びる。
  let maxAbs = 40;
  for (const s of segments) {
    const pw = pdfToWorld(s.tx, s.ty);
    maxAbs = Math.max(maxAbs, Math.abs(pw.x - hubW.x), Math.abs(pw.y - hubW.y));
    if (s.name) {
      const textLen = maxLineChars(s.name) * 7.2;
      maxAbs = Math.max(maxAbs, (s.labelRadius || 0) + textLen);
    }
  }

  const pad = 28;
  const vb = Math.ceil(maxAbs + pad) * 2;
  const viewBoxSize = Math.max(620, vb);

  const lines = [];
  lines.push(`import type { WheelSegment } from "./wheel-segment";`);
  lines.push(``);
  lines.push(`/**`);
  lines.push(
    ` * Coffee Character Wheel — SVG パス + Coffee-Character-Wheel-Poster-PDF.html の色指定。`,
  );
  lines.push(` * 再生成: node scripts/extract-character-wheel.mjs`);
  lines.push(` */`);
  lines.push(`export const characterWheelViewBoxSize = ${viewBoxSize};`);
  lines.push(``);
  /** pathLocalTransform: ZoomableWheel の pathLocalTransform プロップに渡す。
   * ルート matrix の scale + Y-flip を path 座標に適用して正しいスクリーン位置にする。 */
  const sx = worldParams.scaleX.toFixed(7);
  const sy = (-worldParams.scaleY).toFixed(7);
  lines.push(
    `/** SVG ルート matrix から算出したパスのローカル変換 (ZoomableWheel pathLocalTransform 用) */`,
  );
  lines.push(
    `export const characterWheelPathMatrix = "matrix(${sx},0,0,${sy},0,0)";`,
  );
  lines.push(``);
  lines.push(`export const characterWheelSegments: WheelSegment[] = [`);

  for (const s of segments) {
    const safePath = String(s.path).replace(/\\/g, "\\\\").replace(/`/g, "\\`");
    const parentLine =
      s.parent !== undefined ? `    parent: ${JSON.stringify(s.parent)},` : "";

    lines.push(`  {`);
    lines.push(`    id: ${JSON.stringify(s.id)},`);
    lines.push(`    path: \`${safePath}\`,`);
    lines.push(`    color: ${JSON.stringify(s.color)},`);
    lines.push(`    name: ${JSON.stringify(s.name)},`);
    lines.push(`    depth: ${s.depth},`);
    if (parentLine) lines.push(parentLine);
    lines.push(`    textTransform: ${JSON.stringify(s.textTransform)},`);
    lines.push(`    textAnchor: ${JSON.stringify(s.textAnchor)},`);
    lines.push(`    textColor: ${JSON.stringify(s.textColor)},`);
    lines.push(`    groupTransform: ${JSON.stringify(s.groupTransform)},`);
    lines.push(
      `    zoomAngleDeg: ${typeof s.zoomAngleDeg === "number" ? s.zoomAngleDeg.toFixed(6) : "undefined"},`,
    );
    if (s.textUsesPathLocalCoords === false) {
      lines.push(`    textUsesPathLocalCoords: false,`);
    }
    lines.push(`  },`);
  }
  lines.push(`];`);

  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${segments.length} segments → ${outPath}`);
  console.log(`characterWheelViewBoxSize = ${viewBoxSize}`);
}

main();
