import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  splitFlavorNotes,
  splitFlavorColors,
  joinColorSlot,
  isHexColor,
  matchFlavorColor,
  buildFlavorSwatch,
  noteDotBackground,
  normalizeHex,
  DEFAULT_COLOR,
} from "../../../lib/utils/flavor-color";
import { ZoomableWheel } from "../../features/flavor-wheel";
import { flavorWheelSegments } from "../../../data/flavor-wheel-segments";
import type { WheelSegment } from "../../../data/wheel-segment";
import { toArray, type Bean } from "../../../lib/microcms/beans-list";
import {
  countryLabel,
  roastLabel,
  processLabel,
  genreLabel,
  varietyLabel,
} from "../../../data/bean-meta";
import {
  buildBeanCardSvg,
  ensureCardFonts,
  beanCardFileName,
  type BeanCardData,
} from "../../../lib/utils/bean-card";

/**
 * /beans/color-tool（ローカル専用）で使う色決めツール。
 * 最初は空の状態で、microCMS から取った豆を選ぶとその flavorNote / flavorColors を読み込む。
 * フレーバーホイールから語を選ぶと、その語と公式カラーが同時に入る。
 * 手入力した語やホイールに無い語は、色ピッカー / HEX で個別に指定できる。
 * 1 語に複数色を当てられる（"raspberry-chocolate" など）ので、
 * 出力 CSV ではスロット内を "|" で区切る。並び順は ↑↓ で入れ替える。
 * 最終的に microCMS の flavorColors に貼る CSV を出力する。
 */

const ROASTS = ["light", "medium", "medium-dark", "dark"];

/**
 * HEX 入力欄のゆるい正規化。"F2C312" のように # なしで打っても色として扱えるようにし、
 * "rgb(242, 195, 18)" の貼り付けも HEX に直す。入力途中の値はそのまま返す。
 */
