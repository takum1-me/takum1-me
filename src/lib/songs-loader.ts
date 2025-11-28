// 楽曲データの動的読み込み
import { getAllSongs } from "./microcms/song";

export interface SongData {
  title: string;
  artist: string;
  appleMusicUrl: string;
  artworkUrl: string;
}

// OGP取得関数
async function fetchAppleMusicOGP(url: string): Promise<SongData> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // OGPタグを抽出（元々動作していたシンプルな正規表現）
    const ogTitle = html.match(
      /<meta property="og:title" content="([^"]*)"\/?>/,
    )?.[1];
    const ogImage = html.match(
      /<meta property="og:image" content="([^"]*)"\/?>/,
    )?.[1];

    // 楽曲情報を抽出
    // Apple MusicのOGPタイトル形式: "Magnetic by ILLIT on Apple Music"
    let title = "Unknown Title";
    let artist = "Unknown Artist";

    if (ogTitle) {
      // "by" で分割してアーティストとタイトルを抽出
      const byMatch = ogTitle.match(
        /^(.+?)\s+by\s+(.+?)\s+on\s+Apple\s+Music$/,
      );
      if (byMatch) {
        title = byMatch[1].trim();
        artist = byMatch[2].trim();
      } else {
        // フォールバック: タイトルのみ
        title = ogTitle.replace(/\s+on\s+Apple\s+Music$/, "").trim();
      }
    }

    // 画像URLを適切なサイズに調整
    const artworkUrl =
      ogImage?.replace(/1200x630wp-60\.jpg$/, "600x315bb.jpg") || "";

    return {
      title,
      artist,
      appleMusicUrl: url,
      artworkUrl,
    };
  } catch (error) {
    console.error(`Apple Music OGP取得エラー (${url}):`, error);
    throw error;
  }
}

// URLを正規化（https://がない場合は追加）
function normalizeUrl(url: string): string {
  if (!url) return url;

  // スペースをトリム
  let normalized = url.trim();

  // 既にhttp://またはhttps://で始まっている場合はそのまま
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  // https://を追加
  return `https://${normalized}`;
}

// 複数のApple Music URLから楽曲データを並列取得
async function fetchMultipleSongs(urls: string[]): Promise<SongData[]> {
  const promises = urls.map(async (url) => {
    try {
      return await fetchAppleMusicOGP(url);
    } catch (error) {
      console.error(`[songs-loader] 楽曲データ取得エラー (${url}):`, error);
      // エラーが発生してもnullを返して続行
      return null;
    }
  });

  const results = await Promise.all(promises);
  // nullを除外して返す
  return results.filter((result): result is SongData => result !== null);
}

// 楽曲データを動的に取得
export async function loadSongsData(): Promise<SongData[]> {
  try {
    // microCMSから楽曲のリンクを取得
    const songsResponse = await getAllSongs();

    const favoriteSongsUrls = songsResponse.contents
      .map((song) => song.link)
      .filter((link): link is string => link !== undefined)
      .map(normalizeUrl);

    if (favoriteSongsUrls.length === 0) {
      return [];
    }

    return await fetchMultipleSongs(favoriteSongsUrls);
  } catch (error) {
    console.error("楽曲データの取得に失敗しました:", error);
    // フォールバック: 空の配列を返す
    return [];
  }
}
