import React, { useRef, useCallback, useEffect } from "react";
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
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const isFirstMoveRef = useRef<boolean>(true);

  // リサイズハンドラー（シンプル化）
  useEffect(() => {
    return () => {
      // RAFのクリーンアップ
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const animateIndicator = useCallback(
    (targetElement: HTMLButtonElement | null) => {
      if (!indicatorRef.current || !navRef.current) return;

      const indicator = indicatorRef.current;
      
      if (targetElement) {
        // ターゲット要素の位置とサイズを取得
        const rect = targetElement.getBoundingClientRect();
        const navRect = navRef.current.getBoundingClientRect();
        const isVertical = navRef.current.classList.contains("vertical");

        let left, top, width, height;

        if (isVertical) {
          left = 8;
          top = rect.top - navRect.top - 6.5;
          width = navRect.width - 16;
          height = rect.height + 8;
        } else {
          left = rect.left - navRect.left - 10;
          top = rect.top - navRect.top - 2;
          width = rect.width + 20;
          height = rect.height + 4;
        }

        // CSSトランジションで滑らかにアニメーション
        indicator.style.left = `${left}px`;
        indicator.style.top = `${top}px`;
        indicator.style.width = `${width}px`;
        indicator.style.height = `${height}px`;
        indicator.style.opacity = "1";
        indicator.style.transform = "scale(1.05)";
      } else {
        // ホバー解除時の設定
        indicator.style.opacity = "0";
        indicator.style.transform = "scale(0.7)";
      }
    },
    [],
  );

  const handleMouseEnter = useCallback(
    (itemId: string) => {
      const buttonElement = buttonRefs.current.get(itemId);
      animateIndicator(buttonElement || null);
    },
    [animateIndicator],
  );

  const handleMouseLeave = useCallback(() => {
    // インジケーターを非表示（上下アニメーションは残す）
    if (indicatorRef.current) {
      indicatorRef.current.style.opacity = "0";
      indicatorRef.current.style.transform = "scale(0.7)";
    }
  }, []);

  const handleNavMouseMove = useCallback((e: React.MouseEvent) => {
    if (!navRef.current) return;
    
    // 既存のRAFをキャンセル
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // RAFでスロットリング
    rafRef.current = requestAnimationFrame(() => {
      if (!navRef.current) return;
      
      const navRect = navRef.current.getBoundingClientRect();
      const mouseX = e.clientX - navRect.left;
      const mouseY = e.clientY - navRect.top;
      
      // 最初の移動時は現在のカーソル位置から開始
      if (isFirstMoveRef.current && indicatorRef.current) {
        indicatorRef.current.style.left = `${mouseX - 10}px`;
        indicatorRef.current.style.top = `${mouseY - 10}px`;
        indicatorRef.current.style.width = "20px";
        indicatorRef.current.style.height = "20px";
        indicatorRef.current.style.opacity = "0";
        indicatorRef.current.style.transform = "scale(0.7)";
        isFirstMoveRef.current = false;
      }
      
      // 各ボタンの位置をチェックして、マウスが最も近いボタンを特定
      let closestButton: HTMLButtonElement | null = null;
      let minDistance = Infinity;
      
      buttonRefs.current.forEach((button) => {
        const buttonRect = button.getBoundingClientRect();
        const buttonNavLeft = buttonRect.left - navRect.left;
        const buttonNavTop = buttonRect.top - navRect.top;
        
        // より軽量な距離計算（平方根を避ける）
        const deltaX = mouseX - (buttonNavLeft + buttonRect.width / 2);
        const deltaY = mouseY - (buttonNavTop + buttonRect.height / 2);
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        
        if (distanceSquared < minDistance) {
          minDistance = distanceSquared;
          closestButton = button;
        }
      });
      
      if (closestButton) {
        animateIndicator(closestButton);
      }
    });
  }, [animateIndicator]);

  const handleNavMouseEnter = useCallback((e: React.MouseEvent) => {
    // ナビゲーション領域に入った時にインジケーターをリセット
    if (indicatorRef.current && navRef.current) {
      // 現在のカーソル位置を取得
      const navRect = navRef.current.getBoundingClientRect();
      const mouseX = e.clientX - navRect.left;
      const mouseY = e.clientY - navRect.top;
      
      // インジケーターを現在のカーソル位置に設定
      indicatorRef.current.style.left = `${mouseX - 10}px`;
      indicatorRef.current.style.top = `${mouseY - 10}px`;
      indicatorRef.current.style.width = "20px";
      indicatorRef.current.style.height = "20px";
      indicatorRef.current.style.opacity = "0";
      indicatorRef.current.style.transform = "scale(0.7)";
    }
  }, []);

  const handleBlogFilter = useCallback(
    (categoryId: string) => {
      if (!enableBlogFilter) return;

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

  return React.createElement(
    'div',
    {
      className: `hover-indicator-nav ${showBackground ? "with-background" : "no-background"} ${className}`,
      ref: navRef,
      onMouseEnter: handleNavMouseEnter,
      onMouseMove: handleNavMouseMove,
      onMouseLeave: handleMouseLeave
    },
    React.createElement(
      'div',
      {
        ref: indicatorRef,
        className: "indicator",
        'aria-hidden': true
      }
    ),
    items.map((item) =>
      React.createElement(
        'div',
        {
          key: item.id,
          className: "button-container",
          onMouseEnter: () => handleMouseEnter(item.id),
          onMouseLeave: handleMouseLeave
        },
        React.createElement(
          'button',
          {
            ref: (el: HTMLButtonElement | null) => {
              if (el) buttonRefs.current.set(item.id, el);
            },
            className: "indicator-button",
            onClick: () => handleItemClick(item.id),
            onMouseEnter: () => handleMouseEnter(item.id),
            onMouseLeave: handleMouseLeave
          },
          React.createElement(
            'span',
            { className: "button-content" },
            item.label
          )
        )
      )
    )
  );
}
