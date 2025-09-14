import { useState, useRef, useCallback } from "react";
import "./hover-indicator.css";

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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    show: false,
  });
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const updateIndicator = useCallback(
    (targetElement: HTMLButtonElement, show: boolean = false) => {
      if (!navRef.current) return;

      const rect = targetElement.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();

      // 縦レイアウトの場合はコンテナ全体をカバー
      const isVertical = navRef.current.classList.contains("vertical");

      if (isVertical) {
        const left = 16; // 左右に16pxの余白
        const top = rect.top - navRect.top - 5; // 上下に-5pxの余白
        const width = navRect.width - 32; // 左右32px削る
        const height = rect.height + 8; // 上下8px増やす

        setIndicatorStyle({
          left,
          top,
          width,
          height,
          show,
        });
      } else {
        // 横レイアウトの場合は従来通り
        const left = rect.left - navRect.left - 14;
        const top = rect.top - navRect.top - 2;
        const width = rect.width + 28;
        const height = rect.height + 4;

        setIndicatorStyle({
          left,
          top,
          width,
          height,
          show,
        });
      }
    },
    [],
  );

  const handleMouseEnter = useCallback(
    (itemId: string, element: HTMLButtonElement | HTMLDivElement) => {
      setHoveredItem(itemId);
      // ボタンまたはコンテナのどちらがホバーされたかに関わらず、ボタンを基準に位置計算
      const buttonElement = buttonRefs.current.get(itemId);
      if (buttonElement) {
        updateIndicator(buttonElement, true);
      }
    },
    [updateIndicator],
  );

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    // マウスがナビゲーション全体から離れた場合のみホバーを解除
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!navRef.current?.contains(relatedTarget)) {
      setHoveredItem(null);
      setIndicatorStyle((prev) => ({ ...prev, show: false }));
    }
  }, []);

  const handleContainerMouseLeave = useCallback((e: React.MouseEvent) => {
    // コンテナから離れた場合、次の要素に移動していない場合はホバーを解除
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentContainer = e.currentTarget as HTMLElement;

    // 同じナビゲーション内の他の要素に移動していない場合のみホバーを解除
    if (
      !navRef.current?.contains(relatedTarget) ||
      !currentContainer.parentElement?.contains(relatedTarget)
    ) {
      setHoveredItem(null);
      setIndicatorStyle((prev) => ({ ...prev, show: false }));
    }
  }, []);

  const handleContainerMouseEnter = useCallback(
    (itemId: string) => {
      setHoveredItem(itemId);
      const buttonElement = buttonRefs.current.get(itemId);
      if (buttonElement) {
        updateIndicator(buttonElement, true);
      }
    },
    [updateIndicator],
  );

  const handleBlogFilter = useCallback(
    (categoryId: string) => {
      if (!enableBlogFilter) return;

      // ページネーション機能と連携
      if (window.blogPagination) {
        window.blogPagination.filterByCategory(categoryId);
        return;
      }

      // フォールバック: 既存のアニメーション機能
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
            }, 1200);
          } else {
            // 非表示にするカードは隠す
            card.classList.add("hidden");
          }
        });

        // ブログがない場合のメッセージ表示
        if (matchingCards.length === 0) {
          showNoBlogsMessage(blogGrid, categoryId);
        }
      }, 720); // 3周回転の途中（60%地点）で切り替え
    },
    [enableBlogFilter],
  );

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
      if (enableBlogFilter) {
        handleBlogFilter(id);
      }
      onItemClick?.(id);
    },
    [onItemClick, enableBlogFilter, handleBlogFilter],
  );

  return (
    <div
      className={`hover-indicator-nav ${showBackground ? "with-background" : "no-background"} ${className}`}
      ref={navRef}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={`indicator ${indicatorStyle.show ? "visible" : ""}`}
        style={{
          left: indicatorStyle.left,
          top: indicatorStyle.top,
          width: indicatorStyle.width,
          height: indicatorStyle.height,
        }}
        aria-hidden
      />
      {items.map((item) => (
        <div
          key={item.id}
          className="button-container"
          onMouseEnter={() => handleContainerMouseEnter(item.id)}
          onMouseLeave={handleContainerMouseLeave}
        >
          <button
            ref={(el) => {
              if (el) buttonRefs.current.set(item.id, el);
            }}
            className={`indicator-button ${hoveredItem === item.id ? "hovered" : ""}`}
            onClick={() => handleItemClick(item.id)}
            onMouseEnter={() =>
              handleMouseEnter(item.id, buttonRefs.current.get(item.id)!)
            }
            onMouseLeave={handleMouseLeave}
          >
            <span className="button-content">{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
