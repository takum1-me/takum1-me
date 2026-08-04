import {
  flavorSwatch,
  normalizeHex,
  SPOT_STOPS,
  BASE_END,
} from "./flavor-color";
import type { RoastCurve } from "./roast-curve";

/**
 * 豆 1 件の名刺サイズカードを SVG で組む（/beans/color-tool から保存して印刷する用）。
 * コーヒー袋に貼るラベルのつもりで、上に情報・下にフレーバーの帯、右上に焙煎日を置く。
 * 印刷前提なので角は落とさず、最下層は白。色とフォントはサイトの @theme と同じ。
 * 帯のグラデーションは web のカード（.swatch）と同じ組み立て・同じ拡大率にしている。
 */

/**
 * ユーザー単位 = 0.1mm。ルートの width/height には mm を書くので、
 * 何も指定せず印刷しても名刺の原寸で出る。
 */
const MM = 10;

/** 名刺サイズ（日本の標準 91 × 55mm） */
export const CARD_WIDTH = 91 * MM;
export const CARD_HEIGHT = 55 * MM;

/** 文字サイズを印刷の pt で書くための変換（1pt = 0.3528mm） */
function pt(size: number): number {
  return round(size * 0.352778 * MM);
}

/**
 * 書体の役割はサイトと同じで、中身は EB Garamond、小見出しだけ Noto Sans の
 * 字間を空けた大文字にする。名刺で本文用の下限が 8pt、字間の空いた大文字は
 * 6.5pt くらいまで読めるので、その範囲に収めている。
 */
const SIZE_LABEL = pt(6.5);
const SIZE_ORIGIN = pt(7);
const SIZE_NOTE = pt(9);
const SIZE_SPEC = pt(9);
const SIZE_DATE = pt(10);
const SIZE_NAME = pt(17);

/** 大文字だけの行は字間を空けないと詰まって見える */
const LABEL_TRACKING = round(SIZE_LABEL * 0.18);
const ORIGIN_TRACKING = round(SIZE_ORIGIN * 0.14);

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
const PADDING = 5 * MM;

/**
 * 下部スウォッチ帯の高さ。中身が詰まった豆ではスペックに押されて縮むので、
 * 最低限ここまでは残すという下限も持たせる。
 */
const BAND_HEIGHT = 11 * MM;
const BAND_HEIGHT_MIN = 9 * MM;
/** スペックの最終行と帯の間 */
const SPEC_TO_BAND = 3.2 * MM;

/** 各行のベースライン（上から積む）。数字は名刺の上端からの mm */
const Y_EYEBROW = 5.9 * MM;
const Y_ROAST_LABEL = 5.6 * MM;
const Y_ROAST_DATE = 10.2 * MM;
const Y_ORIGIN = 13.8 * MM;
const Y_NAME = 21.2 * MM;
const Y_NOTES = 27 * MM;
const NOTE_LEADING = 4.4 * MM;

/**
 * スペックは上から積まずに帯の上へ溜める。行数が減るとそのぶん
 * ノートとの間が空くので、中身が少ない豆ほど紙面が緩くなる。
 */
const Y_SPEC_LAST = 39.8 * MM;
const SPEC_LEADING = 4.4 * MM;
const SPEC_MAX_LINES = 2;
/** 罫線とノート / スペックの間に最低限空ける量 */
const RULE_CLEARANCE = 2.4 * MM;

/** ベースラインからの高さの目安。罫線を上下の中央に置くのに使う概算値 */
const CAP_HEIGHT = 0.72;
const DESCENT = 0.27;

/**
 * CSS 側の `.swatch { background-size: 160% 160% }` と同じ拡大率。
 * グラデーションの箱を帯より大きく取って左上だけを見せることで、
 * 1 色あたりの占有面積が web のカードと同じ感じになる。
 */
const SWATCH_ZOOM = 1.6;

/** 帯の上端の白ぼかしの高さ */
const BAND_EDGE = 2 * MM;

/**
 * 背景に敷く焙煎曲線。線だけを引いて塗りは持たない。
 * 上端を焙煎日の行より下に置いているのは、終盤の平らな部分が日付と重なるため。
 * 下端はスペック（VARIETY など）の行の上で止める。左右は断ち落とし。
 */
