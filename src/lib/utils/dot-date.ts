/**
 * 罫線グリッドで使う日付表記（"2026.02.05"）。
 * 解釈できない値は空文字にして、マスに "NaN" を出さない。
 */
export function formatDotDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
