import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseKlog,
  computeMetrics,
  deriveBatchId,
  parseRoastDate,
  stripMachineSerial,
  mmss,
  percent,
  celsius,
  type KlogLog,
  type RoastMetrics,
} from "../../../lib/utils/klog";
import { buildRoastChartSvg } from "../../../lib/utils/roast-chart";
import type { Bean } from "../../../lib/microcms/beans-list";
import styles from "./RoastLogUploader.module.css";

/**
 * 焙煎ログを取り込むローカル専用ツール（/beans/logs/upload）。
 *
 * サイトは静的ビルドなので、ブラウザから直接どこかへ保存はできない。
 * ここでやるのは「パースが通るか確かめて、豆を紐付けて、リポジトリに
 * 置くファイルを書き出す」ところまで。あとは書き出した 2 つを
 * src/data/roast-logs/ に置いて commit する。
 */

/** 既存マニフェストの 1 バッチ分 */
interface BatchMeta {
  beanId?: string | null;
  note?: string;
}

/** すでにリポジトリに入っているログ 1 件分 */
interface SavedLog {
  batchId: string;
  roastedAt?: string;
  beanId?: string;
  note?: string;
}

interface Props {
  beans: Bean[];
  /** src/data/roast-logs/index.json の中身（ビルド時に読んで渡す） */
  manifest: { batches?: Record<string, BatchMeta> };
  /** すでに取り込んである分（新しい順） */
  saved?: SavedLog[];
}

/** 取り込んだ 1 ファイル分の状態 */
interface Entry {
  /** リストの key（同名ファイルを続けて読んでも衝突しない） */
  key: string;
  fileName: string;
  text: string;
  /** パースできなかった場合の理由 */
  error?: string;
  batchId?: string;
  roastedAt?: string;
  log?: KlogLog;
  metrics?: RoastMetrics;
  beanId: string;
  note: string;
}

let seq = 0;

/** 読み直しをまたいで結果を渡すためのキー */
const RESULT_KEY = "roast-log-upload-result";
/** 保存を投げたまま読み直された、という印 */
const PENDING_KEY = "roast-log-upload-pending";

/** サーバーが持っている直近の実行結果 */
interface LastRun {
  state: "running" | "done" | "error";
  written?: string[];
  dir?: string;
  error?: string;
  git?: {
    branch: string;
    committed: boolean;
    sha?: string;
    pushed: boolean;
    detail?: string;
  };
}

/** 実行結果を 1 行の文にする */
function describeRun(run: LastRun): string {
  if (run.state === "error") return `保存できませんでした（${run.error}）`;
  const saved = `${run.dir} に保存しました（${run.written?.join(", ")}）`;
  const git = run.git;
  if (!git) return saved;
  if (!git.committed) return `${saved}。commit は${git.detail}`;
  if (git.pushed)
    return `${saved}。${git.branch} に ${git.sha} を commit して push しました`;
  return `${saved}。${git.sha} を commit しましたが、${git.detail}`;
}

