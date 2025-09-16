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
      const top = 8; // 上下位置を固定（少し下に配置）
      
      // 端の要素の中心位置を計算
      const firstButton = buttonRefs.current.get(items[0]?.id);
      const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);
      
      let left = mouseX - width / 2; // カーソルに追従する位置
      
      if (firstButton && lastButton) {
        const firstButtonRect = firstButton.getBoundingClientRect();
        const lastButtonRect = lastButton.getBoundingClientRect();
        
        // ナビゲーション領域に対する相対位置に変換
        const firstButtonCenter = firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
        const lastButtonCenter = lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
        
        // エントリー時の制御（端の要素の中心を過ぎた場合は適切な位置に設定）
        if (mouseX < firstButtonCenter) {
          left = Math.max(-30, firstButtonCenter - width / 2);
        } else if (mouseX > lastButtonCenter) {
          left = Math.min(navRect.width - width + 30, lastButtonCenter - width / 2);
        }
      }
      
      // 最終的な制限
      left = Math.max(-30, Math.min(left, navRect.width - width + 30));
      
      indicator.style.left = `${left}px`;
      indicator.style.top = `${top}px`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
    }
    
    indicator.style.opacity = "0";
    indicator.style.transform = "scale(0.8)";
  }, [items]);

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
      top = 8; // 上下位置を固定（少し下に配置）
      
      // 端の要素の中心位置を計算
      const firstButton = buttonRefs.current.get(items[0]?.id);
      const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);
      
      console.log('Items:', items);
      console.log('Button refs:', buttonRefs.current);
      console.log('First button ID:', items[0]?.id, 'Button:', firstButton);
      console.log('Last button ID:', items[items.length - 1]?.id, 'Button:', lastButton);
      
      let targetLeft = mouseX - width / 2; // カーソルに追従する位置
      
      if (firstButton && lastButton) {
        const firstButtonRect = firstButton.getBoundingClientRect();
        const lastButtonRect = lastButton.getBoundingClientRect();
        
        // ナビゲーション領域に対する相対位置に変換
        const firstButtonCenter = firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
        const lastButtonCenter = lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
        
        console.log('Nav rect:', navRect);
        console.log('First button rect:', firstButtonRect);
        console.log('Last button rect:', lastButtonRect);
        console.log('First button center:', firstButtonCenter);
        console.log('Last button center:', lastButtonCenter);
        console.log('Mouse X:', mouseX);
        
        // 端の要素の中心を過ぎた場合の制御
        if (mouseX < firstButtonCenter) {
          console.log('Left of first button center - should freeze');
          // 最初の要素の中心より左の場合、ホバーは動かない（最後の位置で固定）
          const currentLeft = parseFloat(indicator.style.left) || 0;
          // 既に固定位置にある場合はそのまま、そうでなければ最初の要素の中心に移動
          left = Math.max(-30, Math.min(currentLeft, firstButtonCenter - width / 2));
          console.log('Frozen left position:', left, 'current:', currentLeft);
        } else if (mouseX > lastButtonCenter) {
          console.log('Right of last button center - should freeze');
          // 最後の要素の中心より右の場合、ホバーは動かない（最後の位置で固定）
          const currentLeft = parseFloat(indicator.style.left) || 0;
          // 既に固定位置にある場合はそのまま、そうでなければ最後の要素の中心に移動
          left = Math.min(navRect.width - width + 30, Math.max(currentLeft, lastButtonCenter - width / 2));
          console.log('Frozen right position:', left, 'current:', currentLeft);
        } else {
          console.log('Between button centers - should follow');
          // 通常の追従（端の要素の中心間では自由に動く）
          left = targetLeft;
          console.log('Following position:', left);
        }
      } else {
        console.log('Buttons not found - using normal tracking');
        // ボタンが見つからない場合は通常の制限
        left = targetLeft;
      }
      
      // 最終的な制限（表示範囲は30px外側まで維持）
      left = Math.max(-30, Math.min(left, navRect.width - width + 30));
    }

    // インジケーターの位置を更新
    indicator.style.left = `${left}px`;
    indicator.style.top = `${top}px`;
    indicator.style.width = `${width}px`;
    indicator.style.height = `${height}px`;
    indicator.style.opacity = "1";
    indicator.style.transform = "scale(1)";
  }, [items]);

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
