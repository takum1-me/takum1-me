import { fetchAll } from "./api-base";

export type AboutGenre =
  | "certification"
  | "organization"
  | "favorite-flavor"
  | "favorite-coffee"
  | "interest"
  | "favorite-item";

export interface AboutItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  genre: AboutGenre[];
  title: string;
  beginDate?: string;
  finishDate?: string;
  specific?: string;
  specificBeiginDate?: string;
  specificFinishDate?: string;
  link?: string;
}

export interface AboutResponse {
  contents: AboutItem[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function getAllAbout(): Promise<AboutResponse> {
  return fetchAll<AboutItem>("about");
}
