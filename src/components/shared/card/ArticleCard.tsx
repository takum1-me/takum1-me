import React from "react";
import OverlayCard from "./OverlayCard";

interface ArticleCardProps {
  title: string;
  summary?: string;
  publishedAt: string;
  thumbnail?: {
    url: string;
  };
  slug: string;
  category: string;
}

export default function ArticleCard({
  title,
  summary,
  publishedAt,
  thumbnail,
  slug,
  category,
}: ArticleCardProps) {
  return (
    <OverlayCard
      title={title}
      subtitle={summary}
      date={publishedAt}
      imageUrl={thumbnail?.url}
      imageAlt={title}
      href={`/blog/${slug}`}
      className="blog-card"
      dataCategory={category}
    />
  );
}
