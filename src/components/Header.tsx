import { useEffect, useRef, useState } from "react";
import HoverIndicator from "./HoverIndicator";
import "./header.css";

export default function Header() {
  const [visible, setVisible] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastYRef = useRef<number>(0);
  const hoverRef = useRef<boolean>(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    lastYRef.current = window.scrollY;
    setIsAtTop(window.scrollY <= 0);
    setVisible(window.scrollY <= 0);

    const onScroll = () => {
      const y = window.scrollY;
      const goingUp = y < lastYRef.current;
      setIsAtTop(y <= 0);
      lastYRef.current = y;

      // 表示条件: ページ最上部 or 上方向スクロール or ヘッダー付近でのホバー
      if (y <= 0 || goingUp || hoverRef.current) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // 画面上部 96px 以内にカーソルがある場合は hover とみなす
      const nearTop = e.clientY <= 96;
      hoverRef.current = nearTop;
      setVisible(nearTop || window.scrollY <= 0);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      className={`header-wrap${visible ? " show" : " hide"}${isAtTop ? " at-top" : ""}`}
      role="banner"
    >
      <div className="container">
        <div className="nav" ref={navRef}>
          <div className="brand">
            <a href="/">takum1.me</a>
          </div>
          <HoverIndicator
            items={[
              { id: "about", label: "About", href: "/about" },
              { id: "blog", label: "Blog", href: "/blog" },
              { id: "works", label: "Works", href: "/works" },
            ]}
            onItemClick={(id) => {
              const href = `/${id}`;
              window.location.href = href;
            }}
            className="header-links"
            showBackground={false}
          />
        </div>
      </div>
      <style>{`.container{max-width:var(--max-width);margin:0 auto;padding:0 var(--gap);}`}</style>
    </div>
  );
}
