/**
 * フレーバー名を「文字に色」で組むための色（.flavor-words__word が読む）。
 *
 * microCMS の flavorColors にはどんな色も入りうる（バニラのクリーム色、
 * プラムの濃い紫など）。そのまま文字に塗ると地に沈むので、輝度で寄せる:
 * - ライト（生成りの地）: 相対輝度 0.36 以下まで黒へ寄せる
 * - ダーク（墨の地）    : 相対輝度 0.2 以上まで白へ寄せる
 * 1 語は左から右への 2 色のグラデーションで、ライトは少し暗い色から、
 * ダークは少し明るい色へ流す（Figma「Pages — Final」の豆のマスと同じ）。
 */
import { normalizeHex } from "./flavor-color";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const LIGHT_MAX_LUMINANCE = 0.36;
const DARK_MIN_LUMINANCE = 0.2;

function toRgb(hex: string): Rgb {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const linear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** target（0 = 黒 / 1 = 白）へ t だけ寄せる */
function toward(c: Rgb, t: number, target: 0 | 1): Rgb {
  return {
    r: c.r + (target - c.r) * t,
    g: c.g + (target - c.g) * t,
    b: c.b + (target - c.b) * t,
  };
}

function forLight(c: Rgb): Rgb {
  let out = c;
  for (let i = 0; i < 40 && luminance(out) > LIGHT_MAX_LUMINANCE; i++) {
    out = toward(out, 0.05, 0);
  }
  return out;
}

function forDark(c: Rgb): Rgb {
  let out = c;
  for (let i = 0; i < 40 && luminance(out) < DARK_MIN_LUMINANCE; i++) {
    out = toward(out, 0.08, 1);
  }
  return out;
}

export interface FlavorWordColors {
  "--color-flavor-from": string;
  "--color-flavor-to": string;
  "--color-flavor-dark-from": string;
  "--color-flavor-dark-to": string;
}

/**
 * 1 語ぶんの色。colors は flavorColors() の colors（1 語に複数色のこともある）。
 * 2 色あれば両端に使い、1 色なら明暗の差でグラデーションにする。
 */
export function flavorWordColors(colors: string[]): FlavorWordColors {
  const [first, second] = colors.map(toRgb);
  const lightTo = forLight(second ?? first);
  const lightFrom = second ? forLight(first) : toward(lightTo, 0.2, 0);
  const darkFrom = forDark(first);
  const darkTo = second ? forDark(second) : toward(darkFrom, 0.3, 1);
  return {
    "--color-flavor-from": toHex(lightFrom),
    "--color-flavor-to": toHex(lightTo),
    "--color-flavor-dark-from": toHex(darkFrom),
    "--color-flavor-dark-to": toHex(darkTo),
  };
}

/** Astro の style 属性に渡す文字列版 */
export function flavorWordStyle(colors: string[]): string {
  return Object.entries(flavorWordColors(colors))
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}
