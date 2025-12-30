/**
 * 日付フォーマットユーティリティ
 */

/**
 * 日付文字列を日本語形式にフォーマット
 * @param dateString 日付文字列
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
};
