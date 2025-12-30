/**
 * 相対パスを絶対URLに変換する
 */
function resolveImageUrl(imageUrl: string, baseUrl: string): string {
  // 既に絶対URLの場合はそのまま返す
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  try {
    const base = new URL(baseUrl);

    // 相対パス（/で始まる）の場合は、baseのoriginと結合
    if (imageUrl.startsWith("/")) {
      return `${base.origin}${imageUrl}`;
    }

    // 相対パス（./や../で始まる、またはパスだけ）の場合は、baseと結合
    return new URL(imageUrl, base).href;
  } catch {
    // URLの解析に失敗した場合は元のURLを返す
    return imageUrl;
  }
}

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
        const imageUrl = match[1].trim();
        // 空文字列や"undefined"などの無効な値をスキップ
        if (
          imageUrl &&
          imageUrl !== "undefined" &&
          !imageUrl.includes("undefined")
        ) {
          return resolveImageUrl(imageUrl, url);
        }
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
        const imageUrl = match[1].trim();
        // 空文字列や"undefined"などの無効な値をスキップ
        if (
          imageUrl &&
          imageUrl !== "undefined" &&
          !imageUrl.includes("undefined")
        ) {
          return resolveImageUrl(imageUrl, url);
        }
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}
