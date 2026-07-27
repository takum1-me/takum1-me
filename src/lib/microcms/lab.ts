import type { MicroCMSResponse } from "./api-base";

/** `lab` API はコーヒー用 microCMS サービスから取得する。 */
export interface LabArticle {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  title: string;
  content: string;
  eyecatch?: {
    url: string;
    height: number;
    width: number;
  };
  category?: string[];
}

function coffeeFetch(path: string) {
  const base = import.meta.env.MICROCMS_COFFEE_API_URL as string | undefined;
  const key = import.meta.env.MICROCMS_COFFEE_API_KEY as string | undefined;

  if (!base || !key) {
    throw new Error(
      "MICROCMS_COFFEE_API_URL / MICROCMS_COFFEE_API_KEY が未設定です（.env を確認してください）",
    );
  }

  return fetch(`${base}${path}`, {
    headers: { "X-MICROCMS-API-KEY": key },
  });
}

export async function getAllLabArticles(): Promise<LabArticle[]> {
  const firstResponse = await coffeeFetch("lab?limit=1");
  if (!firstResponse.ok) {
    throw new Error(`lab の取得に失敗しました: ${firstResponse.status}`);
  }

  const firstPage: MicroCMSResponse<LabArticle> = await firstResponse.json();
  const { totalCount } = firstPage;
  const articles: LabArticle[] = [];
  const limit = 100;

  for (let offset = 0; offset < totalCount; offset += limit) {
    const response = await coffeeFetch(
      `lab?limit=${limit}&offset=${offset}&orders=-publishedAt`,
    );
    if (!response.ok) {
      throw new Error(`lab の取得に失敗しました: ${response.status}`);
    }

    const page: MicroCMSResponse<LabArticle> = await response.json();
    articles.push(...page.contents);
  }

  return articles;
}

export async function getLabArticleById(
  id: string,
): Promise<LabArticle | null> {
  const response = await coffeeFetch(`lab/${encodeURIComponent(id)}`);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`lab 記事の取得に失敗しました: ${response.status}`);
  }

  return response.json();
}
