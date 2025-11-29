export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
};

export const formatPeriod = (
  beginDate?: string,
  finishDate?: string,
): string => {
  if (!beginDate) return "";
  const begin = formatDate(beginDate);
  if (finishDate) {
    const finish = formatDate(finishDate);
    return `${begin}〜${finish}`;
  }
  return `${begin}〜`;
};

export const formatRolePeriod = (
  specificBeginDate?: string,
  specificFinishDate?: string,
): string => {
  if (!specificBeginDate) return "";
  const begin = formatDate(specificBeginDate);
  if (specificFinishDate) {
    const finish = formatDate(specificFinishDate);
    return `${begin}〜${finish}`;
  }
  return `${begin}〜`;
};
