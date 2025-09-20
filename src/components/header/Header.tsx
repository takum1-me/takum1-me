import React, { useEffect, useRef, useState, useCallback } from "react";
import HeaderHoverIndicator from "../hoverindicator/HeaderHoverIndicator";
import FooterSnsLinks from "../footer/FooterSnsLinks";
import "./header.css";

const HOVER_THRESHOLD = 120;

export default function Header() {
  const [visible, setVisible] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastYRef = useRef<number>(0);
  const hoverRef = useRef<boolean>(false);

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
      // サイドバー開時にページスクロールを無効化とグレーアウト
      if (newState) {
        // より確実なスクロール制御
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.classList.add("mobile-menu-open");
      } else {
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
      className: `header-wrap${visible ? " show" : " hide"}${isAtTop ? " at-top" : ""}`,
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
            className: `hamburger-menu${isMobileMenuOpen ? " active" : ""}`,
            onClick: toggleMobileMenu,
            "aria-label": "メニューを開く",
            "aria-expanded": isMobileMenuOpen,
          },
          React.createElement("span", { className: "hamburger-line" }),
          React.createElement("span", { className: "hamburger-line" }),
          React.createElement("span", { className: "hamburger-line" }),
        ),
        React.createElement(
          "div",
          { className: `mobile-menu${isMobileMenuOpen ? " open" : ""}` },
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
            React.createElement(FooterSnsLinks, {
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
