import {
  flavorSwatch,
  normalizeHex,
  SPOT_STOPS,
  BASE_END,
} from "./flavor-color";

/**
 * 豆 1 件の横長カードを SVG で組む（/beans/color-tool から保存して印刷する用）。
 * コーヒー袋に貼るラベルのつもりで、上に情報・下にフレーバーの帯、右上に焙煎日を置く。
 * 印刷前提なので角は落とさず、最下層は白。色とフォントはサイトの @theme と同じ。
 * 帯のグラデーションは web のカード（.swatch）と同じ組み立て・同じ拡大率にしている。
 */

/** 論理サイズ。共有しやすい 1.91:1（OG 画像と同じ比率） */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/** サイトの配色トークン（global.css の @theme と同じ値） */
const INK = "#2a2521";
const INK_MUTED = "#63594f";
const INK_FAINT = "#8a7f72";
const LINE = "#e9e1d7";
const SURFACE = "#ffffff";
const ACCENT_STRONG = "#8b5e34";
const PAGE_BG = "#faf8f5";

const SANS =
  "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', Arial, sans-serif";
const SERIF = "'EB Garamond', 'Hiragino Mincho ProN', serif";

/** カードの左右余白 */
const PADDING = 56;

/** 下部スウォッチ帯の高さ。サイトのカード（下 1/4 の横長帯）に近い比率にする */
const BAND_HEIGHT = 196;

/**
 * CSS 側の `.swatch { background-size: 160% 160% }` と同じ拡大率。
 * グラデーションの箱を帯より大きく取って左上だけを見せることで、
 * 1 色あたりの占有面積が web のカードと同じ感じになる。
 */
const SWATCH_ZOOM = 1.6;

/** カードに載せる内容 */
export interface BeanCardData {
  name: string;
  /** 産地（"🇰🇪 Kenya" のように旗を含めた 1 行） */
  origin: string;
  /** フレーバーノート（語 + 1 語に複数色） */
  notes: { label: string; colors: string[] }[];
  /** 帯の上に並べるスペック（Variety / Process / Roast など） */
  specs: { label: string; value: string }[];
  /** 焙煎日（"2026.07.30" のような表示用の文字列） */
  roastDate: string;
  /** スウォッチの下地トーンに使う焙煎度 ID */
  roastLevel?: string;
}

/** フォントを読み込んでおく（未読込のまま測ると幅がずれる） */
export async function ensureCardFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`400 68px ${SERIF}`),
    document.fonts.load(`400 20px ${SANS}`),
    document.fonts.load(`700 20px ${SANS}`),
  ]);
  await document.fonts.ready;
}

/** 保存時のファイル名（"kenya-nyanja-washed-2026-07-30.svg"） */
export function beanCardFileName(name: string, roastDate: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9぀-ヿ一-鿿]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = roastDate.replace(/[^0-9]/g, "-").replace(/^-|-$/g, "");
  return `${slug || "bean"}-${date || "card"}.svg`;
}

/** カード 1 枚の SVG 文字列を組む */
export function buildBeanCardSvg(data: BeanCardData): string {
  const bandY = CARD_HEIGHT - BAND_HEIGHT;
  const { defs, band } = swatchBand(data, 0, bandY, CARD_WIDTH, BAND_HEIGHT);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${esc(data.name)}">`,
    `<defs>${defs}</defs>`,
    // 最下層は白（印刷用）
    `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${SURFACE}"/>`,
    band,
    info(data, bandY),
    // 断裁の目印になる細い枠
    `<rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${CARD_HEIGHT - 2}" fill="none" stroke="${LINE}" stroke-width="2"/>`,
    `</svg>`,
  ].join("");
}

