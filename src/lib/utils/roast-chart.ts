import { computeMetrics, series, timeSeries, mmss, type KlogLog } from "./klog";

/**
 * 焙煎ログのグラフを SVG 文字列で組む。
 *
 * ページに直接埋める前提なので、色は `var(--color-*)` で参照する
 * （@theme のトークンがそのまま効く）。チャートライブラリを足さないのは
 * このリポジトリの方針で、豆カードの SVG 生成と同じ組み立て方にしている。
 *
 * 左軸が温度、右軸が RoR。色変化・1 ハゼ・焙煎終了は縦の破線で示す。
 */

/** 論理サイズ。ページ側で width:100% にして使う */
const WIDTH = 960;
const HEIGHT = 420;
const PAD = { top: 18, right: 52, bottom: 58, left: 46 };
/** 目盛りと凡例のベースライン（プロット下端からの距離） */
const TICK_BASELINE = 20;
const LEGEND_BASELINE = 44;

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** 縦線を引くイベントと、その表示名 */
const EVENT_LABELS: Record<string, string> = {
  colour_change: "色変化",
  first_crack: "1ハゼ",
  second_crack: "2ハゼ",
  roast_end: "終了",
};

/**
 * RoR 軸の範囲を測る帯。
 * 投入直後は本当に 130〜160℃/min まで跳ね、終了後は冷却で大きく負に振れる。
 * 全部を軸に入れると、読みたい「焙煎中に落ちていく RoR」が下端で潰れるので、
 * 立ち上がりが収まる 90 秒以降だけで軸を決めて、それ以前は枠の外へ逃がす。
 */
const ROR_WINDOW_START = 90;
const ROR_WINDOW_END_MARGIN = 10;

interface Scale {
  min: number;
  max: number;
  /** 値 → 画面座標 */
  to: (v: number) => number;
}

function linear(min: number, max: number, from: number, to: number): Scale {
  const span = max - min || 1;
  return { min, max, to: (v) => from + ((v - min) / span) * (to - from) };
}

/** 目盛りの刻み幅を、だいたい `count` 本になるようキリの良い数から選ぶ */
function niceStep(span: number, count: number): number {
  const raw = span / Math.max(count, 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= mag * m) return mag * m;
  }
  return mag * 10;
}

/**
 * 欠測（NaN）で切りながら polyline を組む。
 * 1 点しかない区間は線にならないので捨てる。
 */
function polyline(
  xs: number[],
  ys: number[] | undefined,
  x: Scale,
  y: Scale,
  attrs: string,
): string {
  if (!ys) return "";
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length > 1)
      out.push(`<polyline points="${run.join(" ")}" ${attrs}/>`);
    run = [];
  };
  for (let i = 0; i < xs.length; i += 1) {
    const vx = xs[i];
    const vy = ys[i];
    if (
      vx === undefined ||
      vy === undefined ||
      Number.isNaN(vx) ||
      Number.isNaN(vy)
    ) {
      flush();
      continue;
    }
    run.push(`${round(x.to(vx))},${round(y.to(vy))}`);
  }
  flush();
  return out.join("");
}

export interface RoastChartOptions {
  /** 凡例を描くか（一覧のサムネイルでは省く） */
  legend?: boolean;
  /** 目盛りとイベント名を描くか（サムネイルでは省く） */
  axes?: boolean;
  /** アクセシビリティ用の説明 */
  label?: string;
}

