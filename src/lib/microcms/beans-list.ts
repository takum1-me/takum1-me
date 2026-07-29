import type { MicroCMSResponse } from "./api-base";

/**
 * 販売できる/所有しているコーヒー豆のリスト。
 * 他の microCMS コンテンツ（takum1.microcms.io）とは別サービス
 * （takum1-coffee.microcms.io）にあるため、専用の URL / API キーで取得する。
 *   MICROCMS_COFFEE_API_URL=https://takum1-coffee.microcms.io/api/v1/
 *   MICROCMS_COFFEE_API_KEY=xxxxxxxx
 */

/** microCMS のセレクトフィールドは単一値でも配列で返るため、単一/配列の両対応 */
export type MaybeArray<T> = T | T[];

export interface Bean {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  /** 豆の名前（例: "Kenya Nyanja washed"） */
  name: string;
  /** 販売中/在庫ありなら true */
  isAvailable: boolean;
  /** 焙煎度（light / medium / medium-dark / dark ...） */
  roastLevel?: MaybeArray<string>;
  /** 精製方法（washed / natural / honey ...） */
  process?: MaybeArray<string>;
  /** 生産国（kenya / ethiopia ...） */
  country?: MaybeArray<string>;
  /** ジャンル（singleOrigin / blend ...） */
  genre?: MaybeArray<string>;
  /** 品種（sl28 / bourbon ...） */
  variety?: MaybeArray<string>;
  /** 説明文（microCMS 側のフィールド名は expalanation） */
  expalanation?: string;
  /** カンマ区切りのフレーバーノート（例: "bright, tomato, high acidity"） */
  flavorNote?: string;
  /**
   * flavorNote と同順の HEX カラー CSV（任意。例: "#F2C312,#E8D53A,#E2492F"）。
   * 各語の色を上書きする。空欄・無効な要素は自動マッチにフォールバック。
   * 値は /beans/color-tool（ローカル専用）で作れる。
   */
  flavorColors?: string;
}

/** 単一/配列の値を常に配列へ正規化する */
export function toArray<T>(value: MaybeArray<T> | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
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

/** ローカル開発でキー未設定でも UI を確認できるようにするサンプル */
const SAMPLE_BEANS: Bean[] = [
  {
    id: "sample-kenya",
    createdAt: "",
    updatedAt: "",
    publishedAt: "",
    revisedAt: "",
    name: "Kenya Nyanja washed",
    isAvailable: true,
    roastLevel: ["medium"],
    process: ["washed"],
    country: ["kenya"],
    genre: ["singleOrigin"],
    variety: ["sl28", "sl34", "batian", "ruilu11"],
    expalanation:
      "しっかり甘い中煎り。メイラードの甘さを感じつつ、トマトのような有機的な酸味も感じる豆になっています。",
    flavorNote: "bright, tomato, high acidity, medium body, medium sweatness",
    // flavorNote と同順。ここでは bright/tomato を明示指定し、残りは自動マッチに任せる
    flavorColors: "#F2C312,#E2492F",
  },
];

/** beans-list を全件取得する（未設定・失敗時は空配列でフォールバック） */
export async function getAllBeans(): Promise<Bean[]> {
  const hasCreds =
    import.meta.env.MICROCMS_COFFEE_API_URL &&
    import.meta.env.MICROCMS_COFFEE_API_KEY;
  // キー未設定のローカル開発ではサンプルで UI を確認できるようにする
  if (!hasCreds) {
    if (import.meta.env.DEV) return SAMPLE_BEANS;
    return [];
  }

  try {
    const first = await coffeeFetch("beans-list?limit=1");
    const firstData: MicroCMSResponse<Bean> = await first.json();
    const total = firstData.totalCount ?? 0;
    if (total === 0) return [];

    const all: Bean[] = [];
    const limit = 100;
    for (let offset = 0; offset < total; offset += limit) {
      const res = await coffeeFetch(
        `beans-list?limit=${limit}&offset=${offset}`,
      );
      const data: MicroCMSResponse<Bean> = await res.json();
      all.push(...data.contents);
    }
    return all;
  } catch (e) {
    console.error("[beans-list] fetch failed:", e);
    return [];
  }
}