const CURVE_TOP = 12 * MM;
const CURVE_STROKE = 0.3 * MM;
const CURVE_STROKE_OPACITY = 0.3;
/** 曲線の下端とスペックの行の間に空ける量 */
const CURVE_CLEARANCE = 1.6 * MM;
/** 1 ハゼの点（ページのグラフと同じく曲線上に打つだけ） */
const CURVE_MARK_OPACITY = 0.4;
const CURVE_MARK_RADIUS = 0.5 * MM;

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
  /** 背景に薄く敷く焙煎曲線（未指定なら敷かない） */
  roastCurve?: RoastCurve | null;
}

/** フォントを読み込んでおく（未読込のまま測ると幅がずれる） */
export async function ensureCardFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`400 ${SIZE_NAME}px ${SERIF}`),
    document.fonts.load(`400 ${SIZE_NOTE}px ${SERIF}`),
    document.fonts.load(`600 ${SIZE_LABEL}px ${SANS}`),
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
  // 帯の高さは中身次第なので、先に情報面を組んでから帯を敷く
  const face = info(data);
  const { defs, band } = swatchBand(
    data,
    0,
    face.bandTop,
    CARD_WIDTH,
    CARD_HEIGHT - face.bandTop,
  );

  // 曲線は下端を情報面に合わせるので、面を組んでから。色は帯の 1 色目に合わせる
  const backdrop = data.roastCurve
    ? roastBackdrop(
        data.roastCurve,
        face.curveBottom,
        normalizeHex(data.notes[0]?.colors[0] ?? ACCENT_STRONG),
      )
    : null;

  return [
    // width/height は mm。印刷ダイアログで拡大しなければ名刺の原寸で出る
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH / MM}mm" height="${CARD_HEIGHT / MM}mm" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${esc(data.name)}">`,
    `<defs>${defs}${backdrop?.defs ?? ""}</defs>`,
    // 最下層は白（印刷用）
    `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${SURFACE}"/>`,
    backdrop?.layer ?? "",
    band,
    face.svg,
    // 断裁の目印になる細い枠（0.2mm）
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
    `<linearGradient id="band-edge" gradientUnits="userSpaceOnUse" x1="0" y1="${y}" x2="0" y2="${y + BAND_EDGE}">` +
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
    `<rect x="${x}" y="${y}" width="${w}" height="${BAND_EDGE}" fill="url(#band-edge)"/>`,
  );

  return {
    defs: defs.join(""),
    band: `<g clip-path="url(#band)">${layers.join("")}</g>`,
  };
}

/**
 * 背景の焙煎曲線。文字の下に敷く下絵なので線 1 本だけで、塗りも目盛りも置かない。
 * 正規化された曲線（0〜1）を、左右は断ち落とし・縦は「bottom が 0℃、
 * CURVE_TOP が温度軸の上限」に伸ばす。色は帯のグラデーションの 1 色目を使う。
 */
