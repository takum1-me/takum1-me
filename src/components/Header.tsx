import { useEffect, useRef, useState, useCallback } from "react";
import HoverIndicator from "./HoverIndicator";
import "./header.css";

const HOVER_THRESHOLD = 120;

export default function Header() {
  const [visible, setVisible] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
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
    setIsAtTop(y <= 0);

    const shouldShow = y <= 0 || goingUp || hoverRef.current;
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
      setVisible(y <= 0 || goingUp);
    }
  }, []);

  const handleItemClick = useCallback((id: string) => {
    window.location.href = `/${id}`;
  }, []);

  useEffect(() => {
    lastYRef.current = window.scrollY;
    setIsAtTop(window.scrollY <= 0);
    setVisible(false);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleScroll, handleMouseMove]);

  return (
    <div
      className={`header-wrap${visible ? " show" : " hide"}${isAtTop ? " at-top" : ""}`}
      role="banner"
    >
      <div className="container">
        <div className="nav">
          <div className="brand">
            <a href="/">takum1.me</a>
          </div>
          <HoverIndicator
            items={navItems}
            onItemClick={handleItemClick}
            className="header-links"
            showBackground={false}
          />
        </div>
      </div>
      <style>{`.container{max-width:var(--max-width);margin:0 auto;padding:0 var(--gap);}`}</style>
    </div>
  );
}