export default function RoastLogUploader({
  beans,
  manifest,
  saved = [],
}: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const existing = manifest.batches ?? {};

  /** 読み込んだファイルを Entry にする */
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Entry[] = [];
    for (const file of Array.from(files)) {
      seq += 1;
      const key = `${file.name}-${seq}`;
      if (!/\.klog$/i.test(file.name)) {
        next.push({
          key,
          fileName: file.name,
          text: "",
          error: ".klog ではありません",
          beanId: "",
          note: "",
        });
        continue;
      }
      // 保存も書き出しもこの text を使うので、取り込んだ時点で 1 度だけ落とす
      const text = stripMachineSerial(await file.text());
      const log = parseKlog(text);
      if (!log) {
        next.push({
          key,
          fileName: file.name,
          text,
          error: "焙煎ログとして読めませんでした（列見出しが見つかりません）",
          beanId: "",
          note: "",
        });
        continue;
      }
      const batchId = deriveBatchId(log);
      const meta = batchId ? existing[batchId] : undefined;
      next.push({
        key,
        fileName: file.name,
        text,
        batchId,
        roastedAt: parseRoastDate(log.header.roast_date),
        log,
        metrics: computeMetrics(log),
        error: batchId
          ? undefined
          : "焙煎日（roast_date）が読めないのでバッチ ID を作れません",
        beanId: meta?.beanId ?? "",
        note: meta?.note ?? "",
      });
    }
    setEntries((prev) => [...prev, ...next]);
  };

  const update = (key: string, patch: Partial<Entry>) =>
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    );

  const remove = (key: string) =>
    setEntries((prev) => prev.filter((e) => e.key !== key));

  /** 既存 + 取り込み分をマージした index.json */
  const mergedManifest = useMemo(() => {
    const batches: Record<string, BatchMeta> = {};
    for (const [id, meta] of Object.entries(existing))
      batches[id] = { ...meta };
    for (const entry of entries) {
      if (!entry.batchId || entry.error) continue;
      batches[entry.batchId] = {
        beanId: entry.beanId || null,
        note: entry.note,
      };
    }
    // バッチ ID 順に並べ替えて、差分が読みやすい JSON にする
    const sorted: Record<string, BatchMeta> = {};
    for (const id of Object.keys(batches).sort()) sorted[id] = batches[id]!;
    return {
      $comment:
        "バッチ ID → 手で足すメタデータ。beanId は microCMS（takum1-coffee）の豆 ID。/beans/logs/upload で生成できる。",
      batches: sorted,
    };
  }, [entries, existing]);

  const ready = entries.filter((e) => e.batchId && !e.error);

  /**
   * src/data/roast-logs/ へ直接書き込む（dev サーバーのエンドポイント）。
   * commit を渡すと、書いたあとに commit と push まで走る。
   *
   * ファイルを書いた時点で Vite がページを読み直すので、commit / push の
   * レスポンスはたいてい受け取れない。投げる前に印を付けておき、読み直した
   * あとはサーバーの結果を取りに行って表示する。
   */
  const [saving, setSaving] = useState<"save" | "commit" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(() =>
    typeof sessionStorage === "undefined"
      ? null
      : sessionStorage.getItem(RESULT_KEY),
  );

  const report = (message: string) => {
    setResult(message);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(RESULT_KEY, message);
      sessionStorage.removeItem(PENDING_KEY);
    }
  };

  // 投げたまま読み直された場合は、終わるまでサーバーに聞きに行く
  useEffect(() => {
    if (sessionStorage.getItem(PENDING_KEY) === null) return;
    let alive = true;
    setSaving("commit");
    const tick = async () => {
      while (alive) {
        try {
          const res = await fetch("/__roast-logs");
          const { last } = (await res.json()) as { last: LastRun | null };
          if (last && last.state !== "running") {
            report(describeRun(last));
            setEntries([]);
            break;
          }
        } catch {
          // dev サーバーが落ちていれば次の周回で拾う
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (alive) setSaving(null);
    };
    void tick();
    return () => {
      alive = false;
    };
  }, []);

  const saveToRepo = async (commit: boolean) => {
    setSaving(commit ? "commit" : "save");
    setResult(null);
    sessionStorage.removeItem(RESULT_KEY);
    // 読み直されても、投げたことが分かるようにしておく
    if (commit) sessionStorage.setItem(PENDING_KEY, "1");
    try {
      const response = await fetch("/__roast-logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          commit,
          files: [
            ...ready.map((entry) => ({
              name: `${entry.batchId}.klog`,
              text: entry.text,
            })),
            {
              name: "index.json",
              text: `${JSON.stringify(mergedManifest, null, 2)}\n`,
            },
          ],
        }),
      });
      const payload = (await response.json()) as LastRun & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "保存に失敗しました");
      report(describeRun(payload));
      setEntries([]);
    } catch (error) {
      // 読み直しで切れただけなら、上の useEffect が結果を拾い直す
      if (sessionStorage.getItem(PENDING_KEY) === null) {
        report(
          `保存できませんでした（${error instanceof Error ? error.message : "不明なエラー"}）。下のボタンで書き出して手で置いてください。`,
        );
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={styles.page}>
      <label
        className={`${styles.drop} ${over ? styles["drop--over"] : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        <strong>.klog をドロップ、またはクリックして選択</strong>
        <span className={styles.hint}>
          複数まとめて読み込めます。ここでは何も送信しません（ブラウザ内で読むだけ）。
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".klog"
          multiple
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {entries.map((entry) => (
        <div
          key={entry.key}
          className={`${styles.entry} ${entry.error ? styles["entry--bad"] : ""}`}
        >
          <div className={styles.head}>
            <span className={styles.batch}>{entry.batchId ?? "—"}</span>
            <span className={styles.file}>{entry.fileName}</span>
          </div>

          {entry.error ? (
            <p className={styles.warn}>{entry.error}</p>
          ) : (
            <>
              {entry.batchId && existing[entry.batchId] && (
                <p className={styles.warn}>
                  このバッチ ID はすでに index.json にあります。書き出すと
                  上書きになります。
                </p>
              )}

              <div className={styles.stats}>
                <Stat
                  label="焙煎日時"
                  value={formatDateTime(entry.roastedAt)}
                />
                <Stat
                  label="プロファイル"
                  value={entry.log?.header.profile_short_name ?? "—"}
                />
                <Stat
                  label="1ハゼ"
                  value={mmss(entry.metrics?.firstCrackSec)}
                />
                <Stat label="合計" value={mmss(entry.metrics?.totalSec)} />
                <Stat
                  label="Dev"
                  value={percent(entry.metrics?.developmentPercent)}
                />
                <Stat
                  label="最高温度"
                  value={celsius(entry.metrics?.peakTemp)}
                />
              </div>

              {entry.log && (
                <div
                  className={styles.chart}
                  // グラフはビルド時と同じ関数で組んだ SVG 文字列
                  dangerouslySetInnerHTML={{
                    __html: buildRoastChartSvg(entry.log, {
                      label: `${entry.batchId} の焙煎グラフ`,
                    }),
                  }}
                />
              )}

              <div className={styles.fields}>
                <label className={styles.field}>
                  <span className={styles.field__label}>豆</span>
                  <select
                    value={entry.beanId}
                    onChange={(e) =>
                      update(entry.key, { beanId: e.target.value })
                    }
                  >
                    <option value="">紐付けなし</option>
                    {beans.map((bean) => (
                      <option key={bean.id} value={bean.id}>
                        {bean.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.field__label}>メモ</span>
                  <input
                    type="text"
                    value={entry.note}
                    placeholder="任意。一覧と詳細に出ます"
                    onChange={(e) =>
                      update(entry.key, { note: e.target.value })
                    }
                  />
                </label>
              </div>
            </>
          )}

          <div className={styles.actions}>
            {entry.batchId && !entry.error && (
              <button
                type="button"
                className={styles.button}
                onClick={() =>
                  download(`${entry.batchId}.klog`, entry.text, "text/plain")
                }
              >
                {entry.batchId}.klog を保存
              </button>
            )}
            <button
              type="button"
              className={`${styles.button} ${styles["button--ghost"]}`}
              onClick={() => remove(entry.key)}
            >
              外す
            </button>
          </div>
        </div>
      ))}

      {confirming && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="commit と push の確認"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirming(false);
          }}
        >
          <div className={styles.dialog}>
            <h2 className={styles.dialog__title}>commit して push します</h2>
            <p className={styles.dialog__lead}>
              下の {ready.length} 件を <code>src/data/roast-logs/</code>{" "}
              に書いて commit し、そのまま push します。push すると CI と
              デプロイが動きます。メモはここでも直せます。
            </p>

            <ul className={styles.dialog__list}>
              {ready.map((entry) => (
                <li key={entry.key} className={styles.dialog__item}>
                  <div className={styles.dialog__head}>
                    <span className={styles.batch}>{entry.batchId}</span>
                    <span className={styles.file}>
                      {beanName(beans, entry.beanId)}
                    </span>
                  </div>
                  <label className={styles.field}>
                    <span className={styles.field__label}>メモ</span>
                    <input
                      type="text"
                      value={entry.note}
                      placeholder="任意。一覧と詳細に出ます"
                      onChange={(e) =>
                        update(entry.key, { note: e.target.value })
                      }
                    />
                  </label>
                </li>
              ))}
            </ul>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setConfirming(false);
                  void saveToRepo(true);
                }}
              >
                commit して push
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles["button--ghost"]}`}
                onClick={() => setConfirming(false)}
              >
                やめる
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.steps}>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={ready.length === 0 || saving !== null}
            onClick={() => setConfirming(true)}
          >
            {saving === "commit"
              ? "commit して push 中…"
              : `保存して commit & push（${ready.length} 件）`}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles["button--ghost"]}`}
            disabled={ready.length === 0 || saving !== null}
            onClick={() => void saveToRepo(false)}
          >
            {saving === "save" ? "保存中…" : "保存だけ"}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles["button--ghost"]}`}
            disabled={ready.length === 0 || saving !== null}
            onClick={() =>
              download(
                "index.json",
                `${JSON.stringify(mergedManifest, null, 2)}\n`,
                "application/json",
              )
            }
          >
            index.json だけ書き出す
          </button>
        </div>

        {result && <p className={styles.result}>{result}</p>}

        <ol>
          <li>
            <strong>保存して commit &amp; push</strong> は、
            <code>&lt;バッチ ID&gt;.klog</code> と <code>index.json</code> を{" "}
            <code>src/data/roast-logs/</code> に書いて、そのまま commit と push
            まで走らせます
          </li>
          <li>
            stage するのは <code>src/data/roast-logs/</code>{" "}
            だけなので、作業中の他の変更は巻き込みません。push すると CI と
            Cloudflare のデプロイが動きます
          </li>
          <li>
            まだ公開したくないときは <strong>保存だけ</strong>{" "}
            を使ってください（ファイルを書くところまで）
          </li>
        </ol>
      </div>

      <section className={styles.saved}>
        <h2 className={styles.saved__title}>
          取り込み済み{" "}
          <span className={styles.saved__count}>{saved.length}</span>
        </h2>
        {saved.length === 0 ? (
          <p className={styles.hint}>まだ 1 件もありません。</p>
        ) : (
          <ul className={styles.saved__list}>
            {saved.map((log) => (
              <li key={log.batchId}>
                <a
                  className={styles.saved__link}
                  href={`/beans/logs/${log.batchId}`}
                >
                  <span className={styles.saved__no}>
                    {logNumber(log.batchId)}
                  </span>
                  <span className={styles.saved__body}>
                    <span className={styles.saved__id}>{log.batchId}</span>
                    <span className={styles.saved__meta}>
                      {formatDateTime(log.roastedAt)} ·{" "}
                      {beanName(beans, log.beanId ?? "")}
                      {log.note ? ` · ${log.note}` : ""}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * バッチ ID から焙煎機のログ番号だけを取り出す（"20260729-0049" → "0049"）。
 * 次に何番を上げるかはこの番号で見るので、一覧ではここを主役にする。
 */
function logNumber(batchId: string): string {
  return batchId.split("-")[1] ?? batchId;
}

/** 選んだ豆の名前。未選択なら分かるように書く */
function beanName(beans: Bean[], beanId: string): string {
  if (!beanId) return "豆の紐付けなし";
  return beans.find((b) => b.id === beanId)?.name ?? beanId;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.stat__label}>{label}</span>
      <span className={styles.stat__value}>{value}</span>
    </div>
  );
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

/** 文字列をファイルとして保存する */
function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: `${type};charset=utf-8` }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
