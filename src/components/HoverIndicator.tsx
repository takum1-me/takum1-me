import React, { useRef, useCallback, useEffect } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import "./hover-indicator.css";

gsap.registerPlugin(Flip);

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

  // レスポンシブ対応のためのリサイズハンドラー
  useEffect(() => {
    const handleResize = () => {
      // 現在ホバー中の要素があれば、アニメーションを再実行
      const currentIndicator = indicatorRef.current;
      if (currentIndicator && currentIndicator.style.opacity === "1") {
        gsap.killTweensOf(currentIndicator);
        const isMobile = window.innerWidth <= 768;
        gsap.to(currentIndicator, {
          x: isMobile ? -1 : -2,
          duration: isMobile ? 2 : 1.5,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const animateIndicator = useCallback(
    (targetElement: HTMLButtonElement | null) => {
      if (!indicatorRef.current || !navRef.current) return;

      const indicator = indicatorRef.current;
      
      // 既存のアニメーションを停止
      gsap.killTweensOf(indicator);
      
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

        // GSAPでアニメーション
        gsap.to(indicator, {
          left,
          top,
          width,
          height,
          opacity: 1,
          scale: 1.05,
          duration: 0.1,
          ease: "power1.inOut",
        });

        // ウニョウニョの揺らぎアニメーション（レスポンシブ対応）
        const isMobile = window.innerWidth <= 768;
        gsap.to(indicator, {
          x: isMobile ? -1 : -2,
          duration: isMobile ? 2 : 1.5,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      } else {
        // ホバー解除時のアニメーション
        gsap.to(indicator, {
          opacity: 0,
          scale: 0.7,
          duration: 0.3,
          ease: "power2.in",
        });
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
    animateIndicator(null);
  }, [animateIndicator]);

  const handleNavMouseMove = useCallback((e: React.MouseEvent) => {
    if (!navRef.current) return;
    
    const navRect = navRef.current.getBoundingClientRect();
    const mouseX = e.clientX - navRect.left;
    const mouseY = e.clientY - navRect.top;
    
    // 各ボタンの位置をチェックして、マウスが最も近いボタンを特定
    let closestButton: HTMLButtonElement | null = null;
    let minDistance = Infinity;
    
    buttonRefs.current.forEach((button) => {
      const buttonRect = button.getBoundingClientRect();
      const buttonNavLeft = buttonRect.left - navRect.left;
      const buttonNavTop = buttonRect.top - navRect.top;
      
      // マウスがボタンの範囲内または近くにあるかチェック
      const distance = Math.sqrt(
        Math.pow(mouseX - (buttonNavLeft + buttonRect.width / 2), 2) +
        Math.pow(mouseY - (buttonNavTop + buttonRect.height / 2), 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestButton = button;
      }
    });
    
    if (closestButton) {
      animateIndicator(closestButton);
    }
  }, [animateIndicator]);

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