function roastBackdrop(
  curve: RoastCurve,
  bottom: number,
  color: string,
): { defs: string; layer: string } | null {
  if (curve.points.length < 2) return null;

  const height = bottom - CURVE_TOP;
  if (height <= 0) return null;

  const px = (x: number) => round(x * CARD_WIDTH);
  const py = (y: number) => round(bottom - y * height);

  const line = curve.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x)} ${py(p.y)}`)
    .join(" ");

  const layers: string[] = [
    `<path d="${line}" fill="none" stroke="${color}" stroke-width="${CURVE_STROKE}" stroke-opacity="${CURVE_STROKE_OPACITY}" stroke-linejoin="round" stroke-linecap="round"/>`,
  ];

  // 1 ハゼだけ曲線の上に点を打つ
  const firstCrack = curve.marks.find((m) => m.name === "1C");
  if (firstCrack) {
    layers.push(
      `<circle cx="${px(firstCrack.x)}" cy="${py(firstCrack.y)}" r="${CURVE_MARK_RADIUS}" fill="${color}" fill-opacity="${CURVE_MARK_OPACITY}"/>`,
    );
  }

  return {
    defs: `<clipPath id="curve-clip"><rect x="0" y="${round(CURVE_TOP)}" width="${CARD_WIDTH}" height="${round(height)}"/></clipPath>`,
    layer: `<g clip-path="url(#curve-clip)">${layers.join("")}</g>`,
  };
}

/**
 * 帯より上の情報面。帯の上端と背景の曲線の下端は中身を組んでみないと
 * 決まらないので、SVG と一緒に返す。
 */
function info(data: BeanCardData): {
  svg: string;
  bandTop: number;
  curveBottom: number;
} {
  const left = PADDING;
  const right = CARD_WIDTH - PADDING;
  const maxWidth = right - left;
  const out: string[] = [];

  // 1 行目: 左に eyebrow、右に焙煎日
  out.push(
    text("TAKUM1.ME — BEANS", left, Y_EYEBROW, {
      font: SANS,
      size: SIZE_LABEL,
      weight: 600,
      fill: INK_FAINT,
      tracking: LABEL_TRACKING,
      pinWidth: true,
    }),
    text("ROASTED ON", right, Y_ROAST_LABEL, {
      font: SANS,
      size: SIZE_LABEL,
      weight: 600,
      fill: INK_FAINT,
      tracking: LABEL_TRACKING,
      anchor: "end",
    }),
    text(data.roastDate, right, Y_ROAST_DATE, {
      font: SERIF,
      size: SIZE_DATE,
      fill: INK,
      anchor: "end",
    }),
  );

  // 産地（旗の絵文字が入るので字間は控えめに）
  out.push(
    text(data.origin.toUpperCase(), left, Y_ORIGIN, {
      font: SANS,
      size: SIZE_ORIGIN,
      weight: 600,
      fill: ACCENT_STRONG,
      tracking: ORIGIN_TRACKING,
      pinWidth: true,
    }),
  );

  // 豆の名前（Latin は EB Garamond、日本語は明朝に落ちる）
  out.push(
    text(
      fit(data.name, maxWidth, `400 ${SIZE_NAME}px ${SERIF}`),
      left,
      Y_NAME,
      {
        font: SERIF,
        size: SIZE_NAME,
        fill: INK,
        pinWidth: true,
      },
    ),
  );

  // フレーバーノート（色ドット + 語）
  const note = notes(data.notes, left, Y_NOTES, maxWidth);
  // ノートが空の豆では、罫線は豆の名前を基準にする
  const notesBottom = note.lines
    ? Y_NOTES + (note.lines - 1) * NOTE_LEADING + SIZE_NOTE * DESCENT
    : Y_NAME + SIZE_NAME * DESCENT;
  out.push(note.svg);

  // スペックは帯の上に溜めて、その上に罫線を引く
  const spec = specs(data.specs, left, maxWidth, notesBottom);
  if (spec.svg) {
    out.push(
      `<line x1="${left}" y1="${spec.ruleY}" x2="${right}" y2="${spec.ruleY}" stroke="${LINE}" stroke-width="1.5"/>`,
      spec.svg,
    );
  }

  // 帯は残りを全部使うが、中身に押されても下限までしか譲らない
  const bandTop = Math.min(
    Math.max(CARD_HEIGHT - BAND_HEIGHT, spec.bottom + SPEC_TO_BAND),
    CARD_HEIGHT - BAND_HEIGHT_MIN,
  );

  return {
    svg: out.join(""),
    bandTop: round(bandTop),
    // 背景の曲線はスペックの行に掛からないよう、その手前で止める
    curveBottom: round(
      spec.top === undefined ? bandTop : spec.top - CURVE_CLEARANCE,
    ),
  };
}

/** ノートを 2 行までで折り返して並べる。使った行数は罫線の位置決めに要る */
function notes(
  list: BeanCardData["notes"],
  left: number,
  top: number,
  maxWidth: number,
): { svg: string; lines: number } {
  const gap = round(SIZE_NOTE * 1.1);
  const font = `400 ${SIZE_NOTE}px ${SERIF}`;
  // ドットは語の左に置く（半径・語までの距離とも文字サイズ基準）
  const dotRadius = round(SIZE_NOTE * 0.22);
  const labelOffset = round(SIZE_NOTE * 0.8);
  const out: string[] = [];
  let x = left;
  let line = 0;

  for (const note of list) {
    const width = labelOffset + measure(note.label, font);
    if (x > left && x + width > left + maxWidth) {
      line += 1;
      if (line > 1) {
        // 3 行目に溢れる分は省略
        out.push(
          text("…", x, top + NOTE_LEADING, {
            font: SERIF,
            size: SIZE_NOTE,
            fill: INK_FAINT,
          }),
        );
        break;
      }
      x = left;
    }

    const y = top + line * NOTE_LEADING;
    out.push(
      noteDot(
        note.colors.map(normalizeHex),
        x + dotRadius,
        y - round(SIZE_NOTE * 0.28),
        dotRadius,
      ),
      text(note.label, x + labelOffset, y, {
        font: SERIF,
        size: SIZE_NOTE,
        fill: INK_MUTED,
        pinWidth: true,
      }),
    );
    x += width + gap;
  }

  return {
    svg: out.join(""),
    lines: out.length === 0 ? 0 : Math.min(line + 1, 2),
  };
}

/** 1 語に複数色ある場合は円を等分して塗り分ける */
function noteDot(colors: string[], cx: number, cy: number, r: number): string {
  if (colors.length === 0) return "";
  if (colors.length === 1)
    return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${r}" fill="${colors[0]}"/>`;

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

