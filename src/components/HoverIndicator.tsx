import { useState, useRef, useEffect } from "react";
import "./hover-indicator.css";

interface HoverIndicatorProps {
  items: Array<{
    id: string;
    label: string;
    href?: string;
  }>;
  onItemClick?: (id: string) => void;
  className?: string;
  showBackground?: boolean;
  enableBlogFilter?: boolean;
}

export default function HoverIndicator({
  items,
  onItemClick,
  className = "",
  showBackground = false,
  enableBlogFilter = false,
}: HoverIndicatorProps) {
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    show: boolean;
  }>({
    left: 0,
    width: 0,
    show: false,
  });
  const navRef = useRef<HTMLDivElement | null>(null);

  const updateIndicator = (
    targetElement: HTMLElement,
    show: boolean = false,
  ) => {
    if (!navRef.current) return;

    const rect = targetElement.getBoundingClientRect();
    const navRect = navRef.current.getBoundingClientRect();

    const left = rect.left - navRect.left - 14;
    const width = rect.width + 12;

    setIndicator({ left, width, show });
  };

  const handleBlogFilter = (categoryId: string) => {
    if (!enableBlogFilter) return;

    const blogCards = document.querySelectorAll(".blog-card");
    const blogGrid = document.querySelector(".blog-grid");

    // 既存のメッセージを先に削除
    hideNoBlogsMessage(blogGrid);

    // 選択されたカテゴリーに該当するカードを確認
    const matchingCards = Array.from(blogCards).filter((card) => {
      const cardCategory = card.getAttribute("data-category");
      return categoryId === "all" || cardCategory === categoryId;
    });

    // まず全てのカードにアウトアニメーションを適用
    blogCards.forEach((card) => {
      card.classList.add("animating");
    });

    // アニメーションの途中（全部消える瞬間）に切り替え
    setTimeout(() => {
      // 全てのカードの状態をリセット
      blogCards.forEach((card) => {
        card.classList.remove("animating", "animating-in", "hidden");
      });

      // 新しい状態を適用
      blogCards.forEach((card) => {
        const cardCategory = card.getAttribute("data-category");

        if (categoryId === "all" || cardCategory === categoryId) {
          // 表示するカードはインアニメーション
          card.classList.add("animating-in");

          setTimeout(() => {
            card.classList.remove("animating-in");
          }, 800);
        } else {
          // 非表示にするカードは隠す
          card.classList.add("hidden");
        }
      });

      // ブログがない場合のメッセージ表示
      if (matchingCards.length === 0) {
        showNoBlogsMessage(blogGrid, categoryId);
      }
    }, 400); // アウトアニメーションの半分の時間で切り替え
  };

  const showNoBlogsMessage = (blogGrid: Element | null, categoryId: string) => {
    if (!blogGrid) return;

    // 既存のメッセージを削除
    hideNoBlogsMessage(blogGrid);

    // 新しいメッセージを作成
    const messageDiv = document.createElement("div");
    messageDiv.className = "no-blogs-message";
    messageDiv.innerHTML = `
      <div class="no-blogs-content">
        <h3>表示するブログがありません</h3>
        <p>「${categoryId === "all" ? "All" : categoryId}」カテゴリーにはまだブログが投稿されていません。</p>
      </div>
    `;

    blogGrid.appendChild(messageDiv);
  };

  const hideNoBlogsMessage = (blogGrid: Element | null) => {
    if (!blogGrid) return;

    const existingMessage = blogGrid.querySelector(".no-blogs-message");
    if (existingMessage) {
      existingMessage.remove();
    }
  };

  return (
    <div
      className={`hover-indicator-nav ${showBackground ? "with-background" : "no-background"} ${className}`}
      ref={navRef}
    >
      <span
        className={`indicator${indicator.show ? " visible" : ""}`}
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
        }}
        aria-hidden
      />
      {items.map((item) => (
        <button
          key={item.id}
          className="indicator-button"
          onMouseEnter={(e) => updateIndicator(e.currentTarget, true)}
          onMouseLeave={() =>
            setIndicator((prev) => ({ ...prev, show: false }))
          }
          onClick={() => {
            if (enableBlogFilter) {
              handleBlogFilter(item.id);
            }
            onItemClick?.(item.id);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
