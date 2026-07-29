import { coffeeFlavors } from "../../data/coffee-flavor";

/** フレーバーノート 1 語とその印象を表す色 */
export interface FlavorColor {
  /** 表示用の原文（トリム済み） */
  label: string;
  /** #RRGGBB */
  color: string;
  /** マッチしたキーワード（デバッグ・並び替え用） */
  matched?: string;
}

/** "bright, tomato, high acidity" → ["bright", "tomato", "high acidity"] */
export function splitFlavorNotes(flavorNote: string | undefined): string[] {
  if (!flavorNote) return [];
  return flavorNote
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** "#RGB" / "#RRGGBB" のみ有効。前後空白は許容。 */
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * flavorNote と同順の HEX CSV（例: "#F2C312,#E8D53A,#E2492F"）を分割する。
 * 各要素は有効な HEX ならその文字列、空欄・無効なら null（＝自動マッチにフォールバック）。
 */
export function splitFlavorColors(
  flavorColors: string | undefined,
): (string | null)[] {
  if (!flavorColors) return [];
  return flavorColors.split(/[,、]/).map((s) => {
    const v = s.trim();
    return HEX_RE.test(v) ? v : null;
  });
}

/**
 * カッピング用語 → 代表色。coffeeFlavors に直接載っていない
 * 「high acidity」「medium body」などの官能表現をざっくり色に寄せる。
 * 先に出現したキーワードが優先されるので、具体語 → 抽象語の順に並べる。
 */
const KEYWORD_COLORS: [string, string][] = [
  // fruit（具体）
  ["blackberry", "#3E0317"],
  ["raspberry", "#E52968"],
  ["blueberry", "#6469B0"],
  ["strawberry", "#EF2D36"],
  ["cherry", "#E73451"],
  ["pineapple", "#F89A1C"],
  ["grapefruit", "#F26355"],
  ["grape", "#8F1B53"],
  ["apple", "#4EB947"],
  ["peach", "#F68A5C"],
  ["apricot", "#F79A3E"],
  ["pear", "#BAA635"],
  ["lemon", "#FDE402"],
  ["lime", "#7EB138"],
  ["orange", "#E2631E"],
  ["tomato", "#E2492F"],
  ["citrus", "#F7A129"],
  ["berry", "#DD4C51"],
  ["tropical", "#F89A1C"],
  ["raisin", "#B53B54"],
  ["prune", "#A5446F"],
  ["fruit", "#F2684C"],
  // floral / tea
  ["jasmine", "#E0A9C0"],
  ["rose", "#EF5A78"],
  ["chamomile", "#F0C04A"],
  ["floral", "#DA0D68"],
  ["black tea", "#975E6D"],
  ["tea", "#9E7C86"],
  // sweet
  ["brown sugar", "#B36A3B"],
  ["caramel", "#C97B2C"],
  ["molasses", "#5A2A1E"],
  ["maple", "#AE341F"],
  ["honey", "#DA9E1F"],
  ["vanilla", "#E7C99A"],
  ["syrup", "#B4621F"],
  ["sugar", "#D08A3A"],
  ["sweet", "#DA5C1F"],
  // choco / nutty
  ["dark chocolate", "#3E1108"],
  ["chocolate", "#692A19"],
  ["cocoa", "#8A4B2C"],
  ["hazelnut", "#9D5433"],
  ["almond", "#C89F83"],
  ["peanut", "#C79A2E"],
  ["nutty", "#A87B64"],
  ["nut", "#A87B64"],
  ["malt", "#B47A3A"],
  ["cereal", "#C79A5B"],
  ["grain", "#B7906F"],
  // spice
  ["cinnamon", "#B5541F"],
  ["clove", "#8C5A45"],
  ["nutmeg", "#8C292C"],
  ["pepper", "#9C3B3F"],
  ["spice", "#B14D57"],
  // vegetal / green / herbal
  ["herbal", "#6FA23A"],
  ["herb", "#6FA23A"],
  ["grassy", "#5E9A2F"],
  ["green", "#3AA255"],
  ["vegetal", "#3E8C4A"],
  ["savory", "#7C8A3A"],
  ["earthy", "#6B5A38"],
  ["woody", "#6B4A1F"],
  ["tobacco", "#8A6A3A"],
  ["smoky", "#7A5A3A"],
  ["roast", "#6E3B18"],
  // fermented / boozy
  ["winey", "#8F1B53"],
  ["wine", "#8F1B53"],
  ["boozy", "#8B4A2E"],
  ["rum", "#7A3A1E"],
  ["whiskey", "#9A4A2E"],
  ["fermented", "#8A6A2C"],
  ["funky", "#7C6A3A"],
  // acidity / brightness
  ["citric", "#F0E010"],
  ["malic", "#C1BA09"],
  ["acetic", "#B9A449"],
  ["juicy", "#F0A020"],
  ["bright", "#F2C312"],
  ["crisp", "#D8DE3A"],
  ["acidity", "#D6C21A"],
  ["acidic", "#D6C21A"],
  ["acid", "#D6C21A"],
  ["sour", "#C9C815"],
  ["tart", "#C9C815"],
  ["zesty", "#E0C020"],
  // body / mouthfeel
  ["creamy", "#C9A87A"],
  ["silky", "#C9A87A"],
  ["velvety", "#7A4A2E"],
  ["syrupy", "#8A5A2E"],
  ["heavy", "#5A2E1A"],
  ["full", "#6E3B22"],
  ["round", "#8A5A38"],
  ["body", "#7A4A2E"],
  ["balanced", "#9A7A52"],
  ["clean", "#A9B8B5"],
  ["delicate", "#BFC7C4"],
  ["bitter", "#5A4A38"],
  ["complex", "#7A5A3A"],
];

export const DEFAULT_COLOR = "#8b7355";

/** フレーバーノート 1 語を色に変換する */
export function matchFlavorColor(note: string): FlavorColor {
  const label = note.trim();
  const lower = label.toLowerCase();

  // 1) coffeeFlavors に完全一致（例: "Blueberry"）
  const exact = coffeeFlavors.find((f) => f.flavor.toLowerCase() === lower);
  if (exact) return { label, color: exact.color, matched: exact.flavor };

  // 2) 官能表現キーワードの部分一致
  for (const [keyword, color] of KEYWORD_COLORS) {
    if (lower.includes(keyword)) return { label, color, matched: keyword };
  }

  // 3) coffeeFlavors の部分一致（"dried fruit" など）
  const partial = coffeeFlavors.find(
    (f) => lower.includes(f.flavor.toLowerCase()) && f.flavor.length > 3,
  );
  if (partial) return { label, color: partial.color, matched: partial.flavor };

  return { label, color: DEFAULT_COLOR };
}

/**
 * フレーバーノート文字列 → 色付きノート配列。
 * `override`（flavorNote と同順の HEX CSV）を渡すと、同じインデックスの語の色を
 * その HEX で上書きする。空欄・無効な要素、または範囲外の語は従来の自動マッチにフォールバック。
 */
export function flavorColors(
  flavorNote: string | undefined,
  override?: string | undefined,
): FlavorColor[] {
  const overrides = splitFlavorColors(override);
  return splitFlavorNotes(flavorNote).map((note, i) => {
    const hex = overrides[i];
    if (hex) return { label: note.trim(), color: hex, matched: "override" };
    return matchFlavorColor(note);
  });
}

/** 焙煎度ごとの雰囲気（背景の下地・全体トーン） */
export interface RoastMood {
  /** 下地の暗さ（0=明るいクリーム 〜 1=深いエスプレッソ） */
  darkness: number;
  /** 下地グラデーションの基調色 */
  base: string;
  label: string;
}

export function roastMood(roast: string | undefined): RoastMood {
  const key = (roast ?? "").toLowerCase();
  // darkness は「下地の温かみ」程度に抑え、フレーバー色を主役にする（深煎りでも明るく）
  if (key.includes("dark") || key.includes("french") || key.includes("italian"))
    return { darkness: 0.3, base: "#7a4a24", label: "Dark" };
  if (key.includes("medium-dark") || key.includes("mediumdark"))
    return { darkness: 0.24, base: "#8a5a2c", label: "Medium Dark" };
  if (key.includes("light") || key.includes("cinnamon"))
    return { darkness: 0.14, base: "#b9895a", label: "Light" };
  // medium 既定
  return { darkness: 0.2, base: "#9a6636", label: "Medium" };
}

/**
 * "rgb(218, 29, 35)" / "#DA1D23" / "#abc" → "#DA1D23"。
 * ホイールのセグメント色は rgb() 記法なので、HEX に正規化してから使う。
 */
export function normalizeHex(color: string): string {
  const v = color.trim();

  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    const hex = rgb
      .slice(1, 4)
      .map((n) =>
        Math.max(0, Math.min(255, Math.round(parseFloat(n))))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
    return `#${hex.toUpperCase()}`;
  }

  // #abc → #AABBCC
  const short = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (short) {
    return `#${short
      .slice(1, 4)
      .map((c) => c + c)
      .join("")}`.toUpperCase();
  }

  if (HEX_RE.test(v)) return v.toUpperCase();
  return DEFAULT_COLOR;
}

/** #RRGGBB → "r, g, b" */
function toRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * フレーバー色と焙煎度から、明るいカラースウォッチ（CSS の background 値）を組む。
 * 白地カード上部に敷く帯・モーダルのヒーロー帯用。ダークオーバーレイは載せず、
 * 各フレーバー色の柔らかな radial を淡い warm ベースの上でブレンドする。
 */
export function buildFlavorSwatch(
  colors: string[],
  roast: string | undefined,
): string {
  const mood = roastMood(roast);
  const palette = colors.length > 0 ? colors : [mood.base];

  // 各フレーバー色を横方向に散らして、明るく溶け合う帯にする
  const spots = palette.map((color, i) => {
    // 1 色なら中央、複数なら左右に広げて配置
    const t = palette.length === 1 ? 0.5 : i / (palette.length - 1);
    const cx = 12 + t * 76; // 12%〜88%
    const cy = 34 + (i % 2) * 32; // 段違いにして有機的に
    return `radial-gradient(circle at ${cx.toFixed(1)}% ${cy.toFixed(1)}%, rgba(${toRgb(
      color,
    )}, 0.92) 0%, rgba(${toRgb(color)}, 0.42) 38%, rgba(${toRgb(color)}, 0) 66%)`;
  });

  // 淡い warm ベース（焙煎度で少しだけトーンを変える。暗くはしない）
  const tint = 0.14 + mood.darkness * 0.12; // 0.16〜0.24 程度
  const baseFill = `linear-gradient(135deg, rgba(${toRgb(
    mood.base,
  )}, ${tint.toFixed(2)}) 0%, rgba(250, 248, 245, 1) 78%)`;

  // 上に重ねる順: spots → base
  return [...spots, baseFill].join(", ");
}
