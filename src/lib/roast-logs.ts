import {
  parseKlog,
  computeMetrics,
  deriveBatchId,
  parseRoastDate,
  type KlogLog,
  type RoastMetrics,
} from "./utils/klog";
import manifest from "../data/roast-logs/index.json";

/**
 * 焙煎ログの読み込み（ビルド時のみ）。
 *
 * `.klog` は `src/data/roast-logs/` にコミットしておき、ここでまとめて読む。
 * ファイル名はバッチ ID（`20260627-0023.klog`）に揃える。豆との紐付けと
 * メモだけは自動で決まらないので、同じディレクトリの `index.json` に置く
 * （どちらも /beans/logs/upload が書き出す）。
 *
 * 読み込みに import.meta.glob を使うのは、`process.cwd()` に依存せず
 * dev と本番ビルドで同じように解決されるため。
 */

/** index.json の 1 バッチ分 */
interface BatchMeta {
  /** microCMS（takum1-coffee）の豆 ID。未設定なら null */
  beanId?: string | null;
  note?: string;
}

const META =
  (manifest as { batches?: Record<string, BatchMeta> }).batches ?? {};

const FILES = import.meta.glob<string>("../data/roast-logs/*.klog", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** 一覧に出す 1 バッチ分。グラフに要る生データは持たない */
export interface RoastLogSummary {
  batchId: string;
  /** 焙煎日時（ISO）。ヘッダから取れなければ undefined */
  roastedAt?: string;
  /** 使ったプロファイル名（例: "D-Light"） */
  profileName?: string;
  /** 焙煎レベル（0〜1 の設定値） */
  roastingLevel?: number;
  beanId?: string;
  note?: string;
  metrics: RoastMetrics;
}

export interface RoastLogRecord extends RoastLogSummary {
  log: KlogLog;
}

/** ファイル名からバッチ ID（"…/20260627-0023.klog" → "20260627-0023"） */
function batchIdFromPath(filePath: string): string {
  return (
    filePath
      .split("/")
      .pop()
      ?.replace(/\.klog$/i, "") ?? filePath
  );
}

let cache: RoastLogRecord[] | undefined;

/**
 * すべての焙煎ログを新しい順で返す。
 * バッチ ID はファイル名を正とし、ログ側から導ける ID と食い違う場合は
 * 取り違えたまま公開されると困るので、ビルドを落とす。
 */
export function getRoastLogs(): RoastLogRecord[] {
  if (cache) return cache;

  const records: RoastLogRecord[] = [];
  for (const [filePath, text] of Object.entries(FILES)) {
    const batchId = batchIdFromPath(filePath);
    const log = parseKlog(text);
    if (!log) {
      throw new Error(`焙煎ログをパースできませんでした: ${filePath}`);
    }

    const derived = deriveBatchId(log);
    if (derived && derived !== batchId) {
      throw new Error(
        `バッチ ID がファイル名と一致しません: ${filePath} は ${derived} のはずです`,
      );
    }

    const meta = META[batchId] ?? {};
    records.push({
      batchId,
      roastedAt: parseRoastDate(log.header.roast_date),
      profileName: log.header.profile_short_name,
      roastingLevel: numberOf(log.header.roasting_level),
      beanId: meta.beanId ?? undefined,
      note: meta.note || undefined,
      metrics: computeMetrics(log),
      log,
    });
  }

  // 焙煎日時の新しい順。日時が無いものはバッチ ID で最後に寄せる
  records.sort((a, b) => (b.roastedAt ?? "").localeCompare(a.roastedAt ?? ""));
  cache = records;
  return records;
}

/** 一覧・検索用の軽い形（生の系列を落とす） */
export function toSummary(record: RoastLogRecord): RoastLogSummary {
  const { log: _log, ...summary } = record;
  return summary;
}

/** バッチ ID 1 件を引く */
export function getRoastLog(batchId: string): RoastLogRecord | undefined {
  return getRoastLogs().find((r) => r.batchId === batchId);
}

/** 豆 ID に紐づく焙煎ログ（新しい順） */
export function getRoastLogsByBean(beanId: string): RoastLogRecord[] {
  return getRoastLogs().filter((r) => r.beanId === beanId);
}

/** 豆モーダルに出す 1 件分。React へ渡すので生の系列は含めない */
export interface BeanRoastLogLink {
  batchId: string;
  roastedAt?: string;
  firstCrackSec?: number;
  totalSec?: number;
  developmentPercent?: number;
}

/**
 * 豆 ID → その豆の焙煎ログ（新しい順）。
 * 紐付けの無いログは入らない。
 */
export function getRoastLogLinksByBean(): Record<string, BeanRoastLogLink[]> {
  const map: Record<string, BeanRoastLogLink[]> = {};
  for (const record of getRoastLogs()) {
    if (!record.beanId) continue;
    (map[record.beanId] ??= []).push({
      batchId: record.batchId,
      roastedAt: record.roastedAt,
      firstCrackSec: record.metrics.firstCrackSec,
      totalSec: record.metrics.totalSec,
      developmentPercent: record.metrics.developmentPercent,
    });
  }
  return map;
}

function numberOf(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}
