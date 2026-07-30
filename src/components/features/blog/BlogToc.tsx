import { useEffect, useState } from "react";
import "./blog-toc.css";

interface TocItem {
  id: string;
  text: string;
  level: 1 | 2;
}

/**
 * 記事本文（.prose）の h1 / h2 から目次を組む。
 * 現在位置は IntersectionObserver で追う。
 */
export default function BlogToc() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>(".prose h1, .prose h2"),
    );

    const collected = headings.map((heading, index) => {
      if (!heading.id) heading.id = `heading-${index}`;
      return {
        id: heading.id,
        text: heading.textContent ?? "",
        level: heading.tagName === "H1" ? (1 as const) : (2 as const),
      };
    });

    setItems(collected);
    if (collected.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      // ヘッダー直下に入った見出しを「現在地」とみなす
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <aside className="toc" aria-label="目次">
      <p className="toc__label">Contents</p>
      <ul className="toc__list">
        {items.map((item) => (
          <li key={item.id} className={`toc__item is-h${item.level}`}>
            <a
              className={`toc__link${activeId === item.id ? " is-active" : ""}`}
              href={`#${item.id}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