/** フレーバースウォッチ帯（サイトのカード下部の帯と同じ組み立て） */
function swatchBand(
  data: BeanCardData,
  x: number,
  y: number,
  w: number,
  h: number,
): { defs: string; band: string } {
  const colors = data.notes.flatMap((n) => n.colors.map(normalizeHex));
  const { spots, base } = flavorSwatch(colors, data.roastLevel);

  // グラデーションを組む箱は帯より大きい（background-size: 160% 160% 相当）
  const gw = w * SWATCH_ZOOM;
  const gh = h * SWATCH_ZOOM;

  const defs: string[] = [
    `<clipPath id="band"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`,
    // 下地（CSS の linear-gradient(135deg, ...) 相当）
    `<linearGradient id="band-base" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${round(x + gw * BASE_END)}" y2="${round(y + gh * BASE_END)}">` +
      `<stop offset="0" stop-color="${base.color}" stop-opacity="${round(base.alpha)}"/>` +
      `<stop offset="1" stop-color="${PAGE_BG}"/>` +
      `</linearGradient>`,
    // 帯の上端を白くぼかして本体に馴染ませる（.swatch-edge 相当）
    `<linearGradient id="band-edge" gradientUnits="userSpaceOnUse" x1="0" y1="${y}" x2="0" y2="${y + 44}">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>` +
      `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>` +
      `</linearGradient>`,
  ];

  const layers: string[] = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#band-base)"/>`,
  ];

  // 各フレーバー色の柔らかい染み
  spots.forEach((spot, i) => {
    const cx = x + (spot.cx / 100) * gw;
    const cy = y + (spot.cy / 100) * gh;
    // CSS の circle（farthest-corner）と同じ半径にする
    const radius =
      Math.hypot(Math.max(cx - x, x + gw - cx), Math.max(cy - y, y + gh - cy)) *
      SPOT_STOPS[2].at;
    const stops = SPOT_STOPS.map(
      (stop) =>
        `<stop offset="${round(stop.at / SPOT_STOPS[2].at)}" stop-color="${spot.color}" stop-opacity="${stop.alpha}"/>`,
    ).join("");
    defs.push(
      `<radialGradient id="spot-${i}" gradientUnits="userSpaceOnUse" cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}">${stops}</radialGradient>`,
    );
    layers.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#spot-${i})"/>`,
    );
  });

  layers.push(
    `<rect x="${x}" y="${y}" width="${w}" height="44" fill="url(#band-edge)"/>`,
  );

  return {
    defs: defs.join(""),
    band: `<g clip-path="url(#band)">${layers.join("")}</g>`,
  };
}

/** 帯より上の情報面 */
function info(data: BeanCardData, bandTop: number): string {
  const left = PADDING;
  const right = CARD_WIDTH - PADDING;
  const maxWidth = right - left;
  const out: string[] = [];

  // 1 行目: 左に eyebrow、右に焙煎日
  out.push(
    text("TAKUM1.ME — BEANS", left, 66, {
      font: SANS,
      size: 13,
      weight: 700,
      fill: INK_FAINT,
      tracking: 2.6,
    }),
    text("ROASTED ON", right, 62, {
      font: SANS,
      size: 12,
      weight: 700,
      fill: INK_FAINT,
      tracking: 2.2,
      anchor: "end",
    }),
    text(data.roastDate, right, 102, {
      font: SERIF,
      size: 34,
      fill: INK,
      anchor: "end",
    }),
  );

  // 産地（旗の絵文字が入るので字間は控えめに）
  out.push(
    text(data.origin.toUpperCase(), left, 152, {
      font: SANS,
      size: 15,
      weight: 700,
      fill: ACCENT_STRONG,
      tracking: 1.6,
    }),
  );

  // 豆の名前（Latin は EB Garamond、日本語は明朝に落ちる）
  out.push(
    text(fit(data.name, maxWidth, `400 68px ${SERIF}`), left, 226, {
      font: SERIF,
      size: 68,
      fill: INK,
      pinWidth: true,
    }),
  );

  // フレーバーノート（色ドット + 語）
  out.push(notes(data.notes, left, 280, maxWidth));

  // スペックは帯の上に横 1 列で並べる
  const specTop = bandTop - 96;
  out.push(
    `<line x1="${left}" y1="${specTop - 34}" x2="${right}" y2="${specTop - 34}" stroke="${LINE}" stroke-width="1"/>`,
    specs(data.specs, left, specTop, maxWidth),
  );

  return out.join("");
}

/** ノートを 2 行までで折り返して並べる */
function notes(
  list: BeanCardData["notes"],
  left: number,
  top: number,
  maxWidth: number,
): string {
  const lineHeight = 34;
  const gap = 26;
  const font = `400 20px ${SANS}`;
  const out: string[] = [];
  let x = left;
  let line = 0;

  for (const note of list) {
    const width = 18 + measure(note.label, font);
    if (x > left && x + width > left + maxWidth) {
      line += 1;
      if (line > 1) {
        // 3 行目に溢れる分は省略
        out.push(
          text("…", x, top + lineHeight, {
            font: SANS,
            size: 20,
            fill: INK_FAINT,
          }),
        );
        break;
      }
      x = left;
    }

    const y = top + line * lineHeight;
    out.push(
      noteDot(note.colors.map(normalizeHex), x + 5, y - 6, 5),
      text(note.label, x + 18, y, {
        font: SANS,
        size: 20,
        fill: INK_MUTED,
        pinWidth: true,
      }),
    );
    x += width + gap;
  }

  return out.join("");
}

