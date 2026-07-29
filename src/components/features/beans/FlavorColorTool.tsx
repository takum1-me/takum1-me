import React, { useMemo, useState, useCallback } from "react";
import {
  splitFlavorNotes,
  splitFlavorColors,
  matchFlavorColor,
  buildFlavorSwatch,
  normalizeHex,
  DEFAULT_COLOR,
} from "../../../lib/utils/flavor-color";
import { ZoomableWheel } from "../../features/flavor-wheel";
import { flavorWheelSegments } from "../../../data/flavor-wheel-segments";
import type { WheelSegment } from "../../../data/wheel-segment";

/**
 * /beans/color-tool（ローカル専用）で使う色決めツール。
 * フレーバーホイールから語を選ぶと、その語と公式カラーが同時に入る。
 * 手入力した語やホイールに無い語は、色ピッカー / HEX で個別に指定できる。
 * 最終的に microCMS の flavorColors に貼る CSV を出力する。
 */

const ROASTS = ["light", "medium", "medium-dark", "dark"];

export default function FlavorColorTool() {
  const [note, setNote] = useState("bright, tomato, high acidity, medium body");
  const [roast, setRoast] = useState("medium");
  // index -> 上書き HEX（未設定は「自動マッチのまま」）
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  // ホイール選択の適用先。null なら新しい語として末尾に追加する
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  const notes = useMemo(() => splitFlavorNotes(note), [note]);

  const rows = notes.map((label, i) => {
    const auto = matchFlavorColor(label);
    const offWheel = auto.color === DEFAULT_COLOR;
    const override = overrides[i] ?? "";
    return {
      label,
      auto: auto.color,
      offWheel,
      override,
      color: override || auto.color,
    };
  });

  const background = buildFlavorSwatch(
    rows.map((r) => r.color),
    roast,
  );

  // 出力 CSV: 各語の上書き値を同順で連結し、末尾の空欄は詰める
  const csv = useMemo(() => {
    const arr = notes.map((_, i) => overrides[i] ?? "");
    while (arr.length && arr[arr.length - 1] === "") arr.pop();
    return arr.join(",");
  }, [notes, overrides]);

  const setColor = (i: number, hex: string) =>
    setOverrides((o) => ({ ...o, [i]: hex }));

  const clearColor = (i: number) =>
    setOverrides((o) => {
      const next = { ...o };
      delete next[i];
      return next;
    });

  /** ホイールで末端フレーバーを選んだとき */
  const handleWheelSelect = useCallback(
    (segment: WheelSegment) => {
      const name = segment.name.replace(/\n/g, " ").trim();
      const hex = normalizeHex(segment.color);
      const list = splitFlavorNotes(note);

      // 選択中の行があればそれを置き換える
      if (targetIndex !== null && targetIndex < list.length) {
        const next = [...list];
        next[targetIndex] = name;
        setNote(next.join(", "));
        setOverrides((o) => ({ ...o, [targetIndex]: hex }));
        setTargetIndex(null);
        return;
      }

      // 未選択なら末尾に追加（同じ語の重複は無視）
      if (list.includes(name)) return;
      setNote([...list, name].join(", "));
      setOverrides((o) => ({ ...o, [list.length]: hex }));
    },
    [note, targetIndex],
  );

  const removeNote = (i: number) => {
    setNote((prev) =>
      splitFlavorNotes(prev)
        .filter((_, j) => j !== i)
        .join(", "),
    );
    // 削除位置以降の上書きを 1 つ前へ詰める
    setOverrides((o) => {
      const next: Record<number, string> = {};
      for (const [k, v] of Object.entries(o)) {
        const idx = Number(k);
        if (idx < i) next[idx] = v;
        else if (idx > i) next[idx - 1] = v;
      }
      return next;
    });
    setTargetIndex(null);
  };

  const loadCsv = (raw: string) => {
    const next: Record<number, string> = {};
    splitFlavorColors(raw).forEach((hex, i) => {
      if (hex) next[i] = hex;
    });
    setOverrides(next);
  };

  const copy = () => navigator.clipboard?.writeText(csv);

  return (
    <div style={S.page}>
      <p style={S.hint}>
        ホイールでカテゴリ →
        具体的なフレーバーの順にクリックすると、語と公式カラーが同時に入ります。
        行を選んでからクリックすればその行を置き換え、未選択なら末尾に追加します。
      </p>

      {/* ホイール */}
      <div style={S.wheelBox}>
        <div style={S.wheelHead}>
          <span style={S.blockTitle}>Flavor Wheel</span>
          <span style={S.target}>
            {targetIndex === null
              ? "選択 → 末尾に追加"
              : `選択 → ${targetIndex + 1} 番目「${rows[targetIndex]?.label ?? ""}」を置換`}
          </span>
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
                  <span style={{ ...S.cardDot, background: r.color }} />
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
          const active = targetIndex === i;
          return (
            <div
              key={i}
              style={{ ...S.noteRow, ...(active ? S.noteRowActive : null) }}
            >
              <button
                type="button"
                onClick={() => setTargetIndex(active ? null : i)}
                style={{ ...S.pick, ...(active ? S.pickActive : null) }}
                title="この行をホイール選択の適用先にする"
              >
                {active ? "適用先" : "選択"}
              </button>
              <span style={{ ...S.dot, background: r.color }} />
              <span style={S.noteLabel}>{r.label}</span>
              {r.offWheel && !r.override && (
                <span style={S.offWheel}>ホイール外・要色指定</span>
              )}
              <input
                type="color"
                value={r.color}
                onChange={(e) => setColor(i, e.target.value.toUpperCase())}
                style={S.colorInput}
                aria-label={`${r.label} の色`}
              />
              <input
                type="text"
                value={r.override}
                placeholder={r.auto}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (v === "") clearColor(i);
                  else setColor(i, v);
                }}
                style={S.hexInput}
              />
              <button
                type="button"
                style={S.remove}
                onClick={() => removeNote(i)}
                aria-label={`${r.label} を削除`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* 出力 */}
      <label style={S.label}>flavorColors（microCMS に貼る）</label>
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
        placeholder="#F2C312,#E2492F..."
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
  rows: { display: "flex", flexDirection: "column", gap: 6 },
  noteRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0.3rem 0.4rem",
    borderRadius: 8,
    border: "1px solid transparent",
  },
  noteRowActive: { borderColor: "#e8d9c4", background: "#fdfaf6" },
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
  colorInput: {
    width: 34,
    height: 28,
    padding: 0,
    border: "1px solid #e5e0d8",
    borderRadius: 6,
    background: "none",
    marginLeft: "auto",
    flexShrink: 0,
  },
  hexInput: {
    width: 92,
    padding: "0.3rem 0.4rem",
    border: "1px solid #e5e0d8",
    borderRadius: 6,
    font: "inherit",
    fontSize: 13,
    flexShrink: 0,
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
