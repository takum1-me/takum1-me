import { fetchAll } from "./api-base";

export interface Photo {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  photo: {
    url: string;
    height: number;
    width: number;
  };
  otherPhotos: {
    url: string;
    height: number;
    width: number;
  }[];
  date: string;
  place: string;
}

export interface PhotoResponse {
  contents: Photo[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function getLatestPhotos(limit: number = 10): Promise<Photo[]> {
  const data = await fetchAll<Photo>("photos?orders=-date");
  return data.contents.slice(0, limit);
}

