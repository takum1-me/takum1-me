import {
  computeMetrics,
  series,
  timeSeries,
  valueAt,
  type KlogLog,
} from "./klog";

/**
 * 焙煎ログを「形だけ」に落とした曲線。
 *
 * ページのグラフ（roast-chart）は目盛りも凡例も持つ読むための図だが、
 * こちらは豆カードの背景に敷くための下絵で、座標を 0〜1 に正規化してあるだけ。
 * 置き場所も大きさも描画側が決められる。
 *
 * React の島へも渡すので、生の系列は持たず点を間引いた形にしている
 * （ビルド時にしか読めない .klog をクライアントへ運ばないためでもある）。
 */

/** 名刺の幅（91mm）に敷くなら、これだけあれば折れ線には見えない */
const MAX_POINTS = 120;

/** 温度軸の上限を丸める刻み（ページのグラフと同じ） */
const TEMP_STEP = 25;

/** 曲線の上に印を打つイベントと、その表示名 */
const MARK_LABELS: Record<string, string> = {
  colour_change: "CC",
  first_crack: "1C",
};

export interface RoastCurvePoint {
  /** 投入 0 → 焙煎終了 1 */
  x: number;
  /** 0℃ が 0、温度軸の上限が 1 */
  y: number;
}

export interface RoastCurveMark extends RoastCurvePoint {
  /** "CC" / "1C" */
  name: string;
}

export interface RoastCurve {
  batchId: string;
  /** 選択 UI に出す表示名 */
  label: string;
  /** 豆温度の曲線 */
  points: RoastCurvePoint[];
  /** 曲線上のイベント */
  marks: RoastCurveMark[];
}

/**
 * 焙煎ログ 1 件を正規化した曲線にする。豆温度が読めなければ null。
 * 焙煎終了より後は冷却で急降下するだけなので、曲線には入れない。
 */
export function buildRoastCurve(
  log: KlogLog,
  meta: { batchId: string; label?: string },
): RoastCurve | null {
  const time = timeSeries(log);
  const temp = series(log, "temp");
  if (!temp || time.length === 0) return null;

  const metrics = computeMetrics(log);
  const endSec = metrics.roastEndSec ?? time[time.length - 1] ?? 0;
  const tempMax = Math.ceil((metrics.peakTemp ?? 0) / TEMP_STEP) * TEMP_STEP;
  if (endSec <= 0 || tempMax <= 0) return null;

  const points: RoastCurvePoint[] = [];
  for (let i = 0; i < time.length; i += 1) {
    const t = time[i];
    const v = temp[i];
    if (t === undefined || v === undefined) continue;
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
    if (t < 0 || t > endSec) continue;
    points.push({ x: unit(t / endSec), y: unit(v / tempMax) });
  }
  if (points.length < 2) return null;

  const marks: RoastCurveMark[] = [];
  for (const ev of log.events) {
    if (ev.kind !== "time") continue;
    const name = MARK_LABELS[ev.name];
    if (!name || ev.value <= 0 || ev.value > endSec) continue;
    const at = valueAt(time, temp, ev.value);
    if (at === undefined || !Number.isFinite(at)) continue;
    marks.push({ name, x: unit(ev.value / endSec), y: unit(at / tempMax) });
  }

  return {
    batchId: meta.batchId,
    label: meta.label ?? meta.batchId,
    points: thin(points, MAX_POINTS),
    marks,
  };
}

/** 端点を残したまま等間隔で間引く */
function thin(points: RoastCurvePoint[], max: number): RoastCurvePoint[] {
  if (points.length <= max) return points;
  const stride = (points.length - 1) / (max - 1);
  const out: RoastCurvePoint[] = [];
  for (let i = 0; i < max; i += 1) {
    const point = points[Math.round(i * stride)];
    if (point) out.push(point);
  }
  return out;
}

/** 0〜1 に収めつつ、桁を落として持ち回りを軽くする */
function unit(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 1) * 1e4) / 1e4;
}
