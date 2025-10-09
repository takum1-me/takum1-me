import React, { useCallback } from "react";
import BaseHoverIndicator from "./BaseHoverIndicator";

// Extend window object for pagination
declare global {
  interface Window {
    blogPagination?: {
      filterByCategory: (categoryId: string) => void;
      showPage: (page: number) => void;
      previousPage: () => void;
      nextPage: () => void;
    };
  }
}

interface BlogFilterHoverIndicatorProps {
  items: Array<{
    id: string;
    label: string;
    href?: string;
  }>;
  onItemClick?: (id: string) => void;
  className?: string;
}

export default function BlogFilterHoverIndicator({
  items,
  onItemClick,
  className = "",
}: BlogFilterHoverIndicatorProps) {
  const handleBlogFilter = useCallback((categoryId: string) => {
    // ページネーション機能と連携
    if (window.blogPagination) {
      window.blogPagination.filterByCategory(categoryId);
      return;
    }

    // アニメーションなしでフィルタリング
    const blogCards = document.querySelectorAll(".blog-card");
    const blogGrid = document.querySelector(".blog-grid");

    // 既存のメッセージを先に削除
    hideNoBlogsMessage(blogGrid);

    // 選択されたカテゴリーに該当するカードを確認
    const matchingCards = Array.from(blogCards).filter((card) => {
      const cardCategory = card.getAttribute("data-category");
      return categoryId === "all" || cardCategory === categoryId;
    });

    // 全てのカードの状態をリセット
    blogCards.forEach((card) => {
      card.classList.remove("animating", "animating-in", "hidden");
    });

    // 新しい状態を適用（アニメーションなし）
    blogCards.forEach((card) => {
      const cardCategory = card.getAttribute("data-category");

      if (categoryId === "all" || cardCategory === categoryId) {
        // 表示するカード
        card.classList.remove("hidden");
      } else {
        // 非表示にするカード
        card.classList.add("hidden");
      }
    });

    // ブログがない場合のメッセージ表示
    if (matchingCards.length === 0) {
      showNoBlogsMessage(blogGrid, categoryId);
    }
  }, []);

  const showNoBlogsMessage = useCallback(
    (blogGrid: Element | null, categoryId: string) => {
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
    },
    [],
  );

  const hideNoBlogsMessage = useCallback((blogGrid: Element | null) => {
    if (!blogGrid) return;

    const existingMessage = blogGrid.querySelector(".no-blogs-message");
    if (existingMessage) {
      existingMessage.remove();
    }
  }, []);

  const handleItemClick = useCallback(
    (id: string) => {
      handleBlogFilter(id);
      onItemClick?.(id);
    },
    [onItemClick, handleBlogFilter],
  );

  return React.createElement(BaseHoverIndicator, {
    items,
    onItemClick: handleItemClick,
    className: `blog-filter-hover-indicator ${className}`,
    showBackground: true,
    variant: "blog-filter",
  });
}