/** 1 語に複数色ある場合は円を等分して塗り分ける */
function noteDot(colors: string[], cx: number, cy: number, r: number): string {
  if (colors.length === 0) return "";
  if (colors.length === 1)
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[0]}"/>`;

  // 左上から時計回りに等分（CSS 側の linear-gradient(135deg) の塗り分けに合わせる）
  const start = -Math.PI * 0.75;
  const step = (Math.PI * 2) / colors.length;
  return colors
    .map((color, i) => {
      const a0 = start + i * step;
      const a1 = start + (i + 1) * step;
      const x0 = round(cx + r * Math.cos(a0));
      const y0 = round(cy + r * Math.sin(a0));
      const x1 = round(cx + r * Math.cos(a1));
      const y1 = round(cy + r * Math.sin(a1));
      const large = step > Math.PI ? 1 : 0;
      return `<path d="M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z" fill="${color}"/>`;
    })
    .join("");
}

/** スペックを横 1 列で並べる（帯の上のスペック帯） */
function specs(
  list: BeanCardData["specs"],
  left: number,
  top: number,
  maxWidth: number,
): string {
  const shown = list.slice(0, 4);
  if (shown.length === 0) return "";
  const colWidth = maxWidth / shown.length;

  return shown
    .map((spec, i) => {
      const x = left + i * colWidth;
      return [
        text(spec.label.toUpperCase(), x, top, {
          font: SANS,
          size: 12,
          weight: 700,
          fill: INK_FAINT,
          tracking: 2.2,
        }),
        text(fit(spec.value, colWidth - 24, `400 19px ${SANS}`), x, top + 30, {
          font: SANS,
          size: 19,
          fill: INK,
          pinWidth: true,
        }),
      ].join("");
    })
    .join("");
}

interface TextStyle {
  font: string;
  size: number;
  fill: string;
  weight?: number;
  tracking?: number;
  anchor?: "start" | "end";
  /**
   * 描画幅を固定する。保存した SVG を webfont の無い環境で開くと代替フォントの
   * 幅がずれて隣の列にぶつかるので、レイアウトに関わる文字は実測幅で固定する。
   */
  pinWidth?: boolean;
}

/** <text> 1 つ */
function text(value: string, x: number, y: number, style: TextStyle): string {
  const attrs = [
    `x="${round(x)}"`,
    `y="${round(y)}"`,
    `font-family="${style.font}"`,
    `font-size="${style.size}"`,
    `fill="${style.fill}"`,
  ];
  if (style.weight) attrs.push(`font-weight="${style.weight}"`);
  if (style.tracking) attrs.push(`letter-spacing="${style.tracking}"`);
  if (style.anchor === "end") attrs.push(`text-anchor="end"`);
  if (style.pinWidth && value !== "") {
    const font = `${style.weight ?? 400} ${style.size}px ${style.font}`;
    attrs.push(
      `textLength="${round(measure(value, font))}"`,
      `lengthAdjust="spacingAndGlyphs"`,
    );
  }
  return `<text ${attrs.join(" ")}>${esc(value)}</text>`;
}

/** 幅に収まらない文字列を "…" で詰める */
function fit(value: string, maxWidth: number, font: string): string {
  if (measure(value, font) <= maxWidth) return value;
  let cut = value;
  while (cut.length > 1 && measure(`${cut}…`, font) > maxWidth)
    cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * 文字幅の実測。SVG では測れないので canvas の measureText を借りる
 * （同じフォントなのでレイアウト計算には十分）。canvas が無い環境では概算。
 */
let measureCtx: CanvasRenderingContext2D | null | undefined;
function measure(value: string, font: string): number {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) {
    // フォントが無い環境（SSR など）では 1 文字 0.55em として概算する
    const size = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 16);
    return value.length * size * 0.55;
  }
  measureCtx.font = font;
  return measureCtx.measureText(value).width;
}

/** 小数を短く（SVG の文字数を無駄に増やさない） */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** XML エスケープ */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
