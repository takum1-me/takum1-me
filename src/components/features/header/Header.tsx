import { useCallback, useEffect, useState } from "react";
import { NAV_ITEMS, SNS_LINKS } from "../../../data/site-links";
import SnsIcon from "../../shared/sns-links/SnsIcon";
import "./header.css";

/**
 * 罫線グリッドのヘッダー（A-1）。現在地のナビは墨のベタで示す。
 * スマホではメニューボタンからドロワーを開く。
 */
export default function Header({
  currentPath = "",
}: {
  /** サーバー側で分かっている現在の URL。最初の描画から現在地を塗っておく */
  currentPath?: string;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    setPath(window.location.pathname);
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
      {NAV_ITEMS.map((item) => (
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
    <header className="site-header">
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
          <span aria-hidden="true">{isMenuOpen ? "Close" : "Menu"}</span>
          <span
            className={`toggle-icon${isMenuOpen ? " is-open" : ""}`}
            aria-hidden="true"
          >
            +
          </span>
        </button>
      </div>

      <div
        className={`site-header__drawer${isMenuOpen ? " is-open" : ""}`}
        inert={!isMenuOpen}
      >
        {renderLinks("site-header__drawer-nav")}
        <div className="site-header__drawer-sns">
          {SNS_LINKS.map((sns) => (
            <a
              key={sns.href}
              href={sns.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={sns.name}
            >
              <SnsIcon variant={sns.variant} size={20} />
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