/** 焙煎ログ 1 件分のグラフ SVG */
export function buildRoastChartSvg(
  log: KlogLog,
  options: RoastChartOptions = {},
): string {
  const { legend = true, axes = true, label = "焙煎ログのグラフ" } = options;

  const time = timeSeries(log);
  const temp = series(log, "temp");
  const meanTemp = series(log, "mean_temp");
  const target = series(log, "profile");
  const ror = series(log, "actual_ROR");
  const metrics = computeMetrics(log);

  // 終了イベントがあればそこまで、無ければ最終行まで
  const endSec = metrics.roastEndSec ?? time[time.length - 1] ?? 0;
  const x = linear(0, Math.max(endSec, 60), PAD.left, PAD.left + PLOT_W);

  const tempMax = Math.max(metrics.peakTemp ?? 0, ...finite(target)) || 240;
  const y = linear(0, Math.ceil(tempMax / 25) * 25, PAD.top + PLOT_H, PAD.top);

  // RoR の軸は焙煎中の帯だけから決める。投入直後のスパイクと、終了後の
  // 冷却で出る大きな負の値をそのまま入れると、肝心の焙煎中がほぼ直線に潰れる。
  const body: number[] = [];
  for (let i = 0; i < time.length; i += 1) {
    const t = time[i];
    const v = ror?.[i];
    if (t === undefined || v === undefined || !Number.isFinite(v)) continue;
    if (t >= ROR_WINDOW_START && t <= endSec - ROR_WINDOW_END_MARGIN)
      body.push(v);
  }
  const r = linear(
    Math.min(Math.floor(Math.min(...body, 0) / 10) * 10, 0),
    Math.max(Math.ceil(Math.max(...body, 10) / 10) * 10, 10),
    PAD.top + PLOT_H,
    PAD.top,
  );

  const out: string[] = [];

  // --- 目盛りとグリッド ---
  if (axes) {
    const tempStep = niceStep(y.max - y.min, 5);
    for (let v = y.min; v <= y.max + 0.001; v += tempStep) {
      const py = round(y.to(v));
      out.push(
        `<line x1="${PAD.left}" y1="${py}" x2="${PAD.left + PLOT_W}" y2="${py}" class="grid"/>`,
        `<text x="${PAD.left - 8}" y="${py + 4}" class="tick tick--y">${v}</text>`,
      );
    }

    // 時間軸は 1 分刻みを基本に、長い焙煎では間引く
    const minuteStep = endSec > 900 ? 120 : 60;
    for (let s = 0; s <= x.max; s += minuteStep) {
      const px = round(x.to(s));
      out.push(
        `<line x1="${px}" y1="${PAD.top}" x2="${px}" y2="${PAD.top + PLOT_H}" class="grid"/>`,
        `<text x="${px}" y="${PAD.top + PLOT_H + TICK_BASELINE}" class="tick tick--x">${mmss(s)}</text>`,
      );
    }

    const rorStep = niceStep(r.max - r.min, 5);
    for (let v = r.min; v <= r.max + 0.001; v += rorStep) {
      out.push(
        `<text x="${PAD.left + PLOT_W + 8}" y="${round(r.to(v)) + 4}" class="tick tick--ror">${round(v)}</text>`,
      );
    }
  }

  // --- 系列 ---
  // 軸の外へ出る区間（RoR のスパイク、終了後の冷却）は枠で切り落とす
  out.push(
    `<g clip-path="url(#roast-plot)">`,
    polyline(time, target, x, y, 'class="line line--target"'),
    polyline(time, ror, x, r, 'class="line line--ror"'),
    polyline(time, meanTemp, x, y, 'class="line line--mean"'),
    polyline(time, temp, x, y, 'class="line line--temp"'),
    `</g>`,
  );

  // --- イベントの縦線 ---
  for (const ev of log.events) {
    if (ev.kind !== "time") continue;
    const name = EVENT_LABELS[ev.name];
    if (!name || ev.value > x.max) continue;
    const px = round(x.to(ev.value));
    out.push(
      `<line x1="${px}" y1="${PAD.top}" x2="${px}" y2="${PAD.top + PLOT_H}" class="event"/>`,
    );
    if (!axes) continue;
    // 右端に寄ったイベントは枠から出るので、ラベルを線の左側へ返す
    const text = `${name} ${mmss(ev.value)}`;
    const flip = px + 4 + textWidth(text, 11) > PAD.left + PLOT_W;
    out.push(
      `<text x="${round(flip ? px - 4 : px + 4)}" y="${PAD.top + 6}" class="event-label"${flip ? ' text-anchor="end"' : ""}>${esc(text)}</text>`,
    );
  }

  // --- 枠と凡例 ---
  out.push(
    `<rect x="${PAD.left}" y="${PAD.top}" width="${PLOT_W}" height="${PLOT_H}" class="frame"/>`,
  );
  if (legend) out.push(legendMarks());

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" class="roast-chart" role="img" aria-label="${esc(label)}">`,
    style(),
    `<defs><clipPath id="roast-plot"><rect x="${PAD.left}" y="${PAD.top}" width="${PLOT_W}" height="${PLOT_H}"/></clipPath></defs>`,
    out.join(""),
    `</svg>`,
  ].join("");
}

