import React, { useRef, useCallback, useEffect } from "react";
import "./base-hover-indicator.css";
import {
  HOVER_DISPLAY_MARGIN,
  calculateVerticalIndicatorPosition,
  calculateHorizontalIndicatorPosition,
  calculateVerticalEntryPosition,
  calculateHorizontalEntryPosition,
} from "../../../lib/utils/indicator-position";

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

      const buttonRefsMap = {
        get: (id: string) => buttonRefs.current.get(id),
      };

      let position;
      if (isVertical) {
        position = calculateVerticalEntryPosition(
          mouseY,
          navRect,
          buttonRefsMap,
          items,
        );
      } else {
        position = calculateHorizontalEntryPosition(
          mouseX,
          navRect,
          buttonRefsMap,
          items,
        );
      }

      indicator.style.left = `${position.left}px`;
      indicator.style.top = `${position.top}px`;
      indicator.style.width = `${position.width}px`;
      indicator.style.height = `${position.height}px`;
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

      const buttonRefsMap = {
        get: (id: string) => buttonRefs.current.get(id),
      };

      let position;
      if (isVertical) {
        if (mouseY < 0 || mouseY > navRect.height) {
          hideIndicator();
          isAnimatingRef.current = false;
          return;
        }
        position = calculateVerticalIndicatorPosition(
          mouseY,
          navRect,
          buttonRefsMap,
          items,
        );
        targetPositionRef.current = { x: position.left, y: position.top };
      } else {
        position = calculateHorizontalIndicatorPosition(
          mouseX,
          navRect,
          buttonRefsMap,
          items,
        );
        targetPositionRef.current = { x: position.left, y: position.top };
      }

      indicator.style.width = `${position.width}px`;
      indicator.style.height = `${position.height}px`;
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
