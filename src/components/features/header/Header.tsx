import { useCallback, useEffect, useState } from "react";
import SnsLinks from "../../shared/sns-links/SnsLinks";
import "./header.css";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Works", href: "/works" },
  { label: "Lab", href: "/lab" },
  { label: "Beans", href: "/beans" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    setPath(window.location.pathname);

    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // メニューを開いている間だけ背面のスクロールを止める
  useEffect(() => {
    document.body.classList.toggle("has-menu-open", isMenuOpen);
    return () => document.body.classList.remove("has-menu-open");
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  const isCurrent = useCallback(
    (href: string) => path === href || path.startsWith(`${href}/`),
    [path],
  );

  const renderLinks = (className: string) => (
    <nav className={className} aria-label="サイトナビゲーション">
      {navItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="header-link"
          aria-current={isCurrent(item.href) ? "page" : undefined}
          onClick={() => setIsMenuOpen(false)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );

  return (
    <header className={`site-header${isScrolled ? " is-scrolled" : ""}`}>
      <div className="site-header__inner">
        <a className="site-header__brand" href="/">
          takum1.me
        </a>

        {renderLinks("site-header__nav")}

        <button
          type="button"
          className="site-header__toggle"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={isMenuOpen}
        >
          <span className={`toggle-icon${isMenuOpen ? " is-open" : ""}`}>
            <span className="toggle-icon__bar toggle-icon__bar--top" />
            <span className="toggle-icon__bar toggle-icon__bar--bottom" />
          </span>
        </button>
      </div>

      <div
        className={`site-header__scrim${isMenuOpen ? " is-open" : ""}`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      <div
        className={`site-header__drawer${isMenuOpen ? " is-open" : ""}`}
        inert={!isMenuOpen}
      >
        {renderLinks("site-header__drawer-nav")}
        <SnsLinks className="site-header__drawer-sns" />
      </div>
    </header>
  );
}
