/**
 * URLからOGP画像を取得する
 * サーバー側（Astro）で実行されるため、直接fetchできる
 */
export async function fetchThumbnailFromOGP(
  url: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const html = await response.text();

    // og:imageメタタグを検索（複数のパターンに対応）
    const ogImagePatterns = [
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
    ];

    for (const pattern of ogImagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // twitter:imageを検索（フォールバック）
    const twitterImagePatterns = [
      /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
      /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i,
    ];

    for (const pattern of twitterImagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}
