import { fetchWithAuth } from "./api-base";

export interface Blog {
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  title: string;
  summary: string;
  excerpt: {
    url: string;
    height: number;
    width: number;
  }[];
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

export async function getBlogById(slug: string): Promise<Blog | null> {
  try {
    // slugを使ってフィルタリングするクエリに変更
    const res = await fetchWithAuth(`blog?filters=slug[equals]${slug}`);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();

    // フィルタリングの結果は配列で返ってくるので、最初の1件を返す
    if (!data.contents || data.contents.length === 0) {
      return null;
    }

    return data.contents[0];
  } catch (error) {
    return null;
  }
}

export async function getLatestBlogs(limit: number = 5): Promise<Blog[]> {
  const res = await fetchWithAuth(`blog?orders=-publishedAt&limit=${limit}`);
  const data: BlogResponse = await res.json();
  return data.contents;
}

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
  try {
    const res = await fetchWithAuth(`photos?orders=-date&limit=${limit}`);

    if (!res.ok) {
      console.error("Failed to fetch photos:", res.statusText);
      return [];
    }

    const data: PhotoResponse = await res.json();
    return data.contents || [];
  } catch (error) {
    console.error("Error fetching photos:", error);
    return [];
  }
}