/**
 * スペックは「小見出し + 値」を 1 組にして流し込む。名刺幅で列を等分すると
 * ほとんどの値が "…" になるので、組ごとの実測幅で折り返す方に振っている。
 * 行は帯の上端から積み上げるので、組が少ない豆ほどグラデーションとの間が空く。
 * ノートに近すぎるときだけ下へ逃がし、罫線はノートとの間の中央に置く。
 */
function specs(
  list: BeanCardData["specs"],
  left: number,
  maxWidth: number,
  notesBottom: number,
): { svg: string; ruleY: number; top?: number; bottom: number } {
  const shown = list.slice(0, 4);
  if (shown.length === 0)
    return { svg: "", ruleY: notesBottom, bottom: notesBottom };

  const labelFont = `600 ${SIZE_LABEL}px ${SANS}`;
  const valueFont = `400 ${SIZE_SPEC}px ${SERIF}`;
  /** 小見出しと値の間 / 組と組の間 */
  const labelGap = round(SIZE_LABEL * 0.9);
  const itemGap = round(SIZE_SPEC * 1.4);

  const items = shown.map((spec) => {
    const label = spec.label.toUpperCase();
    // 字間を空けている分、実測より広い
    const labelWidth =
      measure(label, labelFont) + [...label].length * LABEL_TRACKING;
    return {
      label,
      labelWidth,
      value: spec.value,
      width: labelWidth + labelGap + measure(spec.value, valueFont),
    };
  });

  // 幅で折り返す。最終行にも入らない値だけ "…" で詰める
  const lines: (typeof items)[] = [[]];
  let used = 0;
  for (const item of items) {
    const line = lines[lines.length - 1];
    const advance = line.length === 0 ? item.width : itemGap + item.width;
    if (used + advance <= maxWidth) {
      line.push(item);
      used += advance;
    } else if (lines.length < SPEC_MAX_LINES) {
      lines.push([item]);
      used = item.width;
    } else {
      const rest = maxWidth - used - itemGap - item.labelWidth - labelGap;
      // 数文字も残らないなら、中途半端に出すより落とす
      if (rest < SIZE_SPEC * 2) continue;
      item.value = fit(item.value, rest, valueFont);
      item.width = item.labelWidth + labelGap + measure(item.value, valueFont);
      line.push(item);
      used += itemGap + item.width;
    }
  }

  // 帯の上に溜めるのが基本。ただし罫線を挟む余白が取れないときは下へ逃がす
  const capTop = SIZE_LABEL * CAP_HEIGHT;
  const top = Math.max(
    Y_SPEC_LAST - (lines.length - 1) * SPEC_LEADING,
    notesBottom + RULE_CLEARANCE * 2 + capTop,
  );
  // 罫線はノートの下端と小見出しの上端のちょうど中間に置く
  const ruleY = round((notesBottom + top - capTop) / 2);
  const bottom = top + (lines.length - 1) * SPEC_LEADING + SIZE_SPEC * DESCENT;

  const svg = lines
    .map((line, row) => {
      const y = top + row * SPEC_LEADING;
      let x = left;
      return line
        .map((item) => {
          const out = [
            text(item.label, x, y, {
              font: SANS,
              size: SIZE_LABEL,
              weight: 600,
              fill: INK_FAINT,
              tracking: LABEL_TRACKING,
              pinWidth: true,
            }),
            text(item.value, x + item.labelWidth + labelGap, y, {
              font: SERIF,
              size: SIZE_SPEC,
              fill: INK,
              pinWidth: true,
            }),
          ].join("");
          x += item.width + itemGap;
          return out;
        })
        .join("");
    })
    .join("");

  // top は小見出しの大文字の上端。背景の曲線をここで止める
  return { svg, ruleY, top: top - capTop, bottom };
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
    // textLength は字間込みの送り幅なので、tracking の分を足しておく
    const width =
      measure(value, font) + (style.tracking ?? 0) * [...value].length;
    attrs.push(
      `textLength="${round(width)}"`,
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
