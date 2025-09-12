import { fetchWithAuth } from "./api-base";

export interface Blog {
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  title: string;
  excerpt: string;
  category: "Programming" | "Coffee" | "Design" | "DailyLife";
  tag: string[];
  thumbnail: {
    url: string;
    height: number;
    width: number;
  };
  content: string;
  slug: string;
}

export interface BlogResponse {
  contents: Blog[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function getAllBlog(): Promise<BlogResponse> {
  const res = await fetchWithAuth("blog");
  const data: BlogResponse = await res.json();
  return data;
}

export async function getBlogById(slug: string): Promise<Blog> {
  // slugを使ってフィルタリングするクエリに変更
  const res = await fetchWithAuth(`blog?filters=slug[equals]${slug}`);
  const data = await res.json();

  // フィルタリングの結果は配列で返ってくるので、最初の1件を返す
  return data.contents[0];
}
