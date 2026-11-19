import React, { useMemo, useState, useEffect, useCallback } from "react";
import type { Bean } from "../../../lib/microcms/beans-list";
import { toArray, beanPath } from "../../../lib/microcms/beans-list";
import {
  flavorColors,
  type FlavorColor,
} from "../../../lib/utils/flavor-color";
import { flavorWordColors } from "../../../lib/utils/flavor-words";
import {
  countryLabel,
  roastLabel,
  processLabel,
  genreLabel,
  varietyLabel,
} from "../../../data/bean-meta";
import { mmss, percent } from "../../../lib/utils/klog";
import type { BeanRoastLogLink } from "../../../lib/roast-logs";
import styles from "./BeansShowcase.module.css";

/** 焙煎ログの日付表示（日時までは要らないので日付だけ） */
function formatLogDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

/**
 * 味の名前を 1 語ずつ色で組む（global.css の .flavor-words）。
 * 色の帯やドットの代わりに、名前そのものに色を入れる。質感・酸の印象の語
 * （kind = "texture"）は色を付けず、味の下に薄い墨で添える。
 * Astro 側の FlavorWords.astro と同じ組み方。
 */
function FlavorWords({
  notes,
  max,
  className,
}: {
  notes: FlavorColor[];
  /** 色を付ける味の語の上限（質感の語は数えない） */
  max?: number;
  className?: string;
}) {
  const flavors = notes.filter((n) => n.kind === "flavor").slice(0, max);
  const textures = notes.filter((n) => n.kind === "texture");
  if (flavors.length === 0 && textures.length === 0) return null;
  return (
    <div className={`flavor-notes${className ? ` ${className}` : ""}`}>
      {flavors.length > 0 && (
        <p className="flavor-words">
          {flavors.map((n, i) => (
            <span
              key={`${n.label}-${i}`}
              className="flavor-words__word"
              style={flavorWordColors(n.colors) as React.CSSProperties}
            >
              {n.label}
            </span>
          ))}
        </p>
      )}
      {textures.length > 0 && (
        <p className="flavor-textures">
          {textures.map((n) => n.label).join(" · ")}
        </p>
      )}
    </div>
  );
}

/** 在庫の表示。緑のベタにはせず、文字の色で示す */
const stockLabel = (available: boolean) =>
  available ? "在庫あり" : "在庫切れ";

/** カード表示に必要な派生データをまとめた型 */
interface BeanView {
  bean: Bean;
  notes: FlavorColor[];
  countries: { label: string; flag: string }[];
  roasts: string[];
  processes: string[];
  genres: string[];
  varieties: string[];
  firstRoastId: string | undefined;
}

function toView(bean: Bean): BeanView {
  const notes = flavorColors(bean.flavorNote, bean.flavorColors);
  const roastIds = toArray(bean.roastLevel);
  return {
    bean,
    notes,
    countries: toArray(bean.country).map(countryLabel),
    roasts: roastIds.map(roastLabel),
    processes: toArray(bean.process).map(processLabel),
    genres: toArray(bean.genre).map(genreLabel),
    varieties: toArray(bean.variety).map(varietyLabel),
    firstRoastId: roastIds[0],
  };
}

