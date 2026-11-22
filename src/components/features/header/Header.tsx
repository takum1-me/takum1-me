import { useCallback, useEffect, useState } from "react";
import { NAV_ITEMS, SNS_LINKS } from "../../../data/site-links";
import SnsIcon from "../../shared/sns-links/SnsIcon";
import "./header.css";

type Theme = "light" | "dark";

/** Layout の head で決めた配色を読む。サーバー描画では分からないので null */
const readTheme = (): Theme | null => {
  if (typeof document === "undefined") return null;
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

/** ライトとダークを切り替えるボタン。選んだ方は次に来たときも使う */
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
    // OS の設定が変わって head のスクリプトが塗り替えたときにも追従する
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // 保存できなくても、このページでは切り替わっていればよい
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="site-header__theme"
      onClick={toggle}
      aria-label={isDark ? "ライトモードにする" : "ダークモードにする"}
      title={isDark ? "ライトモードにする" : "ダークモードにする"}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* サーバー描画ではどちらか分からないので、読めるまで何も描かない */}
        {theme === null ? null : isDark ? (
          // ダーク中は「ライトへ」を示す太陽
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          // ライト中は「ダークへ」を示す月
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
  );
}

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

        <div className="site-header__actions">
          <ThemeToggle />

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