function normalizeHexInput(raw: string): string {
  const v = raw.trim();
  if (v === "") return "";
  if (/^rgba?\(/i.test(v)) return normalizeHex(v);
  const body = v.replace(/^#+/, "");
  if (/^[0-9a-f]*$/i.test(body)) return `#${body.toUpperCase()}`;
  return v;
}

/** "2026-07-30" → "2026.07.30"（カード表示用） */
function formatRoastDate(value: string): string {
  return value.replace(/-/g, ".");
}

/** input[type=date] 用の今日（ローカル日付） */
function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** プレビューの SVG を横幅いっぱいに伸ばすためのクラス名 */
const CARD_PREVIEW_CLASS = "bean-card-preview";

/** ホイールでの選択を「行の置換」に使うか「行への色追加」に使うか */
type TargetMode = "replace" | "add";

interface Target {
  index: number;
  mode: TargetMode;
}

export default function FlavorColorTool({ beans = [] }: { beans?: Bean[] }) {
  const [note, setNote] = useState("");
  const [roast, setRoast] = useState("medium");
  // index -> 上書き色の配列（未設定は「自動マッチのまま」）
  const [overrides, setOverrides] = useState<Record<number, string[]>>({});
  // ホイール選択の適用先。null なら新しい語として末尾に追加する
  const [target, setTarget] = useState<Target | null>(null);
  // 読み込み中の豆（表示用。編集内容は豆に書き戻さない）
  const [beanId, setBeanId] = useState<string | null>(null);
  // カードに載せる焙煎日（microCMS に roastDate があればそれ、無ければ今日）
  const [roastDate, setRoastDate] = useState(today());

  /** 豆を選ぶ → その豆の flavorNote / flavorColors / 焙煎度を読み込む */
  const loadBean = (bean: Bean) => {
    setBeanId(bean.id);
    setNote(bean.flavorNote ?? "");
    setRoast(toArray(bean.roastLevel)[0] ?? "medium");
    setRoastDate(bean.roastDate?.slice(0, 10) ?? today());
    setTarget(null);
    const next: Record<number, string[]> = {};
    splitFlavorColors(bean.flavorColors).forEach((slot, i) => {
      if (slot) next[i] = slot;
    });
    setOverrides(next);
  };

  /** 何も読み込んでいない状態に戻す */
  const resetAll = () => {
    setBeanId(null);
    setNote("");
    setOverrides({});
    setTarget(null);
  };

  const notes = useMemo(() => splitFlavorNotes(note), [note]);

  const rows = notes.map((label, i) => {
    const auto = matchFlavorColor(label);
    const offWheel = auto.color === DEFAULT_COLOR;
    const override = overrides[i];
    const colors = override ?? auto.colors;
    return {
      label,
      auto: auto.colors,
      offWheel,
      overridden: override !== undefined,
      // 入力中の未完成な HEX も保持したいので raw と表示用を分ける
      colors,
      display: colors.map(normalizeHex),
    };
  });

  const background = buildFlavorSwatch(
    rows.flatMap((r) => r.display),
    roast,
  );

  // 出力 CSV: 各語の上書き値を同順で連結し、末尾の空欄は詰める
  const csv = useMemo(() => {
    const arr = notes.map((_, i) => {
      const slot = overrides[i]?.filter(isHexColor);
      return slot && slot.length > 0 ? joinColorSlot(slot) : "";
    });
    while (arr.length && arr[arr.length - 1] === "") arr.pop();
    return arr.join(",");
  }, [notes, overrides]);

  /** その行の実効色（未上書きなら自動マッチ結果） */
  const colorsAt = useCallback(
    (i: number) => overrides[i] ?? matchFlavorColor(notes[i] ?? "").colors,
    [overrides, notes],
  );

  const setSlot = (i: number, colors: string[]) =>
    setOverrides((o) => ({ ...o, [i]: colors }));

  const clearSlot = (i: number) =>
    setOverrides((o) => {
      const next = { ...o };
      delete next[i];
      return next;
    });

  /** 行の k 番目の色を差し替える */
  const setColorAt = (i: number, k: number, hex: string) => {
    const next = [...colorsAt(i)];
    next[k] = hex;
    setSlot(i, next);
  };

  /** 行に色を 1 つ足す（初期値は末尾の色） */
  const addColorAt = (i: number) => {
    const current = colorsAt(i);
    setSlot(i, [...current, current[current.length - 1] ?? DEFAULT_COLOR]);
  };

  /** 行の k 番目の色を外す。空になったら自動マッチへ戻す */
  const removeColorAt = (i: number, k: number) => {
    const next = colorsAt(i).filter((_, j) => j !== k);
    if (next.length === 0) clearSlot(i);
    else setSlot(i, next);
  };

  /** 行を dir（-1 上 / +1 下）方向に 1 つ動かす */
  const moveNote = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    const list = splitFlavorNotes(note);
    if (j < 0 || j >= list.length) return;

    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setNote(next.join(", "));

    // 上書き色も一緒に入れ替える（未設定は「未設定のまま」入れ替える）
    setOverrides((o) => {
      const swapped = { ...o };
      const a = o[i];
      const b = o[j];
      if (b === undefined) delete swapped[i];
      else swapped[i] = b;
      if (a === undefined) delete swapped[j];
      else swapped[j] = a;
      return swapped;
    });

    setTarget((t) =>
      t === null
        ? null
        : t.index === i
          ? { ...t, index: j }
          : t.index === j
            ? { ...t, index: i }
            : t,
    );
  };

  /** ホイールで末端フレーバーを選んだとき */
  const handleWheelSelect = useCallback(
    (segment: WheelSegment) => {
      const name = segment.name.replace(/\n/g, " ").trim();
      const hex = normalizeHex(segment.color);
      const list = splitFlavorNotes(note);

      if (target !== null && target.index < list.length) {
        const i = target.index;

        // 選択中の行に色を足す（語はそのまま）
        if (target.mode === "add") {
          const current = overrides[i] ?? matchFlavorColor(list[i]).colors;
          if (current.includes(hex)) return;
          setOverrides((o) => ({ ...o, [i]: [...current, hex] }));
          return;
        }

        // 選択中の行を語ごと置き換える
        const next = [...list];
        next[i] = name;
        setNote(next.join(", "));
        setOverrides((o) => ({ ...o, [i]: [hex] }));
        setTarget(null);
        return;
      }

      // 未選択なら末尾に追加（同じ語の重複は無視）
      if (list.includes(name)) return;
      setNote([...list, name].join(", "));
      setOverrides((o) => ({ ...o, [list.length]: [hex] }));
    },
    [note, target, overrides],
  );

  const removeNote = (i: number) => {
    setNote((prev) =>
      splitFlavorNotes(prev)
        .filter((_, j) => j !== i)
        .join(", "),
    );
    // 削除位置以降の上書きを 1 つ前へ詰める
    setOverrides((o) => {
      const next: Record<number, string[]> = {};
      for (const [k, v] of Object.entries(o)) {
        const idx = Number(k);
        if (idx < i) next[idx] = v;
        else if (idx > i) next[idx - 1] = v;
      }
      return next;
    });
    setTarget(null);
  };

  const loadCsv = (raw: string) => {
    const next: Record<number, string[]> = {};
    splitFlavorColors(raw).forEach((slot, i) => {
      if (slot) next[i] = slot;
    });
    setOverrides(next);
  };

  const copy = () => navigator.clipboard?.writeText(csv);

  // ---- 豆カード（SVG 保存） ----
  const selectedBean = beans.find((b) => b.id === beanId) ?? null;
  // フォント読込後は文字幅が変わるので、読み込めたら組み直す
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    ensureCardFonts().then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  /** カードの内容。色は編集中のものをそのまま反映する */
  const cardData = useMemo<BeanCardData | null>(() => {
    if (!selectedBean) return null;
    const countries = toArray(selectedBean.country).map(countryLabel);
    const specs = [
      {
        label: "Variety",
        value: toArray(selectedBean.variety).map(varietyLabel).join(", "),
      },
      {
        label: "Process",
        value: toArray(selectedBean.process).map(processLabel).join(", "),
      },
      { label: "Roast", value: roastLabel(roast) },
      {
        label: "Genre",
        value: toArray(selectedBean.genre).map(genreLabel).join(", "),
      },
    ].filter((s) => s.value);

    return {
      name: selectedBean.name,
      origin: countries.map((c) => `${c.flag} ${c.label}`).join(" / "),
      notes: rows.map((r) => ({ label: r.label, colors: r.display })),
      specs,
      roastDate: formatRoastDate(roastDate),
      roastLevel: roast,
    };
    // rows は note/overrides から毎回作られるので、その 2 つを依存にする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBean, note, overrides, roast, roastDate]);

  /** プレビューと保存で同じ SVG を使う */
  const cardSvg = useMemo(
    () => (cardData ? buildBeanCardSvg(cardData) : null),
    // fontsReady は文字幅の再計算のトリガー
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardData, fontsReady],
  );

  /** カードを SVG で保存する */
  const saveCard = () => {
    if (!cardData || !cardSvg) return;
    const blob = new Blob([cardSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = beanCardFileName(cardData.name, roastDate);
    a.click();
    URL.revokeObjectURL(url);
  };

  const targetLabel = () => {
    if (target === null) return "選択 → 末尾に追加";
    const label = rows[target.index]?.label ?? "";
    const what = target.mode === "add" ? "に色を追加" : "を置換";
    return `選択 → ${target.index + 1} 番目「${label}」${what}`;
  };

  return (
    <div style={S.page}>
      {/* 埋め込んだ SVG（幅は固定属性で持っている）をプレビュー幅に合わせる */}
      <style>{`.${CARD_PREVIEW_CLASS} svg { width: 100%; height: auto; display: block; border: 1px solid #ebe4da; }`}</style>

      {/* 豆を選んで flavorNote を読み込む */}
      <div style={S.beanBox}>
        <div style={S.wheelHead}>
          <span style={S.blockTitle}>Beans（microCMS）</span>
          {beanId !== null && (
            <button type="button" style={S.pick} onClick={resetAll}>
              クリア
            </button>
          )}
        </div>
        {beans.length === 0 ? (
          <p style={S.hint}>
            豆を取得できませんでした（MICROCMS_COFFEE_API_URL / _API_KEY
            を確認してください）。下の flavorNote に直接入力しても使えます。
          </p>
        ) : (
          <div style={S.beanList}>
            {beans.map((bean) => {
              const active = bean.id === beanId;
              const flags = toArray(bean.country)
                .map((c) => countryLabel(c).flag)
                .join("");
              return (
                <button
                  key={bean.id}
                  type="button"
                  onClick={() => loadBean(bean)}
                  style={{
                    ...S.beanItem,
                    ...(active ? S.beanItemActive : null),
                  }}
                  title={bean.flavorNote ?? "flavorNote 未入力"}
                >
                  {flags && <span style={S.beanFlag}>{flags}</span>}
                  <span>{bean.name}</span>
                  {!bean.flavorNote && (
                    <span style={S.beanEmpty}>note なし</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 豆カード（横長・PNG 保存） */}
      <div style={S.beanBox}>
        <div style={S.wheelHead}>
          <span style={S.blockTitle}>Bean Card（1200 × 630）</span>
          <div style={S.cardActions}>
            <label style={S.dateLabel}>
              焙煎日
              <input
                type="date"
                value={roastDate}
                onChange={(e) => setRoastDate(e.target.value)}
                style={S.dateInput}
              />
            </label>
            <button
              type="button"
              style={{ ...S.copy, ...(cardData ? null : S.copyOff) }}
              onClick={saveCard}
              disabled={!cardData}
            >
              SVG を保存
            </button>
          </div>
        </div>
        {cardSvg ? (
          // 保存する SVG をそのまま埋め込むので、見えているものが出力そのまま
          <div
            className={CARD_PREVIEW_CLASS}
            style={S.cardPreviewBox}
            dangerouslySetInnerHTML={{ __html: cardSvg }}
          />
        ) : (
          <p style={S.hint}>
            豆を選ぶとカードを組みます。フレーバーの色を編集すると、その色がそのままカードに反映されます。
          </p>
        )}
      </div>

      <p style={S.hint}>
        ホイールでカテゴリ →
        具体的なフレーバーの順にクリックすると、語と公式カラーが同時に入ります。
        行の「置換」を押してからクリックすればその行を置き換え、「色追加」なら語はそのままで色だけ増やせます（raspberry-chocolate
        のような複合語向け）。未選択なら末尾に追加。並び順は ↑↓ で変えられます。
      </p>

      {/* ホイール */}
      <div style={S.wheelBox}>
        <div style={S.wheelHead}>
          <span style={S.blockTitle}>Flavor Wheel</span>
          <span style={S.target}>{targetLabel()}</span>
        </div>
        <div style={S.wheelInner}>
          <ZoomableWheel
            segments={flavorWheelSegments}
            footerIdle="カテゴリーをクリックして拡大"
            footerZoomed="フレーバーをクリックすると語と色が入ります"
            onSelect={handleWheelSelect}
          />
        </div>
      </div>

      {/* プレビュー */}
      <div style={S.previewGrid}>
        <div>
          <div style={S.previewLabel}>Card（下 1/4 バンド）</div>
          <div style={S.cardPreview}>
            <div style={S.cardBody}>
              {rows.map((r, i) => (
                <span key={i} style={S.cardNote}>
                  <span
                    style={{
                      ...S.cardDot,
                      background: noteDotBackground(r.display),
                    }}
                  />
                  {r.label}
                </span>
              ))}
            </div>
            <div style={{ ...S.cardBand, background }} />
          </div>
        </div>
        <div>
          <div style={S.previewLabel}>Modal hero</div>
          <div style={{ ...S.hero, background }} />
        </div>
      </div>

      <label style={S.label}>flavorNote（カンマ区切り・直接編集も可）</label>
      <textarea
        style={S.textarea}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />

      <div style={S.rowInline}>
        <label style={S.label}>焙煎度（下地の確認用）</label>
        <select
          style={S.select}
          value={roast}
          onChange={(e) => setRoast(e.target.value)}
        >
          {ROASTS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* 各語の色 */}
      <div style={S.rows}>
        {rows.map((r, i) => {
          const active = target?.index === i;
          return (
            <div
              key={i}
              style={{ ...S.noteRow, ...(active ? S.noteRowActive : null) }}
            >
              <div style={S.noteHead}>
                <div style={S.moveCol}>
                  <button
                    type="button"
                    style={{ ...S.move, ...(i === 0 ? S.moveOff : null) }}
                    onClick={() => moveNote(i, -1)}
                    disabled={i === 0}
                    aria-label={`${r.label} を上へ`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    style={{
                      ...S.move,
                      ...(i === rows.length - 1 ? S.moveOff : null),
                    }}
                    onClick={() => moveNote(i, 1)}
                    disabled={i === rows.length - 1}
                    aria-label={`${r.label} を下へ`}
                  >
                    ↓
                  </button>
                </div>

                <span
                  style={{ ...S.dot, background: noteDotBackground(r.display) }}
                />
                <span style={S.noteLabel}>{r.label}</span>

                {r.offWheel && !r.overridden && (
                  <span style={S.offWheel}>ホイール外・要色指定</span>
                )}

                <div style={S.headActions}>
                  <button
                    type="button"
                    onClick={() =>
                      setTarget(
                        active && target?.mode === "replace"
                          ? null
                          : { index: i, mode: "replace" },
                      )
                    }
                    style={{
                      ...S.pick,
                      ...(active && target?.mode === "replace"
                        ? S.pickActive
                        : null),
                    }}
                    title="ホイール選択でこの行の語と色を置き換える"
                  >
                    置換
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTarget(
                        active && target?.mode === "add"
                          ? null
                          : { index: i, mode: "add" },
                      )
                    }
                    style={{
                      ...S.pick,
                      ...(active && target?.mode === "add"
                        ? S.pickActive
                        : null),
                    }}
                    title="ホイール選択でこの行に色を追加する"
                  >
                    色追加
                  </button>
                  {r.overridden && (
                    <button
                      type="button"
                      style={S.pick}
                      onClick={() => clearSlot(i)}
                      title="自動マッチに戻す"
                    >
                      自動
                    </button>
                  )}
                  <button
                    type="button"
                    style={S.remove}
                    onClick={() => removeNote(i)}
                    aria-label={`${r.label} を削除`}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* この語に当てた色（複数可） */}
              <div style={S.colorList}>
                {r.colors.map((color, k) => (
                  <span key={k} style={S.colorChip}>
                    <input
                      type="color"
                      value={r.display[k]}
                      onChange={(e) =>
                        setColorAt(i, k, e.target.value.toUpperCase())
                      }
                      style={S.colorInput}
                      aria-label={`${r.label} の色 ${k + 1}`}
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) =>
                        setColorAt(i, k, normalizeHexInput(e.target.value))
                      }
                      placeholder="F2C312"
                      style={{
                        ...S.hexInput,
                        ...(isHexColor(color) ? null : S.hexInputInvalid),
                      }}
                      aria-label={`${r.label} の色 ${k + 1} の HEX`}
                    />
                    <button
                      type="button"
                      style={S.chipRemove}
                      onClick={() => removeColorAt(i, k)}
                      aria-label={`${r.label} の色 ${k + 1} を削除`}
                      title={
                        r.colors.length === 1
                          ? "自動マッチに戻す"
                          : "この色を外す"
                      }
                    >
                      −
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  style={S.addColor}
                  onClick={() => addColorAt(i)}
                  title="この語に色を追加する"
                >
                  ＋色
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 出力 */}
      <label style={S.label}>
        flavorColors（microCMS に貼る・1 語に複数色は「|」区切り）
      </label>
      <div style={S.outRow}>
        <input
          style={S.out}
          value={csv}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
        <button style={S.copy} onClick={copy}>
          コピー
        </button>
      </div>

      <label style={S.label}>既存の flavorColors を読み込んで編集</label>
      <input
        style={S.out}
        placeholder="#F2C312,#E52968|#692A19..."
        onChange={(e) => loadCsv(e.target.value)}
      />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 },
  hint: { fontSize: 13, lineHeight: 1.8, color: "#7d7267", margin: 0 },
  label: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#8a7f72",
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#b3a795",
  },
  beanBox: {
    border: "1px solid #ebe4da",
    borderRadius: 14,
    padding: "0.9rem 1rem 1rem",
    background: "#fff",
  },
  beanList: { display: "flex", flexWrap: "wrap", gap: 6 },
  beanItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 600,
    padding: "0.35rem 0.65rem",
    border: "1px solid #e5e0d8",
    borderRadius: 999,
    background: "#fff",
    color: "#5f564d",
    cursor: "pointer",
    textAlign: "left",
  },
  beanItemActive: {
    borderColor: "#8b5e34",
    background: "#faf5ee",
    color: "#8b5e34",
  },
  beanFlag: { fontSize: 13, lineHeight: 1 },
  cardActions: { display: "flex", alignItems: "center", gap: 10 },
  dateLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#8a7f72",
  },
  dateInput: {
    padding: "0.3rem 0.4rem",
    border: "1px solid #e5e0d8",
    borderRadius: 6,
    font: "inherit",
    fontSize: 13,
  },
  cardPreviewBox: {
    // 印刷前提なので角丸なし（保存される SVG と同じ見た目）
    display: "block",
    lineHeight: 0,
  },
  copyOff: { opacity: 0.4, cursor: "default" },
  beanEmpty: { fontSize: 10, fontWeight: 700, color: "#b3a795" },
  wheelBox: {
    border: "1px solid #ebe4da",
    borderRadius: 14,
    padding: "0.9rem 1rem 1rem",
    background: "#fff",
  },
  wheelHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  target: {
    fontSize: 11,
    fontWeight: 700,
    color: "#8b5e34",
    background: "#faf5ee",
    border: "1px solid #e8d9c4",
    borderRadius: 999,
    padding: "0.22rem 0.6rem",
  },
  wheelInner: { maxWidth: 460, margin: "0 auto" },
  textarea: {
    width: "100%",
    padding: "0.6rem 0.7rem",
    border: "1px solid #e5e0d8",
    borderRadius: 8,
    font: "inherit",
    resize: "vertical",
  },
  rowInline: { display: "flex", alignItems: "center", gap: 10 },
  select: {
    padding: "0.4rem 0.6rem",
    border: "1px solid #e5e0d8",
    borderRadius: 8,
    font: "inherit",
  },
  previewGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  previewLabel: { fontSize: 11, color: "#b3a795", marginBottom: 6 },
  cardPreview: {
    display: "flex",
    flexDirection: "column",
    minHeight: 210,
    border: "1px solid #ebe4da",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
  },
  cardBody: {
    flex: "1 1 auto",
    padding: "1rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.3rem 0.85rem",
    alignContent: "flex-start",
  },
  cardNote: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    color: "#5f564d",
    height: "fit-content",
  },
  cardDot: { width: 7, height: 7, borderRadius: 999, flexShrink: 0 },
  cardBand: { flex: "0 0 25%", minHeight: 58, backgroundSize: "160% 160%" },
  hero: {
    height: 92,
    borderRadius: 12,
    backgroundSize: "cover",
    border: "1px solid #ebe4da",
  },
  rows: { display: "flex", flexDirection: "column", gap: 8 },
  noteRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "0.45rem 0.5rem",
    borderRadius: 8,
    border: "1px solid #f0ebe3",
  },
  noteRowActive: { borderColor: "#e8d9c4", background: "#fdfaf6" },
  noteHead: { display: "flex", alignItems: "center", gap: 10 },
  moveCol: { display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 },
  move: {
    width: 20,
    height: 14,
    padding: 0,
    fontSize: 10,
    lineHeight: 1,
    border: "1px solid #e5e0d8",
    borderRadius: 4,
    background: "#fff",
    color: "#8a7f72",
    cursor: "pointer",
  },
  moveOff: { opacity: 0.35, cursor: "default" },
  headActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    flexShrink: 0,
  },
  pick: {
    fontSize: 11,
    fontWeight: 700,
    padding: "0.2rem 0.5rem",
    border: "1px solid #e5e0d8",
    borderRadius: 6,
    background: "#fff",
    color: "#8a7f72",
    cursor: "pointer",
    flexShrink: 0,
  },
  pickActive: {
    background: "#8b5e34",
    borderColor: "#8b5e34",
    color: "#fff",
  },
  dot: { width: 18, height: 18, borderRadius: 999, flexShrink: 0 },
  noteLabel: { fontSize: 14, fontWeight: 600, minWidth: 110 },
  offWheel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#b45309",
    background: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: 999,
    padding: "0.1rem 0.5rem",
  },
  colorList: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingLeft: 30,
  },
  colorChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "0.15rem 0.25rem",
    border: "1px solid #f0ebe3",
    borderRadius: 7,
    background: "#fff",
  },
  colorInput: {
    width: 30,
    height: 24,
    padding: 0,
    border: "1px solid #e5e0d8",
    borderRadius: 6,
    background: "none",
    flexShrink: 0,
  },
  hexInput: {
    width: 84,
    padding: "0.25rem 0.35rem",
    border: "1px solid #e5e0d8",
    borderRadius: 6,
    font: "inherit",
    fontSize: 13,
    flexShrink: 0,
  },
  hexInputInvalid: { borderColor: "#fcd34d", background: "#fffbeb" },
  chipRemove: {
    width: 20,
    height: 20,
    border: "1px solid #e5e0d8",
    borderRadius: 5,
    background: "#fff",
    color: "#8a7f72",
    cursor: "pointer",
    lineHeight: 1,
    flexShrink: 0,
  },
  addColor: {
    fontSize: 11,
    fontWeight: 700,
    padding: "0.25rem 0.5rem",
    border: "1px dashed #d9d0c4",
    borderRadius: 6,
    background: "#fff",
    color: "#8a7f72",
    cursor: "pointer",
  },
  remove: {
    width: 24,
    height: 24,
    border: "1px solid #e5e0d8",
    borderRadius: 6,
    background: "#fff",
    color: "#8a7f72",
    cursor: "pointer",
    lineHeight: 1,
    flexShrink: 0,
  },
  outRow: { display: "flex", gap: 8 },
  out: {
    flex: 1,
    padding: "0.5rem 0.6rem",
    border: "1px solid #e5e0d8",
    borderRadius: 8,
    font: "inherit",
    fontSize: 13,
  },
  copy: {
    padding: "0.5rem 0.9rem",
    border: "none",
    borderRadius: 8,
    background: "#8b5e34",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
};
