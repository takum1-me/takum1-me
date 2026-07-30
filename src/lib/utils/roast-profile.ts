import fs from "node:fs";
import path from "node:path";

/** 焙煎プロファイルの 1 点（経過秒・豆温度℃） */
export interface RoastPoint {
  timeSec: number;
  temp: number;
}

/** "420"（秒）または "7:00"（mm:ss）を秒に変換する */
export function parseTimeToSec(t: string): number | null {
  const trimmed = t.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  const m = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return null;
}

/**
 * public/ 配下の CSV を読み込む（ビルド時のみ実行される）。
 * 1 列目: 経過秒 or mm:ss、2 列目: 豆温度℃。数値にならない行（ヘッダー）は無視。
 */
export function loadRoastCsv(publicPath: string): RoastPoint[] {
  const abs = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return [];

  const lines = fs.readFileSync(abs, "utf8").trim().split(/\r?\n/);
  const points: RoastPoint[] = [];
  for (const line of lines) {
    const [t, v] = line.split(",");
    if (t === undefined || v === undefined) continue;
    const timeSec = parseTimeToSec(t);
    const temp = parseFloat(v);
    if (timeSec === null || Number.isNaN(temp)) continue;
    points.push({ timeSec, temp });
  }
  return points.sort((a, b) => a.timeSec - b.timeSec);
}

/** 秒 → "m:ss" 表記 */
export function formatMinSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