/** 凡例。系列の色と線種をそのまま小さく再現する */
function legendMarks(): string {
  const items: [string, string][] = [
    ["line--temp", "豆温度"],
    ["line--mean", "平均温度"],
    ["line--target", "目標"],
    ["line--ror", "RoR（右軸）"],
  ];
  const y = PAD.top + PLOT_H + LEGEND_BASELINE;
  let x = PAD.left;
  return items
    .map(([cls, text]) => {
      const mark = `<line x1="${round(x)}" y1="${y - 4}" x2="${round(x + 16)}" y2="${y - 4}" class="line ${cls}"/>`;
      const labelEl = `<text x="${round(x + 21)}" y="${y}" class="legend">${esc(text)}</text>`;
      x += 21 + textWidth(text, 11) + 20;
      return mark + labelEl;
    })
    .join("");
}

/**
 * 文字の描画幅の概算。canvas が無い環境（ビルド時）でも要るので、
 * 全角は 1em、半角は 0.55em として数えるだけに留める。
 */
function textWidth(text: string, size: number): number {
  let width = 0;
  for (const ch of text) {
    width += /[　-ヿ㐀-鿿＀-｠]/.test(ch) ? size : size * 0.55;
  }
  return width;
}

/**
 * SVG 内のスタイル。色は @theme のトークンを参照するので、
 * ページに埋め込んだときにサイトの配色とずれない。
 */
function style(): string {
  return `<style>
.roast-chart { display: block; width: 100%; height: auto; }
.roast-chart .grid { stroke: var(--color-line); stroke-width: 1; }
.roast-chart .frame { fill: none; stroke: var(--color-line-strong); stroke-width: 1; }
.roast-chart .event { stroke: var(--color-line-strong); stroke-width: 1; stroke-dasharray: 3 3; }
.roast-chart .line { fill: none; stroke-linejoin: round; stroke-linecap: round; }
.roast-chart .line--temp { stroke: var(--color-accent-strong); stroke-width: 2.5; }
.roast-chart .line--mean { stroke: var(--color-accent); stroke-width: 1.2; }
.roast-chart .line--target { stroke: var(--color-ink-faint); stroke-width: 1.2; stroke-dasharray: 5 4; }
.roast-chart .line--ror { stroke: var(--color-roast-ror); stroke-width: 1.4; }
.roast-chart text { font-family: var(--font-sans); fill: var(--color-ink-faint); }
.roast-chart .tick { font-size: 11px; }
.roast-chart .tick--y { text-anchor: end; }
.roast-chart .tick--x { text-anchor: middle; }
.roast-chart .tick--ror { text-anchor: start; fill: var(--color-roast-ror); }
.roast-chart .event-label { font-size: 11px; fill: var(--color-ink-muted); }
.roast-chart .legend { font-size: 11px; fill: var(--color-ink-muted); }
</style>`;
}

/** NaN を落とした値だけ返す（軸の範囲決めに使う） */
function finite(values: number[] | undefined): number[] {
  return (values ?? []).filter((v) => Number.isFinite(v));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
