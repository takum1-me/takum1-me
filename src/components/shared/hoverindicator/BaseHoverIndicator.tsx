import React, { useRef, useCallback, useEffect } from "react";
import "./base-hover-indicator.css";

// ホバーの表示範囲設定
const HOVER_DISPLAY_MARGIN = 100; // ホバーが表示される範囲（px）

interface BaseHoverIndicatorProps {
  items: Array<{
    id: string;
    label: string;
    href?: string;
  }>;
  onItemClick?: (id: string) => void;
  className?: string;
  showBackground?: boolean;
  variant?: "header" | "blog-filter";
}

export default function BaseHoverIndicator({
  items,
  onItemClick,
  className = "",
  showBackground = false,
  variant = "header",
}: BaseHoverIndicatorProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const isFirstMoveRef = useRef<boolean>(true);

  // 慣性用の状態
  const lastMousePositionRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const targetPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isAnimatingRef = useRef<boolean>(false);

  // インジケーターをリセットする関数（エントリー時専用）
  const resetIndicatorOnEntry = useCallback(
    (mouseX: number, mouseY: number) => {
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
          const firstButtonCenter =
            firstButtonRect.top - navRect.top + firstButtonRect.height / 2;
          const lastButtonCenter =
            lastButtonRect.top - navRect.top + lastButtonRect.height / 2;

          // エントリー時の制御（上下の要素の中心を過ぎた場合は適切な位置に設定）
          if (mouseY < firstButtonCenter) {
            top = Math.max(0, firstButtonCenter - height / 2);
          } else if (mouseY > lastButtonCenter) {
            top = Math.min(
              navRect.height - height,
              lastButtonCenter - height / 2,
            );
          }
        }

        // ナビゲーション領域内に制限
        top = Math.max(0, Math.min(top, navRect.height - height));

        indicator.style.left = "8px";
        indicator.style.top = `${top}px`;
        indicator.style.width = `${width}px`;
        indicator.style.height = `${height}px`;
      } else {
        const width = 120;
        const height = 45;
        const top = 8;

        // 端の要素の中心位置を計算
        const firstButton = buttonRefs.current.get(items[0]?.id);
        const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);

        let left = mouseX - width / 2;

        if (firstButton && lastButton) {
          const firstButtonRect = firstButton.getBoundingClientRect();
          const lastButtonRect = lastButton.getBoundingClientRect();

          // ナビゲーション領域に対する相対位置に変換
          const firstButtonCenter =
            firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
          const lastButtonCenter =
            lastButtonRect.left - navRect.left + lastButtonRect.width / 2;

          // エントリー時の制御
          const hoverDisplayMargin = HOVER_DISPLAY_MARGIN;

          if (mouseX < firstButtonCenter - hoverDisplayMargin) {
            left = Math.max(
              -HOVER_DISPLAY_MARGIN,
              firstButtonCenter - width / 2,
            );
          } else if (mouseX > lastButtonCenter + hoverDisplayMargin) {
            left = Math.min(
              navRect.width - width + HOVER_DISPLAY_MARGIN,
              lastButtonCenter - width / 2,
            );
          }
        }

        // 最終的な制限
        if (firstButton && lastButton) {
          const firstButtonRect = firstButton.getBoundingClientRect();
          const lastButtonRect = lastButton.getBoundingClientRect();
          const firstButtonCenter =
            firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
          const lastButtonCenter =
            lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
          left = Math.max(
            firstButtonCenter - width / 2,
            Math.min(left, lastButtonCenter - width / 2),
          );
        } else {
          left = Math.max(
            -HOVER_DISPLAY_MARGIN,
            Math.min(left, navRect.width - width + HOVER_DISPLAY_MARGIN),
          );
        }

        indicator.style.left = `${left}px`;
        indicator.style.top = `${top}px`;
        indicator.style.width = `${width}px`;
        indicator.style.height = `${height}px`;
      }

      indicator.style.opacity = "0";
      indicator.style.transform = "scale(0.8)";
    },
    [items],
  );

  // 慣性アニメーション関数
  const animateWithInertia = useCallback(() => {
    if (!indicatorRef.current || !navRef.current || !isAnimatingRef.current) {
      isAnimatingRef.current = false;
      return;
    }

    const indicator = indicatorRef.current;
    const navRect = navRef.current.getBoundingClientRect();
    const isVertical = navRef.current.classList.contains("vertical");

    const maxSpeed = 10;
    const minSpeed = 0.1;

    if (isVertical) {
      const currentTop = parseFloat(indicator.style.top) || 0;
      const targetTop = targetPositionRef.current.y;
      const distanceY = targetTop - currentTop;
      const speedY = Math.max(
        minSpeed,
        Math.min(maxSpeed, Math.abs(distanceY) * 0.3),
      );

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
      const currentLeft = parseFloat(indicator.style.left) || 0;
      const targetLeft = targetPositionRef.current.x;
      const distanceX = targetLeft - currentLeft;
      const speedX = Math.max(
        minSpeed,
        Math.min(maxSpeed, Math.abs(distanceX) * 0.3),
      );

      let newLeft = currentLeft;
      if (Math.abs(distanceX) > 0.5) {
        newLeft = currentLeft + Math.sign(distanceX) * speedX;
        // ホバーの中心が左右の端の単語の真ん中まで
        const firstButton = buttonRefs.current.get(items[0]?.id);
        const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);

        if (firstButton && lastButton) {
          const firstButtonRect = firstButton.getBoundingClientRect();
          const lastButtonRect = lastButton.getBoundingClientRect();
          const firstButtonCenter =
            firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
          const lastButtonCenter =
            lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
          newLeft = Math.max(
            firstButtonCenter - 60,
            Math.min(newLeft, lastButtonCenter - 60),
          );
        } else {
          newLeft = Math.max(
            -HOVER_DISPLAY_MARGIN,
            Math.min(newLeft, navRect.width - 120 + HOVER_DISPLAY_MARGIN),
          );
        }
        requestAnimationFrame(animateWithInertia);
      } else {
        newLeft = targetLeft;
        isAnimatingRef.current = false;
      }

      indicator.style.left = `${newLeft}px`;
    }
  }, [items]);

  // インジケーターを非表示にする関数
  const hideIndicator = useCallback(() => {
    if (!indicatorRef.current) return;

    const indicator = indicatorRef.current;
    isAnimatingRef.current = false;
    indicator.style.opacity = "0";
    indicator.style.transform = "scale(0.7)";
  }, []);

  // リサイズハンドラー
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const updateIndicatorPosition = useCallback(
    (mouseX: number, mouseY: number) => {
      if (!indicatorRef.current || !navRef.current) return;

      const indicator = indicatorRef.current;
      const navRect = navRef.current.getBoundingClientRect();
      const isVertical = navRef.current.classList.contains("vertical");

      const currentTime = performance.now();
      lastMousePositionRef.current = {
        x: mouseX,
        y: mouseY,
        time: currentTime,
      };

      let targetLeft, targetTop, width, height;

      if (isVertical) {
        width = navRect.width - 16;
        height = 40;
        targetLeft = 8;

        const firstButton = buttonRefs.current.get(items[0]?.id);
        const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);

        let calculatedTop = mouseY - height / 2;

        if (firstButton && lastButton) {
          const firstButtonRect = firstButton.getBoundingClientRect();
          const lastButtonRect = lastButton.getBoundingClientRect();

          const firstButtonCenter =
            firstButtonRect.top - navRect.top + firstButtonRect.height / 2;
          const lastButtonCenter =
            lastButtonRect.top - navRect.top + lastButtonRect.height / 2;

          if (mouseY < firstButtonCenter) {
            const currentTop = parseFloat(indicator.style.top) || 0;
            calculatedTop = Math.max(
              0,
              Math.min(currentTop, firstButtonCenter - height / 2),
            );
          } else if (mouseY > lastButtonCenter) {
            const currentTop = parseFloat(indicator.style.top) || 0;
            calculatedTop = Math.min(
              navRect.height - height,
              Math.max(currentTop, lastButtonCenter - height / 2),
            );
          }
        }

        targetTop = Math.max(
          0,
          Math.min(calculatedTop, navRect.height - height),
        );

        if (mouseY < 0 || mouseY > navRect.height) {
          hideIndicator();
          isAnimatingRef.current = false;
          return;
        }

        targetPositionRef.current = { x: targetLeft, y: targetTop };
      } else {
        width = 120;
        height = 45;
        targetTop = 8;

        const firstButton = buttonRefs.current.get(items[0]?.id);
        const lastButton = buttonRefs.current.get(items[items.length - 1]?.id);

        let calculatedLeft = mouseX - width / 2;

        if (firstButton && lastButton) {
          const firstButtonRect = firstButton.getBoundingClientRect();
          const lastButtonRect = lastButton.getBoundingClientRect();

          const firstButtonCenter =
            firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
          const lastButtonCenter =
            lastButtonRect.left - navRect.left + lastButtonRect.width / 2;

          const hoverDisplayMargin = HOVER_DISPLAY_MARGIN;

          if (mouseX < firstButtonCenter - hoverDisplayMargin) {
            const currentLeft = parseFloat(indicator.style.left) || 0;
            calculatedLeft = Math.max(
              -HOVER_DISPLAY_MARGIN,
              Math.min(currentLeft, firstButtonCenter - width / 2),
            );
          } else if (mouseX > lastButtonCenter + hoverDisplayMargin) {
            const currentLeft = parseFloat(indicator.style.left) || 0;
            calculatedLeft = Math.min(
              navRect.width - width + HOVER_DISPLAY_MARGIN,
              Math.max(currentLeft, lastButtonCenter - width / 2),
            );
          }
        }

        if (firstButton && lastButton) {
          const firstButtonRect = firstButton.getBoundingClientRect();
          const lastButtonRect = lastButton.getBoundingClientRect();
          const firstButtonCenter =
            firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
          const lastButtonCenter =
            lastButtonRect.left - navRect.left + lastButtonRect.width / 2;
          targetLeft = Math.max(
            firstButtonCenter - width / 2,
            Math.min(calculatedLeft, lastButtonCenter - width / 2),
          );
        } else {
          targetLeft = Math.max(
            -HOVER_DISPLAY_MARGIN,
            Math.min(
              calculatedLeft,
              navRect.width - width + HOVER_DISPLAY_MARGIN,
            ),
          );
        }

        targetPositionRef.current = { x: targetLeft, y: targetTop };
      }

      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
      indicator.style.opacity = "1";
      indicator.style.transform = "scale(1)";

      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        requestAnimationFrame(animateWithInertia);
      }
    },
    [items, animateWithInertia, hideIndicator],
  );

  const handleMouseLeave = useCallback(() => {
    hideIndicator();
    isAnimatingRef.current = false;
    lastMousePositionRef.current = null;
    isFirstMoveRef.current = true;
  }, [hideIndicator]);

  const handleNavMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!navRef.current) return;

      const navRect = navRef.current.getBoundingClientRect();
      const mouseX = e.clientX - navRect.left;
      const mouseY = e.clientY - navRect.top;
      const isVertical = navRef.current.classList.contains("vertical");

      if (isVertical) {
        if (mouseY < 0 || mouseY > navRect.height) {
          hideIndicator();
          isAnimatingRef.current = false;
          lastMousePositionRef.current = null;
          isFirstMoveRef.current = true;
          return;
        }
      }

      if (isFirstMoveRef.current) {
        resetIndicatorOnEntry(mouseX, mouseY);
        isFirstMoveRef.current = false;
      }

      updateIndicatorPosition(mouseX, mouseY);
    },
    [updateIndicatorPosition, resetIndicatorOnEntry, hideIndicator],
  );

  const handleNavMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      if (navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const mouseX = e.clientX - navRect.left;
        const mouseY = e.clientY - navRect.top;

        isAnimatingRef.current = false;
        lastMousePositionRef.current = null;
        resetIndicatorOnEntry(mouseX, mouseY);
        isFirstMoveRef.current = true;
      }
    },
    [resetIndicatorOnEntry],
  );

  const handleItemClick = useCallback(
    (id: string) => {
      onItemClick?.(id);
    },
    [onItemClick],
  );

  return React.createElement(
    "div",
    {
      className: `base-hover-indicator-nav ${showBackground ? "with-background" : "no-background"} ${variant} ${className}`,
      ref: navRef,
      onMouseEnter: handleNavMouseEnter,
      onMouseMove: handleNavMouseMove,
      onMouseLeave: handleMouseLeave,
    },
    React.createElement("div", {
      ref: indicatorRef,
      className: "hover-indicator",
      "aria-hidden": true,
    }),
    items.map((item) =>
      React.createElement(
        "div",
        {
          key: item.id,
          className: "button-container",
        },
        React.createElement(
          "button",
          {
            ref: (el: HTMLButtonElement | null) => {
              if (el) buttonRefs.current.set(item.id, el);
            },
            className: `indicator-button${className.includes("vertical") ? " indicator-button--mobile-vertical" : ""}`,
            onClick: () => handleItemClick(item.id),
          },
          React.createElement(
            "span",
            { className: "button-content" },
            item.label,
          ),
        ),
      ),
    ),
  );
}
