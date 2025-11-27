export function fetchWithAuth(path: string) {
  const url = `${import.meta.env.MICROCMS_API_URL}${path}`;
  const headers = {
    "X-MICROCMS-API-KEY": import.meta.env.MICROCMS_API_KEY,
  };
  return fetch(url, {
    headers,
  });
}

export interface MicroCMSResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function fetchAll<T>(
  endpoint: string,
): Promise<MicroCMSResponse<T>> {
  // 最初に1つだけのアイテムをフェッチしてtotalCountを取得
  const firstRes = await fetchWithAuth(`${endpoint}?limit=1`);
  const firstData: MicroCMSResponse<T> = await firstRes.json();
  const totalCount = firstData.totalCount;

  if (totalCount === 0) {
    return {
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    };
  }

  // limit=100で全件取得
  const allContents: T[] = [];
  const limit = 100;
  let offset = 0;

  while (offset < totalCount) {
    const res = await fetchWithAuth(
      `${endpoint}?limit=${limit}&offset=${offset}`,
    );
    const data: MicroCMSResponse<T> = await res.json();
    allContents.push(...data.contents);
    offset += limit;
  }

  return {
    contents: allContents,
    totalCount,
    offset: 0,
    limit: 100,
  };
}
