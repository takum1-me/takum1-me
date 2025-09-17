import React, { useRef, useCallback, useEffect } from "react";
import "./hover-indicator.css";

// ホバーの表示範囲設定
const HOVER_DISPLAY_MARGIN = 100; // ホバーが表示される範囲（px）

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
  
  // 慣性用の状態
  const lastMousePositionRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const currentVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isAnimatingRef = useRef<boolean>(false);

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
      
      // 上下の要素の中心位置を計算
      const firstButton = buttonRefs.current.get(items[0]?.id);
      const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);
      
      let top = mouseY - height / 2;
      
      if (firstButton && lastButton) {
        const firstButtonRect = firstButton.getBoundingClientRect();
        const lastButtonRect = lastButton.getBoundingClientRect();
        
        // ナビゲーション領域に対する相対位置に変換
        const firstButtonCenter = firstButtonRect.top - navRect.top + firstButtonRect.height / 2;
        const lastButtonCenter = lastButtonRect.top - navRect.top + lastButtonRect.height / 2;
        
        // エントリー時の制御（上下の要素の中心を過ぎた場合は適切な位置に設定）
        if (mouseY < firstButtonCenter) {
          top = Math.max(0, firstButtonCenter - height / 2);
        } else if (mouseY > lastButtonCenter) {
          top = Math.min(navRect.height - height, lastButtonCenter - height / 2);
        }
      }
      
      // ナビゲーション領域内に制限
      top = Math.max(0, Math.min(top, navRect.height - height));
      
      indicator.style.left = "8px";
      indicator.style.top = `${top}px`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
    } else {
      const width = 120; // 幅を100から120に拡張
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
        // ホバーが表示される範囲を一番外側まで拡張
        const hoverDisplayMargin = HOVER_DISPLAY_MARGIN;
        
        console.log('DEBUG - Entry:', {
          mouseX,
          firstButtonCenter,
          lastButtonCenter,
          hoverDisplayMargin,
          leftBoundary: firstButtonCenter - hoverDisplayMargin,
          rightBoundary: lastButtonCenter + hoverDisplayMargin
        });
        
        if (mouseX < firstButtonCenter - hoverDisplayMargin) {
          // 最初の要素の中心より100px左の場合、ホバーは動かない
          left = Math.max(-HOVER_DISPLAY_MARGIN, firstButtonCenter - width / 2);
          console.log('DEBUG - Left boundary triggered, setting left to:', left);
        } else if (mouseX > lastButtonCenter + hoverDisplayMargin) {
          // 最後の要素の中心より100px右の場合、ホバーは動かない
          left = Math.min(navRect.width - width + HOVER_DISPLAY_MARGIN, lastButtonCenter - width / 2);
          console.log('DEBUG - Right boundary triggered, setting left to:', left);
        } else {
          console.log('DEBUG - Normal tracking, left calculated as:', left);
        }
      }
      
      // 最終的な制限（ホバーの中心が左右の端の単語の真ん中まで）
      if (firstButton && lastButton) {
        const firstButtonRect = firstButton.getBoundingClientRect();
        const lastButtonRect = lastButton.getBoundingClientRect();
        const firstButtonCenter = firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
        const lastButtonCenter = lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
        left = Math.max(firstButtonCenter - width / 2, Math.min(left, lastButtonCenter - width / 2));
      } else {
        left = Math.max(-HOVER_DISPLAY_MARGIN, Math.min(left, navRect.width - width + HOVER_DISPLAY_MARGIN));
      }
      
      indicator.style.left = `${left}px`;
      indicator.style.top = `${top}px`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
    }
    
    indicator.style.opacity = "0";
    indicator.style.transform = "scale(0.8)";
  }, [items]);

  // 慣性アニメーション関数
  const animateWithInertia = useCallback(() => {
    if (!indicatorRef.current || !navRef.current || !isAnimatingRef.current) {
      isAnimatingRef.current = false;
      return;
    }

    const indicator = indicatorRef.current;
    const navRect = navRef.current.getBoundingClientRect();
    const isVertical = navRef.current.classList.contains("vertical");

    // 慣性パラメータ
    const friction = 0.85; // 摩擦係数（0-1、1に近いほど慣性が強い）
    const maxSpeed = 10; // 最大追従速度（遅く調整）
    const minSpeed = 0.1; // 最小追従速度

    if (isVertical) {
      // 垂直レイアウトの場合
      const currentTop = parseFloat(indicator.style.top) || 0;
      const targetTop = targetPositionRef.current.y;
      const distanceY = targetTop - currentTop;
      const speedY = Math.max(minSpeed, Math.min(maxSpeed, Math.abs(distanceY) * 0.3));
      
      let newTop = currentTop;
      if (Math.abs(distanceY) > 0.5) {
        newTop = currentTop + Math.sign(distanceY) * speedY;
        newTop = Math.max(0, Math.min(newTop, navRect.height - 40));
        requestAnimationFrame(animateWithInertia);
      } else {
        newTop = targetTop;
        indicator.style.top = `${newTop}px`;
        isAnimatingRef.current = false;
      }

      indicator.style.top = `${newTop}px`;
    } else {
      // 水平レイアウトの場合
      const currentLeft = parseFloat(indicator.style.left) || 0;
      const targetLeft = targetPositionRef.current.x;
      const distanceX = targetLeft - currentLeft;
      const speedX = Math.max(minSpeed, Math.min(maxSpeed, Math.abs(distanceX) * 0.3));
      
      let newLeft = currentLeft;
      if (Math.abs(distanceX) > 0.5) {
        newLeft = currentLeft + Math.sign(distanceX) * speedX;
        // ホバーの中心が左右の端の単語の真ん中まで
        const firstButton = buttonRefs.current.get(items[0]?.id);
        const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);
        
        if (firstButton && lastButton) {
          const firstButtonRect = firstButton.getBoundingClientRect();
          const lastButtonRect = lastButton.getBoundingClientRect();
          const firstButtonCenter = firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
          const lastButtonCenter = lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
          newLeft = Math.max(firstButtonCenter - 60, Math.min(newLeft, lastButtonCenter - 60)); // 60 = width/2
        } else {
          newLeft = Math.max(-HOVER_DISPLAY_MARGIN, Math.min(newLeft, navRect.width - 120 + HOVER_DISPLAY_MARGIN));
        }
        requestAnimationFrame(animateWithInertia);
      } else {
        newLeft = targetLeft;
        isAnimatingRef.current = false;
      }

      indicator.style.left = `${newLeft}px`;
    }
  }, [items]);

  // インジケーターを非表示にする関数（リーブ時専用）
  const hideIndicator = useCallback(() => {
    if (!indicatorRef.current) return;
    
    const indicator = indicatorRef.current;
    
    // アニメーションを停止
    isAnimatingRef.current = false;
    
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

    // カーソル速度を計算
    const currentTime = performance.now();
    let velocityX = 0, velocityY = 0;
    
    if (lastMousePositionRef.current) {
      const timeDelta = currentTime - lastMousePositionRef.current.time;
      if (timeDelta > 0) {
        velocityX = (mouseX - lastMousePositionRef.current.x) / timeDelta;
        velocityY = (mouseY - lastMousePositionRef.current.y) / timeDelta;
      }
    }
    
    // マウス位置を記録
    lastMousePositionRef.current = { x: mouseX, y: mouseY, time: currentTime };

    // シンプルな固定サイズのインジケーター
    let targetLeft, targetTop, width, height;

    if (isVertical) {
      // 垂直レイアウトの場合
      width = navRect.width - 16;
      height = 40;
      targetLeft = 8;
      
      // 上下の要素の中心位置を計算
      const firstButton = buttonRefs.current.get(items[0]?.id);
      const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);
      
      let calculatedTop = mouseY - height / 2;
      
      if (firstButton && lastButton) {
        const firstButtonRect = firstButton.getBoundingClientRect();
        const lastButtonRect = lastButton.getBoundingClientRect();
        
        // ナビゲーション領域に対する相対位置に変換
        const firstButtonCenter = firstButtonRect.top - navRect.top + firstButtonRect.height / 2;
        const lastButtonCenter = lastButtonRect.top - navRect.top + lastButtonRect.height / 2;
        
        // 上下の要素の中心を過ぎた場合の制御
        if (mouseY < firstButtonCenter) {
          // 最初の要素の中心より上の場合、ホバーは動かない（最後の位置で固定）
          const currentTop = parseFloat(indicator.style.top) || 0;
          calculatedTop = Math.max(0, Math.min(currentTop, firstButtonCenter - height / 2));
        } else if (mouseY > lastButtonCenter) {
          // 最後の要素の中心より下の場合、ホバーは動かない（最後の位置で固定）
          const currentTop = parseFloat(indicator.style.top) || 0;
          calculatedTop = Math.min(navRect.height - height, Math.max(currentTop, lastButtonCenter - height / 2));
        }
      }
      
      // ナビゲーション領域内に制限
      targetTop = Math.max(0, Math.min(calculatedTop, navRect.height - height));
      
      // 垂直レイアウトでマウスが領域外に出た場合はホバーを非表示
      if (mouseY < 0 || mouseY > navRect.height) {
        hideIndicator();
        isAnimatingRef.current = false;
        return;
      }
      
      // ターゲット位置を設定
      targetPositionRef.current = { x: targetLeft, y: targetTop };
    } else {
      // 水平レイアウトの場合 - 上下位置を固定して左右のみ追従
      width = 120; // 幅を100から120に拡張
      height = 45;
      targetTop = 8; // 上下位置を固定（少し下に配置）
      
      // 端の要素の中心位置を計算
      const firstButton = buttonRefs.current.get(items[0]?.id);
      const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);
      
      let calculatedLeft = mouseX - width / 2; // カーソルに追従する位置
      
      if (firstButton && lastButton) {
        const firstButtonRect = firstButton.getBoundingClientRect();
        const lastButtonRect = lastButton.getBoundingClientRect();
        
        // ナビゲーション領域に対する相対位置に変換
        const firstButtonCenter = firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
        const lastButtonCenter = lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
        
        // 端の要素の中心を過ぎた場合の制御
        // ホバーが表示される範囲を一番外側まで拡張
        const hoverDisplayMargin = HOVER_DISPLAY_MARGIN;
        
        console.log('DEBUG - Update:', {
          mouseX,
          firstButtonCenter,
          lastButtonCenter,
          hoverDisplayMargin,
          leftBoundary: firstButtonCenter - hoverDisplayMargin,
          rightBoundary: lastButtonCenter + hoverDisplayMargin
        });
        
        if (mouseX < firstButtonCenter - hoverDisplayMargin) {
          // 最初の要素の中心より100px左の場合、ホバーは動かない（最後の位置で固定）
          const currentLeft = parseFloat(indicator.style.left) || 0;
          calculatedLeft = Math.max(-HOVER_DISPLAY_MARGIN, Math.min(currentLeft, firstButtonCenter - width / 2));
          console.log('DEBUG - Left boundary triggered in update, setting calculatedLeft to:', calculatedLeft);
        } else if (mouseX > lastButtonCenter + hoverDisplayMargin) {
          // 最後の要素の中心より100px右の場合、ホバーは動かない（最後の位置で固定）
          const currentLeft = parseFloat(indicator.style.left) || 0;
          calculatedLeft = Math.min(navRect.width - width + HOVER_DISPLAY_MARGIN, Math.max(currentLeft, lastButtonCenter - width / 2));
          console.log('DEBUG - Right boundary triggered in update, setting calculatedLeft to:', calculatedLeft);
        } else {
          console.log('DEBUG - Normal tracking in update, calculatedLeft:', calculatedLeft);
        }
      }
      
      // 最終的な制限（ホバーの中心が左右の端の単語の真ん中まで）
      if (firstButton && lastButton) {
        const firstButtonRect = firstButton.getBoundingClientRect();
        const lastButtonRect = lastButton.getBoundingClientRect();
        const firstButtonCenter = firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
        const lastButtonCenter = lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
        targetLeft = Math.max(firstButtonCenter - width / 2, Math.min(calculatedLeft, lastButtonCenter - width / 2));
      } else {
        targetLeft = Math.max(-HOVER_DISPLAY_MARGIN, Math.min(calculatedLeft, navRect.width - width + HOVER_DISPLAY_MARGIN));
      }
      
      // ターゲット位置を設定
      targetPositionRef.current = { x: targetLeft, y: targetTop };
    }

    // インジケーターのサイズと表示状態を設定
    indicator.style.width = `${width}px`;
    indicator.style.height = `${height}px`;
    indicator.style.opacity = "1";
    indicator.style.transform = "scale(1)";

    // 慣性アニメーションを開始
    if (!isAnimatingRef.current) {
      isAnimatingRef.current = true;
      requestAnimationFrame(animateWithInertia);
    }
  }, [items, animateWithInertia]);

  const handleMouseLeave = useCallback(() => {
    // インジケーターを非表示（滑らかなアニメーションを保持）
    hideIndicator();
    
    // アニメーション状態をリセット
    isAnimatingRef.current = false;
    lastMousePositionRef.current = null;
    
    // フラグをリセットして、次回のエントリー時に正しく動作するようにする
    isFirstMoveRef.current = true;
  }, [hideIndicator]);

  const handleNavMouseMove = useCallback((e: React.MouseEvent) => {
    if (!navRef.current) return;
    
    const navRect = navRef.current.getBoundingClientRect();
    const mouseX = e.clientX - navRect.left;
    const mouseY = e.clientY - navRect.top;
    const isVertical = navRef.current.classList.contains("vertical");
    
    // 垂直レイアウトの場合、ナビゲーション領域外に出た場合はホバーを非表示
    if (isVertical) {
      if (mouseY < 0 || mouseY > navRect.height) {
        hideIndicator();
        isAnimatingRef.current = false;
        lastMousePositionRef.current = null;
        isFirstMoveRef.current = true;
        return;
      }
    }
    
    // 最初の移動時は現在のカーソル位置から開始
    if (isFirstMoveRef.current) {
      // インジケーターを現在のカーソル位置にリセット（エントリー時専用）
      resetIndicatorOnEntry(mouseX, mouseY);
      isFirstMoveRef.current = false;
    }
    
    // カーソル位置に即座に追従
    updateIndicatorPosition(mouseX, mouseY);
  }, [updateIndicatorPosition, resetIndicatorOnEntry, hideIndicator]);

  const handleNavMouseEnter = useCallback((e: React.MouseEvent) => {
    // ナビゲーション領域に入った時にインジケーターをリセット
    if (navRef.current) {
      // 現在のカーソル位置を取得
      const navRect = navRef.current.getBoundingClientRect();
      const mouseX = e.clientX - navRect.left;
      const mouseY = e.clientY - navRect.top;
      
      // アニメーション状態をリセット
      isAnimatingRef.current = false;
      lastMousePositionRef.current = null;
      
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
