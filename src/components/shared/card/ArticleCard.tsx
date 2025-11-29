import OverlayCard from "./OverlayCard";

interface ArticleCardProps {
  title: string;
  summary?: string;
  publishedAt: string;
  thumbnail?: {
    url: string;
  };
  slug?: string;
  link?: string;
  category: string;
}

export default function ArticleCard({
  title,
  summary,
  publishedAt,
  thumbnail,
  slug,
  link,
  category,
}: ArticleCardProps) {
  // linkが指定されている場合は外部リンク（note記事）、slugが指定されている場合は内部リンク
  const href = link || (slug ? `/blog/${slug}` : undefined);
  const isExternal = !!link;

  return (
    <OverlayCard
      title={title}
      subtitle={summary}
      date={publishedAt}
      imageUrl={thumbnail?.url}
      imageAlt={title}
      href={href}
      isExternal={isExternal}
      className="blog-card"
      dataCategory={category}
    />
  );
}
