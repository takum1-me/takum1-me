import { fetchWithAuth, fetchAll } from "./api-base";

export interface Song {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  link?: string;
}

export interface SongResponse {
  contents: Song[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function getAllSongs(): Promise<SongResponse> {
  return fetchAll<Song>("songs");
}

export async function getSongById(id: string): Promise<Song> {
  const res = await fetchWithAuth(`songs/${id}`);
  const data: Song = await res.json();
  return data;
}

export async function getLatestSongs(limit: number = 10): Promise<Song[]> {
  const data = await fetchAll<Song>("songs?orders=-publishedAt");
  return data.contents.slice(0, limit);
}

