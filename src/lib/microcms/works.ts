import { fetchAll } from "./api-base";

export interface Work {
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  title: string;
  outline?: string;
  link?: string;
  photos?: {
    url: string;
    height: number;
    width: number;
  }[];
  genre?: ("programming" | "design")[] | "programming" | "design";
  githuburl?: string;
  status?: ("creating" | "completed")[] | "creating" | "completed";
  owner?: ("personal" | "organization")[] | "personal" | "organization";
  orgnaame?: string;
}

export interface WorkResponse {
  contents: Work[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function getAllWorks(): Promise<WorkResponse> {
  return fetchAll<Work>("works");
}

export async function getWorksByOwner(
  owner: "personal" | "organization",
): Promise<Work[]> {
  const data = await fetchAll<Work>(`works?filters=owner[equals]${owner}`);
  return data.contents;
}

