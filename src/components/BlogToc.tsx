import { useEffect, useState, useRef, useCallback } from "react";
import "./blog-toc.css";

interface TocItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

const SCROLL_TRIGGER = 200;
const ANIMATION_DELAY = 800;

export default function BlogToc() {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isTocVisible, setIsTocVisible] = useState<boolean>(false);
  const tocRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // TOC項目の生成
  const generateTocItems = useCallback(() => {
    const headings = document.querySelectorAll(".article-content h1, .article-content h2");
    const items: TocItem[] = [];

    headings.forEach((heading, index) => {
      const element = heading as HTMLElement;
      const id = element.id || `heading-${index}`;

      if (!element.id) {
        element.id = id;
      }

      items.push({
        id,
        text: element.textContent || "",
        level: parseInt(element.tagName.substring(1)),
        element,
      });
    });

    setTocItems(items);
  }, []);

  // アクティブリンクの更新
  const updateActiveLinks = useCallback((items: TocItem[], activeHeading: TocItem) => {
    // まず全てのアクティブ状態をクリア
    const tocLinks = document.querySelectorAll(".toc a");
    tocLinks.forEach((link) => {
      link.classList.remove("is-active-link");
    });

    // H2がアクティブな場合、親のH1もアクティブ状態を維持
    if (activeHeading.level === 2) {
      // このH2の親のH1を見つける
      const currentIndex = items.findIndex(item => item.id === activeHeading.id);
      let parentH1: TocItem | null = null;

      // 現在のH2より前のH1を探す
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (items[i].level === 1) {
          parentH1 = items[i];
          break;
        }
      }

      // 親のH1をアクティブにする
      if (parentH1) {
        const parentLink = document.querySelector(`.toc a[href="#${parentH1.id}"]`);
        if (parentLink) {
          parentLink.classList.add("is-active-link");
        }
      }
    }

    // 現在の見出しをアクティブにする
    const currentLink = document.querySelector(`.toc a[href="#${activeHeading.id}"]`);
    if (currentLink) {
      currentLink.classList.add("is-active-link");
    }
  }, []);

  // アクティブな見出しの更新
  const updateActiveHeading = useCallback((items: TocItem[]) => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // ページ下部の判定
    if (scrollTop + windowHeight >= documentHeight - 100) {
      const lastH2 = items.filter(item => item.level === 2).pop();
      if (lastH2) {
        setActiveId(lastH2.id);
        // H2がアクティブな場合、親のH1もアクティブ状態を維持
        updateActiveLinks(items, lastH2);
      }
      return;
    }

    // スクロール方向に応じた判定
    let activeHeading: TocItem | null = null;
    const viewportCenter = scrollTop + windowHeight * 0.5;
    let minDistance = Infinity;

    items.forEach(item => {
      const rect = item.element.getBoundingClientRect();
      const headingTop = scrollTop + rect.top;
      const distance = Math.abs(headingTop - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        activeHeading = item;
      }
    });

    if (activeHeading) {
      setActiveId((activeHeading as TocItem).id);
      updateActiveLinks(items, activeHeading as TocItem);
    }
  }, [updateActiveLinks]);

  // スクロール処理
  const handleScroll = useCallback(() => {
    if (!tocRef.current) return;

    const scrollY = window.scrollY;
    const shouldShow = scrollY > SCROLL_TRIGGER;

    if (shouldShow !== isTocVisible) {
      tocRef.current.classList.toggle('animate-in', shouldShow);
      tocRef.current.classList.toggle('animate-out', !shouldShow);
      setIsTocVisible(shouldShow);

      if (buttonRef.current) {
        buttonRef.current.classList.toggle('animate-in', !shouldShow);
        buttonRef.current.classList.toggle('animate-out', shouldShow);
      }
    }

    updateActiveHeading(tocItems);
  }, [isTocVisible, tocItems, updateActiveHeading]);

  // TOC項目クリック処理
  const handleClick = useCallback((item: TocItem) => {
    const element = document.getElementById(item.id);
    if (!element) return;

    const header = document.querySelector<HTMLElement>(".header-wrap .nav");
    const offset = header ? Math.ceil(header.getBoundingClientRect().height + 20) : 100;

    window.scrollTo({
      top: element.offsetTop - offset,
      behavior: "smooth",
    });
  }, []);

  // TOC切り替え処理
  const handleToggleClick = useCallback(() => {
    if (!tocRef.current || !buttonRef.current) return;

    if (isTocVisible) {
      tocRef.current.classList.remove('animate-in');
      tocRef.current.classList.add('animate-out');
      setIsTocVisible(false);
      
      setTimeout(() => {
        buttonRef.current?.classList.remove('animate-out');
        buttonRef.current?.classList.add('animate-in');
      }, ANIMATION_DELAY);
    } else {
      buttonRef.current.classList.remove('animate-in');
      buttonRef.current.classList.add('animate-out');
      
      setTimeout(() => {
        tocRef.current?.classList.remove('animate-out');
        tocRef.current?.classList.add('animate-in');
        setIsTocVisible(true);
      }, 400);
    }
  }, [isTocVisible]);

  // H2項目の取得
  const getH2Items = useCallback((h1Index: number) => {
    const nextH1Index = tocItems.findIndex(
      (item, index) => index > h1Index && item.level === 1
    );
    const endIndex = nextH1Index === -1 ? tocItems.length : nextH1Index;
    
    return tocItems.slice(h1Index + 1, endIndex).filter(item => item.level === 2);
  }, [tocItems]);

  useEffect(() => {
    generateTocItems();
    
    const throttledScroll = () => {
      requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [generateTocItems, handleScroll]);

  if (tocItems.length === 0) return null;

  return (
    <>
      <aside className="toc" ref={tocRef} aria-label="目次">
        <ul className="toc-list">
          {tocItems
            .filter(item => item.level === 1)
            .map((item, index) => (
              <li key={item.id} className="toc-h1">
                <a
                  href={`#${item.id}`}
                  className={activeId === item.id ? "is-active-link" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    handleClick(item);
                  }}
                >
                  {item.text}
                </a>
                {(() => {
                  const h2Items = getH2Items(tocItems.indexOf(item));
                  return h2Items.length > 0 ? (
                    <ul className="toc-h2-list">
                      {h2Items.map((h2Item) => (
                        <li key={h2Item.id} className="toc-h2">
                          <a
                            href={`#${h2Item.id}`}
                            className={activeId === h2Item.id ? "is-active-link" : ""}
                            onClick={(e) => {
                              e.preventDefault();
                              handleClick(h2Item);
                            }}
                          >
                            {h2Item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </li>
            ))}
        </ul>
      </aside>
      
      <button 
        ref={buttonRef}
        className="toc-toggle-button"
        onClick={handleToggleClick}
        aria-label="目次を表示"
      >
        TOC
      </button>
    </>
  );
}
