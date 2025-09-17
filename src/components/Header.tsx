import React, { useEffect, useRef, useState, useCallback } from "react";
import HoverIndicator from "./HoverIndicator";
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
    window.location.href = `/${id}`;
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
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
    };
  }, [handleScroll, handleMouseMove]);

  return React.createElement(
    'div',
    {
      className: `header-wrap${visible ? " show" : " hide"}${isAtTop ? " at-top" : ""}`,
      role: "banner"
    },
    React.createElement(
      'div',
      { className: "container" },
      React.createElement(
        'div',
        { className: "nav" },
        React.createElement(
          'div',
          { className: "brand" },
          React.createElement('a', { href: "/" }, "takum1.me")
        ),
        React.createElement(
          'button',
          {
            className: `hamburger-menu${isMobileMenuOpen ? " active" : ""}`,
            onClick: toggleMobileMenu,
            'aria-label': "メニューを開く",
            'aria-expanded': isMobileMenuOpen
          },
          React.createElement('span', { className: "hamburger-line" }),
          React.createElement('span', { className: "hamburger-line" }),
          React.createElement('span', { className: "hamburger-line" })
        ),
        React.createElement(
          'div',
          { className: `mobile-menu${isMobileMenuOpen ? " open" : ""}` },
          React.createElement(HoverIndicator, {
            items: navItems,
            onItemClick: handleItemClick,
            className: "mobile-header-links vertical",
            showBackground: false
          })
        ),
        React.createElement(HoverIndicator, {
          items: navItems,
          onItemClick: handleItemClick,
          className: "header-links",
          showBackground: false
        })
      )
    ),
    React.createElement('style', null, `.container{max-width:var(--max-width);margin:0 auto;padding:0 var(--gap);}`)
  );
}
