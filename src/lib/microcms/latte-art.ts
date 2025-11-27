import { fetchWithAuth, fetchAll } from "./api-base";

export type LatteArtDesign =
  | "heart"
  | "tulip"
  | "layeredHeart"
  | "rosetta"
  | "wiggledHeart"
  | "wingedTulip"
  | "Swan";

export interface LatteArt {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  title?: string;
  photos?: {
    url: string;
    height: number;
    width: number;
  }[];
  design?: LatteArtDesign[];
  date?: string;
  goal?: string;
  review?: string;
  issue?: string;
  practiceCount?: number;
}

export interface LatteArtResponse {
  contents: LatteArt[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function getAllLatteArts(): Promise<LatteArtResponse> {
  return fetchAll<LatteArt>("latte-bot");
}

export async function getLatteArtById(id: string): Promise<LatteArt> {
  const res = await fetchWithAuth(`latte-bot/${id}`);
  const data: LatteArt = await res.json();
  return data;
}

export async function getLatestLatteArts(
  limit: number = 10,
): Promise<LatteArt[]> {
  const data = await fetchAll<LatteArt>("latte-bot?orders=-date");
  return data.contents.slice(0, limit);
}
