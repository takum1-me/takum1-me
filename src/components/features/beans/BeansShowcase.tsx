import React, { useMemo, useState, useEffect, useCallback } from "react";
import type { Bean } from "../../../lib/microcms/beans-list";
import { toArray, beanPath } from "../../../lib/microcms/beans-list";
import {
  flavorColors,
  buildFlavorSwatch,
  noteDotBackground,
  type FlavorColor,
} from "../../../lib/utils/flavor-color";
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

/** カード表示に必要な派生データをまとめた型 */
interface BeanView {
  bean: Bean;
  notes: FlavorColor[];
  background: string;
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
    background: buildFlavorSwatch(
      // 1 語に複数色ある場合はすべてスウォッチに参加させる
      notes.flatMap((n) => n.colors),
      roastIds[0],
    ),
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

  // 下部スペックは Origin → Variety → Process → Roast の 4 つ（genre はヘッダー右上へ）
  const specs: { label: string; value: string }[] = [];
  if (view.countries.length)
    specs.push({
      label: "Origin",
      value: view.countries.map((c) => `${c.flag} ${c.label}`).join(", "),
    });
  if (view.varieties.length)
    specs.push({ label: "Variety", value: view.varieties.join(", ") });
  if (view.processes.length)
    specs.push({ label: "Process", value: view.processes.join(", ") });
  if (view.roasts.length)
    specs.push({ label: "Roast", value: view.roasts.join(", ") });

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={bean.name}
    >
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose} aria-label="閉じる">
          ×
        </button>

        <div className={styles["modal-inner"]}>
          <div className={styles["modal-head"]}>
            <div className={styles["modal-head-main"]}>
              <span className={styles.country}>
                {view.countries.map((c) => `${c.flag} ${c.label}`).join(" · ")}
              </span>
              <h2 className={styles["modal-name"]}>{bean.name}</h2>
            </div>
            {view.genres.length > 0 && (
              <span className={styles.genre}>{view.genres.join(" / ")}</span>
            )}
          </div>

          {bean.expalanation && (
            <p className={styles.explanation}>{bean.expalanation}</p>
          )}

          {notes.length > 0 && (
            <section className={styles.block}>
              <h3 className={styles["block-title"]}>Flavor</h3>
              <div
                className={styles.hero}
                style={{ background: view.background }}
              />
              <div className={styles["note-list"]}>
                {notes.map((n, i) => (
                  <span
                    key={`${n.label}-${i}`}
                    className={styles["note-tag"]}
                    style={
                      {
                        "--color-note": n.color,
                        "--color-note-bg": noteDotBackground(n.colors),
                      } as React.CSSProperties
                    }
                  >
                    <span className={styles["note-tag-dot"]} />
                    {n.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {specs.length > 0 && (
            <section className={styles.block}>
              <h3 className={styles["block-title"]}>Spec</h3>
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
              <h3 className={styles["block-title"]}>Roast logs</h3>
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
            {bean.isAvailable ? "In Stock — 焙煎できます" : "Sold Out"}
          </div>
        </div>
      </div>
    </div>
  );
}

function BeanCard({
  view,
  index,
  onOpen,
}: {
  view: BeanView;
  index: number;
  onOpen: () => void;
}) {
  const { bean, notes } = view;
  const visibleNotes = notes.slice(0, 4);
  const rest = notes.length - visibleNotes.length;

  // リンクとして扱えるように <a>。通常クリックはモーダルを開き、
  // 修飾キー・中クリックはブラウザに任せて別タブで開けるようにする。
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    onOpen();
  };

  return (
    <a className={styles.card} href={beanPath(bean)} onClick={onClick}>
      <div className={styles.body}>
        <div className={styles["card-top"]}>
          <span className={styles.index}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={styles.status} data-available={bean.isAvailable}>
            <span className={styles["status-dot"]} />
            {bean.isAvailable ? "In Stock" : "Sold Out"}
          </span>
        </div>

        {view.countries.length > 0 && (
          <span className={styles.country}>
            <span className={styles.flag}>{view.countries[0].flag}</span>
            {view.countries.map((c) => c.label).join(" / ")}
          </span>
        )}

        <h3 className={styles.name}>{bean.name}</h3>

        {visibleNotes.length > 0 && (
          <ul className={styles["note-row"]}>
            {visibleNotes.map((n, i) => (
              <li key={`${n.label}-${i}`} className={styles["note-item"]}>
                <span
                  className={styles["note-dot"]}
                  style={
                    {
                      "--color-note": n.color,
                      "--color-note-bg": noteDotBackground(n.colors),
                    } as React.CSSProperties
                  }
                />
                {n.label}
              </li>
            ))}
            {rest > 0 && <li className={styles["note-more"]}>+{rest}</li>}
          </ul>
        )}

        <div className={styles["card-foot"]}>
          <span>{view.roasts.join(" / ") || "—"}</span>
          <span className={styles["foot-divider"]} />
          <span>{view.processes.join(" / ") || "—"}</span>
        </div>
      </div>

      <div className={styles.swatch} style={{ background: view.background }}>
        <span className={styles["swatch-edge"]} />
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
        <p className={styles.empty}>
          まだ豆が登録されていません。microCMS の beans-list
          に追加すると、ここに雰囲気つきで並びます。
        </p>
      </div>
    );
  }

  const availableCount = views.filter((v) => v.bean.isAvailable).length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        <button
          className={styles.filter}
          data-active={filter === "all"}
          onClick={() => setFilter("all")}
          type="button"
        >
          All ({views.length})
        </button>
        <button
          className={styles.filter}
          data-active={filter === "available"}
          onClick={() => setFilter("available")}
          type="button"
        >
          In Stock ({availableCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>該当する豆がありません。</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((view, i) => (
            <BeanCard
              key={view.bean.id}
              view={view}
              index={i}
              onOpen={() => open(view.bean.id)}
            />
          ))}
        </div>
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
