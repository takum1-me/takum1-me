import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import HeaderHoverIndicator from "../../shared/hoverindicator/HeaderHoverIndicator";
import SnsLinks from "../../shared/sns-links/SnsLinks";
import "./header.css";

const HOVER_THRESHOLD = 120;

export default function Header() {
  const [visible, setVisible] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastYRef = useRef<number>(0);
  const hoverRef = useRef<boolean>(false);
  const headerWrapRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerLinesRef = useRef<HTMLSpanElement[]>([]);
  const mobileMenuTlRef = useRef<gsap.core.Timeline | null>(null);

  const navItems = [
    { id: "about", label: "About", href: "/about" },
    { id: "blog", label: "Blog", href: "/blog" },
    { id: "works", label: "Works", href: "/works" },
  ];

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    const goingUp = y < lastYRef.current;

    // 常にトップ固定
    setIsAtTop(true);

    // 上スクロール時またはホバー時のみ表示
    const shouldShow = goingUp || hoverRef.current;
    setVisible(shouldShow);
    lastYRef.current = y;
  }, []);

  // ヘッダーの表示/非表示アニメーション
  useEffect(() => {
    if (headerWrapRef.current) {
      gsap.to(headerWrapRef.current, {
        opacity: visible ? 1 : 0,
        duration: 0.4,
        ease: "power2.out",
      });
    }
  }, [visible]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const nearTop = e.clientY <= HOVER_THRESHOLD;
    hoverRef.current = nearTop;

    if (nearTop) {
      setVisible(true);
    } else {
      const y = window.scrollY;
      const goingUp = y < lastYRef.current;
      setVisible(goingUp);
    }
  }, []);

  const handleItemClick = useCallback((id: string) => {
    setIsMobileMenuOpen(false); // モバイルメニューを閉じる
    // スクロール制御を解除
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.classList.remove("mobile-menu-open"); // グレーアウトを解除
    window.location.href = `/${id}`;
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      const newState = !prev;

      // GSAPアニメーション
      if (mobileMenuTlRef.current) {
        mobileMenuTlRef.current.kill();
      }

      if (newState) {
        // 開くアニメーション
        if (mobileMenuRef.current && hamburgerLinesRef.current.length === 3) {
          mobileMenuTlRef.current = gsap.timeline();
          mobileMenuTlRef.current
            .to(mobileMenuRef.current, {
              right: 0,
              opacity: 1,
              duration: 0.3,
              ease: "power2.out",
            })
            .to(
              hamburgerLinesRef.current[0],
              {
                rotation: 45,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            )
            .to(
              hamburgerLinesRef.current[1],
              {
                opacity: 0,
                x: 20,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            )
            .to(
              hamburgerLinesRef.current[2],
              {
                rotation: -45,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            );
        }
        // サイドバー開時にページスクロールを無効化とグレーアウト
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.classList.add("mobile-menu-open");
      } else {
        // 閉じるアニメーション
        if (mobileMenuRef.current && hamburgerLinesRef.current.length === 3) {
          mobileMenuTlRef.current = gsap.timeline();
          mobileMenuTlRef.current
            .to(
              hamburgerLinesRef.current[0],
              {
                rotation: 0,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            )
            .to(
              hamburgerLinesRef.current[1],
              {
                opacity: 1,
                x: 0,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            )
            .to(
              hamburgerLinesRef.current[2],
              {
                rotation: 0,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            )
            .to(
              mobileMenuRef.current,
              {
                right: "-100%",
                opacity: 0,
                duration: 0.3,
                ease: "power2.out",
              },
              0,
            );
        }
        // スクロール制御を解除
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
        document.body.classList.remove("mobile-menu-open");
      }
      return newState;
    });
  }, []);

  useEffect(() => {
    lastYRef.current = window.scrollY;
    setIsAtTop(true); // 常にトップ固定
    setVisible(true); // 初期表示

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      // コンポーネントアンマウント時にスクロールを元に戻す
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.classList.remove("mobile-menu-open");
    };
  }, [handleScroll, handleMouseMove]);

  return React.createElement(
    "div",
    {
      ref: headerWrapRef,
      className: `header-wrap${isAtTop ? " at-top" : ""}`,
      role: "banner",
    },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "nav" },
        React.createElement(
          "div",
          { className: "brand" },
          React.createElement("a", { href: "/" }, "takum1.me"),
        ),
        React.createElement(
          "button",
          {
            className: "hamburger-menu",
            onClick: toggleMobileMenu,
            "aria-label": "メニューを開く",
            "aria-expanded": isMobileMenuOpen,
          },
          React.createElement("span", {
            ref: (el) => {
              if (el) hamburgerLinesRef.current[0] = el;
            },
            className: "hamburger-line hamburger-line--first",
          }),
          React.createElement("span", {
            ref: (el) => {
              if (el) hamburgerLinesRef.current[1] = el;
            },
            className: "hamburger-line hamburger-line--second",
          }),
          React.createElement("span", {
            ref: (el) => {
              if (el) hamburgerLinesRef.current[2] = el;
            },
            className: "hamburger-line hamburger-line--third",
          }),
        ),
        React.createElement(
          "div",
          {
            ref: mobileMenuRef,
            className: "mobile-menu",
            style: {
              right: "-100%",
              opacity: 0,
            },
          },
          React.createElement(
            "button",
            {
              className: "mobile-menu-close",
              onClick: toggleMobileMenu,
              "aria-label": "メニューを閉じる",
            },
            React.createElement("span", { className: "close-icon" }, "×"),
          ),
          React.createElement(
            "div",
            { className: "mobile-nav-container" },
            React.createElement(HeaderHoverIndicator, {
              items: navItems,
              onItemClick: handleItemClick,
              className: "mobile-header-links vertical",
            }),
          ),
          React.createElement(
            "div",
            { className: "mobile-sns-section" },
            React.createElement(SnsLinks, {
              className: "mobile-sns-links",
            }),
          ),
        ),
        React.createElement(HeaderHoverIndicator, {
          items: navItems,
          onItemClick: handleItemClick,
          className: "header-links",
        }),
      ),
    ),
    React.createElement(
      "style",
      null,
      `.container{max-width:var(--max-width);margin:0 auto;padding:0 var(--gap);}`,
    ),
  );
}
