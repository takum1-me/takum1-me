import { fetchThumbnailFromOGP } from "./ogp";

export interface NoteArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  thumbnail?: string;
}

/**
 * note.comのRSSフィードを取得してパースする
 */
export async function fetchNoteRSS(
  rssUrl: string = "https://note.com/takum1_me_/rss",
): Promise<NoteArticle[]> {
  try {
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // XMLをパースして記事情報を抽出
    const articles: NoteArticle[] = [];

    // itemタグを検索
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi);
    const itemArray = Array.from(itemMatches);

    for (const match of itemArray) {
      const itemContent = match[1];

      // titleを抽出
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? cleanXMLText(titleMatch[1]) : "";

      // descriptionを抽出
      const descriptionMatch = itemContent.match(
        /<description>([\s\S]*?)<\/description>/i,
      );
      const description = descriptionMatch
        ? extractTextFromHTML(cleanXMLText(descriptionMatch[1]))
        : "";

      // linkを抽出
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
      const link = linkMatch ? cleanXMLText(linkMatch[1]) : "";

      // pubDateを抽出
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const pubDate = pubDateMatch ? cleanXMLText(pubDateMatch[1]) : "";

      // media:thumbnailを抽出（note.comのRSSフィードに含まれる）
      let thumbnail: string | undefined;

      // パターン1: 閉じタグがある場合（<media:thumbnail>URL</media:thumbnail>）
      const thumbnailContentMatch = itemContent.match(
        /<media:thumbnail[^>]*>([\s\S]*?)<\/media:thumbnail>/i,
      );
      if (thumbnailContentMatch && thumbnailContentMatch[1]) {
        thumbnail = cleanXMLText(thumbnailContentMatch[1]).trim();
      }

      // パターン2: url属性がある場合（自己完結型タグ: <media:thumbnail url="..." />）
      if (!thumbnail) {
        const thumbnailUrlMatch = itemContent.match(
          /<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*\/?>/i,
        );
        if (thumbnailUrlMatch && thumbnailUrlMatch[1]) {
          thumbnail = thumbnailUrlMatch[1];
        }
      }

      if (title && link) {
        articles.push({
          title,
          description,
          link,
          pubDate,
          thumbnail,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error("Error fetching Note RSS:", error);
    return [];
  }
}

/**
 * XMLテキストからCDATAやエンティティをクリーンアップ
 */
function cleanXMLText(text: string): string {
  // CDATAセクションを処理
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");

  // XMLエンティティをデコード
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

  return text.trim();
}

/**
 * HTMLからdescriptionのテキストを抽出
 */
function extractTextFromHTML(html: string): string {
  // 簡単なHTMLタグの除去
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .substring(0, 200); // 最大200文字に制限
}

/**
 * 記事のOGP画像（サムネイル）を取得（fetchThumbnailFromOGPのエイリアス）
 */
export async function fetchArticleThumbnail(
  articleUrl: string,
): Promise<string | undefined> {
  return fetchThumbnailFromOGP(articleUrl);
}

/**
 * 複数の記事のサムネイルを並列で取得
 */
export async function fetchThumbnailsForArticles(
  articles: NoteArticle[],
): Promise<NoteArticle[]> {
  // 並列でサムネイルを取得（最大5件まで同時処理）
  const BATCH_SIZE = 5;
  const articlesWithThumbnails: NoteArticle[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    const thumbnails = await Promise.all(
      batch.map((article) => fetchThumbnailFromOGP(article.link)),
    );

    batch.forEach((article, index) => {
      const thumbnail = thumbnails[index];
      articlesWithThumbnails.push({
        ...article,
        thumbnail: article.thumbnail || thumbnail, // RSSから取得したサムネイルを優先
      });
    });
  }

  return articlesWithThumbnails;
}
