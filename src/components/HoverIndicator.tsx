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

  // インジケーターをリセットする関数（エントリー時専用）
  const resetIndicatorOnEntry = useCallback((mouseX: number, mouseY: number) => {
    if (!indicatorRef.current || !navRef.current) return;
    
    const indicator = indicatorRef.current;
    const navRect = navRef.current.getBoundingClientRect();
    const isVertical = navRef.current.classList.contains("vertical");
    
    // シンプルにカーソル位置に設定
    if (isVertical) {
      const width = navRect.width - 16;
      const height = 40;
      indicator.style.left = "8px";
      indicator.style.top = `${mouseY - height / 2}px`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
    } else {
      const width = 100;
      const height = 45;
      const left = mouseX - width / 2;
      const top = 8; // 上下位置を固定（少し下に配置）
      
      indicator.style.left = `${Math.max(-30, Math.min(left, navRect.width - width + 30))}px`;
      indicator.style.top = `${top}px`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
    }
    
    indicator.style.opacity = "0";
    indicator.style.transform = "scale(0.8)";
  }, []);

  // インジケーターを非表示にする関数（リーブ時専用）
  const hideIndicator = useCallback(() => {
    if (!indicatorRef.current) return;
    
    const indicator = indicatorRef.current;
    
    // トランジションを保持したまま非表示にする
    indicator.style.opacity = "0";
    indicator.style.transform = "scale(0.7)";
  }, []);

  // リサイズハンドラー（シンプル化）
  useEffect(() => {
    return () => {
      // RAFのクリーンアップ
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const updateIndicatorPosition = useCallback((mouseX: number, mouseY: number) => {
    if (!indicatorRef.current || !navRef.current) return;

    const indicator = indicatorRef.current;
    const navRect = navRef.current.getBoundingClientRect();
    const isVertical = navRef.current.classList.contains("vertical");

    // デバッグ用ログ
    console.log('Nav rect:', navRect);
    console.log('Mouse position:', mouseX, mouseY);

    // シンプルな固定サイズのインジケーター
    let left, top, width, height;

    if (isVertical) {
      // 垂直レイアウトの場合
      width = navRect.width - 16;
      height = 40;
      left = 8;
      top = mouseY - height / 2;
      
      // ナビゲーション領域内に制限
      top = Math.max(0, Math.min(top, navRect.height - height));
    } else {
      // 水平レイアウトの場合 - 上下位置を固定して左右のみ追従
      width = 100;
      height = 45;
      left = mouseX - width / 2;
      top = 8; // 上下位置を固定（少し下に配置）
      
      // ナビゲーション領域を左右30px外側まで拡張して制限
      const minLeft = -30;
      const maxLeft = navRect.width - width + 30;
      left = Math.max(minLeft, Math.min(left, maxLeft));
      
      console.log('Calculated left:', left, 'min:', minLeft, 'max:', maxLeft);
    }

    // インジケーターの位置を更新
    indicator.style.left = `${left}px`;
    indicator.style.top = `${top}px`;
    indicator.style.width = `${width}px`;
    indicator.style.height = `${height}px`;
    indicator.style.opacity = "1";
    indicator.style.transform = "scale(1)";
  }, []);

  const handleMouseLeave = useCallback(() => {
    // インジケーターを非表示（滑らかなアニメーションを保持）
    hideIndicator();
    
    // フラグをリセットして、次回のエントリー時に正しく動作するようにする
    isFirstMoveRef.current = true;
  }, [hideIndicator]);

  const handleNavMouseMove = useCallback((e: React.MouseEvent) => {
    if (!navRef.current) return;
    
    const navRect = navRef.current.getBoundingClientRect();
    const mouseX = e.clientX - navRect.left;
    const mouseY = e.clientY - navRect.top;
    
    // 最初の移動時は現在のカーソル位置から開始
    if (isFirstMoveRef.current) {
      // インジケーターを現在のカーソル位置にリセット（エントリー時専用）
      resetIndicatorOnEntry(mouseX, mouseY);
      isFirstMoveRef.current = false;
    }
    
    // カーソル位置に即座に追従
    updateIndicatorPosition(mouseX, mouseY);
  }, [updateIndicatorPosition, resetIndicatorOnEntry]);

  const handleNavMouseEnter = useCallback((e: React.MouseEvent) => {
    // ナビゲーション領域に入った時にインジケーターをリセット
    if (navRef.current) {
      // 現在のカーソル位置を取得
      const navRect = navRef.current.getBoundingClientRect();
      const mouseX = e.clientX - navRect.left;
      const mouseY = e.clientY - navRect.top;
      
      // インジケーターを現在のカーソル位置にリセット（エントリー時専用）
      resetIndicatorOnEntry(mouseX, mouseY);
      
      // フラグをリセットして、次の移動で正しく動作するようにする
      isFirstMoveRef.current = true;
    }
  }, [resetIndicatorOnEntry]);

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
          className: "button-container"
        },
        React.createElement(
          'button',
          {
            ref: (el: HTMLButtonElement | null) => {
              if (el) buttonRefs.current.set(item.id, el);
            },
            className: "indicator-button",
            onClick: () => handleItemClick(item.id)
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