function BeanModal({
  view,
  logs,
  onClose,
}: {
  view: BeanView;
  logs: BeanRoastLogLink[];
  onClose: () => void;
}) {
  const { bean, notes } = view;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // 下部スペックは 産地 → 品種 → 精製 → 焙煎度 の 4 つ（genre はヘッダー右上へ）
  const specs: { label: string; value: string }[] = [];
  if (view.countries.length)
    specs.push({
      label: "産地",
      value: view.countries.map((c) => `${c.flag} ${c.label}`).join(", "),
    });
  if (view.varieties.length)
    specs.push({ label: "品種", value: view.varieties.join(", ") });
  if (view.processes.length)
    specs.push({ label: "精製", value: view.processes.join(", ") });
  if (view.roasts.length)
    specs.push({ label: "焙煎度", value: view.roasts.join(", ") });

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={bean.name}
    >
      <div className={styles.modal}>
        <button
          className={`${styles.close} ${styles.label}`}
          onClick={onClose}
          aria-label="閉じる"
        >
          Close ×
        </button>

        <div className={styles["modal-inner"]}>
          <div className={styles["modal-head"]}>
            <div className={styles["modal-head-main"]}>
              <span className={`${styles.label} ${styles.genre}`}>
                {[
                  view.countries.map((c) => c.label).join(" · "),
                  ...view.genres,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
              <h2 className={styles["modal-name"]}>{bean.name}</h2>
            </div>
          </div>

          {bean.expalanation && (
            <p className={styles.explanation}>{bean.expalanation}</p>
          )}

          {notes.length > 0 && (
            <section className={styles.block}>
              <h3 className={`${styles["block-title"]} grid-heading`}>
                Flavor
              </h3>
              <FlavorWords notes={notes} />
            </section>
          )}

          {specs.length > 0 && (
            <section className={styles.block}>
              <h3 className={`${styles["block-title"]} grid-heading`}>Spec</h3>
              <dl className={styles.specs}>
                {specs.map((s) => (
                  <div key={s.label} className={styles["spec-row"]}>
                    <dt className={styles["spec-label"]}>{s.label}</dt>
                    <dd className={styles["spec-value"]}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {logs.length > 0 && (
            <section className={styles.block}>
              <h3 className={`${styles["block-title"]} grid-heading`}>
                Roast logs
              </h3>
              <ul className={styles["log-list"]}>
                {logs.map((log) => (
                  <li key={log.batchId}>
                    <a
                      className={styles["log-link"]}
                      href={`/beans/logs/${log.batchId}`}
                    >
                      <span className={styles["log-id"]}>{log.batchId}</span>
                      <span className={styles["log-meta"]}>
                        {formatLogDate(log.roastedAt)}
                        {" · 1ハゼ "}
                        {mmss(log.firstCrackSec)}
                        {" · Dev "}
                        {percent(log.developmentPercent)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div
            className={styles["modal-foot"]}
            data-available={bean.isAvailable}
          >
            <span className={styles["status-dot"]} />
            {stockLabel(bean.isAvailable)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BeanCard({ view, onOpen }: { view: BeanView; onOpen: () => void }) {
  const { bean, notes } = view;
  const meta = [...view.processes, ...view.roasts].join(" · ");

  // リンクとして扱えるように <a>。通常クリックはモーダルを開き、
  // 修飾キー・中クリックはブラウザに任せて別タブで開けるようにする。
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    onOpen();
  };

  return (
    <a
      className={`${styles.card} link-card`}
      href={beanPath(bean)}
      onClick={onClick}
    >
      <div className={styles.body}>
        <span
          className={`${styles.status} ${styles.label}`}
          data-available={bean.isAvailable}
        >
          {stockLabel(bean.isAvailable)}
        </span>

        <div className={styles.heading}>
          {view.countries.length > 0 && (
            <span className={`${styles.country} ${styles.label}`}>
              {view.countries.map((c) => c.label).join(" / ")}
            </span>
          )}
          <h3 className={styles.name}>{bean.name}</h3>
          {meta && (
            <span className={`${styles.meta} ${styles.label}`}>{meta}</span>
          )}
        </div>

        {/* カードでは味を 3 つまで。残りは豆を開くと全部見られる */}
        <FlavorWords notes={notes} max={3} className={styles.flavors} />
      </div>
    </a>
  );
}

type Filter = "all" | "available";

/** /beans/<id> で直接開いたときの URL に戻す（一覧は /beans） */
const LIST_PATH = "/beans";

export default function BeansShowcase({
  beans,
  initialBeanId = null,
  roastLogs = {},
}: {
  beans: Bean[];
  /** /beans/<id> で来たとき、その豆のモーダルを開いた状態で始める */
  initialBeanId?: string | null;
  /** 豆 ID → その豆の焙煎ログ（新しい順）。モーダルからバッチへ辿らせる */
  roastLogs?: Record<string, BeanRoastLogLink[]>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(initialBeanId);

  const views = useMemo(() => beans.map(toView), [beans]);

  // 戻る/進むで URL とモーダルの開閉を合わせる
  useEffect(() => {
    const sync = () => {
      const id = window.location.pathname
        .replace(/\/+$/, "")
        .slice(`${LIST_PATH}/`.length);
      setOpenId(
        window.location.pathname.startsWith(`${LIST_PATH}/`) ? id : null,
      );
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  /** モーダルを開く。URL も /beans/<id> にして、そのままリンクを送れるようにする */
  const open = useCallback((id: string) => {
    setOpenId(id);
    const path = `${LIST_PATH}/${id}`;
    if (window.location.pathname !== path)
      window.history.pushState({ beanId: id }, "", path);
  }, []);

  const filtered = useMemo(
    () =>
      filter === "available" ? views.filter((v) => v.bean.isAvailable) : views,
    [views, filter],
  );

  const openView = useMemo(
    () => views.find((v) => v.bean.id === openId) ?? null,
    [views, openId],
  );

  const close = useCallback(() => {
    setOpenId(null);
    if (window.location.pathname !== LIST_PATH)
      window.history.pushState({}, "", LIST_PATH);
  }, []);

  if (beans.length === 0) {
    return (
      <div className={styles.wrapper}>
        <p className={`${styles.cell} ${styles.empty}`}>まだ豆がありません。</p>
      </div>
    );
  }

  const availableCount = views.filter((v) => v.bean.isAvailable).length;
  // 3 列の最終行が欠けたとき、罫線の地色がのぞかないよう埋め草のマスで塞ぐ
  const fillerCount = (3 - (filtered.length % 3)) % 3;

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.cell} ${styles.filters}`}>
        <h2 className="grid-heading">Filter</h2>
        <div className={styles["filter-buttons"]}>
          <button
            className="box-button"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
            type="button"
          >
            すべて ({views.length})
          </button>
          <button
            className="box-button"
            aria-pressed={filter === "available"}
            onClick={() => setFilter("available")}
            type="button"
          >
            在庫あり ({availableCount})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={`${styles.cell} ${styles.empty}`}>
          いま在庫のある豆はありません。
        </p>
      ) : (
        <>
          {filtered.map((view) => (
            <BeanCard
              key={view.bean.id}
              view={view}
              onOpen={() => open(view.bean.id)}
            />
          ))}
          {Array.from({ length: fillerCount }, (_, i) => (
            <div key={`filler-${i}`} className={styles.filler} />
          ))}
        </>
      )}

      {openView && (
        <BeanModal
          view={openView}
          logs={roastLogs[openView.bean.id] ?? []}
          onClose={close}
        />
      )}
    </div>
  );
}
