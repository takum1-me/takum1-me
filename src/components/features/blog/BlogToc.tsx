import React, { useEffect, useState, useRef, useCallback } from "react";
import { gsap } from "gsap";
import "./blog-toc.css";

interface TocItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

const SCROLL_TRIGGER = 200;

export default function BlogToc() {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isTocVisible, setIsTocVisible] = useState<boolean>(false);
  const tocRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const isTocVisibleRef = useRef<boolean>(false);
  const tocItemsRef = useRef<TocItem[]>([]);

  // TOC項目の生成
  const generateTocItems = useCallback(() => {
    const headings = document.querySelectorAll(
      ".article-content h1, .article-content h2",
    );
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

    tocItemsRef.current = items; // refにも保存
    setTocItems(items);
  }, []);

  // アクティブリンクの更新
  const updateActiveLinks = useCallback(
    (items: TocItem[], activeHeading: TocItem) => {
      // まず全てのアクティブ状態をクリア
      const tocLinks = document.querySelectorAll(".toc a");
      tocLinks.forEach((link) => {
        link.classList.remove("is-active-link");
      });

      // H2がアクティブな場合、親のH1もアクティブ状態を維持
      if (activeHeading.level === 2) {
        // このH2の親のH1を見つける
        const currentIndex = items.findIndex(
          (item) => item.id === activeHeading.id,
        );
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
          const parentLink = document.querySelector(
            `.toc a[href="#${parentH1.id}"]`,
          );
          if (parentLink) {
            parentLink.classList.add("is-active-link");
          }
        }
      }

      // 現在の見出しをアクティブにする
      const currentLink = document.querySelector(
        `.toc a[href="#${activeHeading.id}"]`,
      );
      if (currentLink) {
        currentLink.classList.add("is-active-link");
      }
    },
    [],
  );

  // アクティブな見出しの更新
  const updateActiveHeading = useCallback(
    (items: TocItem[]) => {
      if (items.length === 0) return; // アイテムが空の場合は早期リターン

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // ページ下部の判定
      if (scrollTop + windowHeight >= documentHeight - 100) {
        const lastH2 = items.filter((item) => item.level === 2).pop();
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

      items.forEach((item) => {
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
    },
    [updateActiveLinks],
  );

  // GSAPアニメーション処理
  const animateToc = useCallback((shouldShow: boolean) => {
    if (!tocRef.current) return;

    // 既存のアニメーションを停止
    if (animationRef.current) {
      animationRef.current.kill();
    }

    if (shouldShow) {
      // 表示アニメーション
      animationRef.current = gsap.timeline();
      animationRef.current
        .set(tocRef.current, {
          y: "calc(100vh + 50vh - 50%)",
          opacity: 0,
          display: "block",
        })
        .to(tocRef.current, {
          y: "-50%",
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
        });
    } else {
      // 非表示アニメーション
      animationRef.current = gsap.timeline();
      animationRef.current.to(tocRef.current, {
        y: "calc(100vh + 50vh - 50%)",
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          if (tocRef.current) {
            tocRef.current.style.display = "none";
          }
        },
      });
    }
  }, []);

  // スクロール処理
  const handleScroll = useCallback(() => {
    if (!tocRef.current) return;

    const scrollY = window.scrollY;

    // refで現在の状態を取得（同期的）
    const currentVisible = isTocVisibleRef.current;

    // 一度表示されたら、上にスクロールしてトリガーポイントを下回った時のみ非表示
    let shouldShow = currentVisible;

    if (!currentVisible && scrollY > SCROLL_TRIGGER) {
      // 初回表示
      shouldShow = true;
    } else if (currentVisible && scrollY <= SCROLL_TRIGGER) {
      // 上にスクロールしてトリガーポイントを下回った時のみ非表示
      shouldShow = false;
    }

    if (shouldShow !== currentVisible) {
      isTocVisibleRef.current = shouldShow; // refを即座に更新
      animateToc(shouldShow);
      setIsTocVisible(shouldShow); // stateも更新（UI表示用）
    }

    updateActiveHeading(tocItemsRef.current);
  }, [updateActiveHeading, animateToc]);

  // TOC項目クリック処理
  const handleClick = useCallback((item: TocItem) => {
    const element = document.getElementById(item.id);
    if (!element) return;

    const header = document.querySelector<HTMLElement>(".header-wrap .nav");
    const offset = header
      ? Math.ceil(header.getBoundingClientRect().height + 20)
      : 100;

    window.scrollTo({
      top: element.offsetTop - offset,
      behavior: "smooth",
    });
  }, []);

  // H2項目の取得
  const getH2Items = useCallback(
    (h1Index: number) => {
      const nextH1Index = tocItems.findIndex(
        (item, index) => index > h1Index && item.level === 1,
      );
      const endIndex = nextH1Index === -1 ? tocItems.length : nextH1Index;

      return tocItems
        .slice(h1Index + 1, endIndex)
        .filter((item) => item.level === 2);
    },
    [tocItems],
  );

  useEffect(() => {
    // DOM要素が完全に読み込まれた後に実行
    const timer = setTimeout(() => {
      generateTocItems();
    }, 100);

    return () => clearTimeout(timer);
  }, []); // 空の依存配列でマウント時に一度だけ実行

  useEffect(() => {
    const throttledScroll = () => {
      requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", throttledScroll);
    };
  }, []); // スクロールイベントリスナーは一度だけ登録

  useEffect(() => {
    return () => {
      // アニメーションのクリーンアップ
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, []);

  // 初期状態を設定するための別のuseEffect
  useEffect(() => {
    if (tocRef.current) {
      gsap.set(tocRef.current, {
        y: "calc(100vh + 50vh - 50%)",
        opacity: 0,
        display: "none",
      });
    }
  }, []);

  if (tocItems.length === 0) return null;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "aside",
      {
        className: "toc",
        ref: tocRef,
        "aria-label": "目次",
      },
      React.createElement(
        "ul",
        { className: "toc-list" },
        tocItems
          .filter((item) => item.level === 1)
          .map((item, _index) =>
            React.createElement(
              "li",
              { key: item.id, className: "toc-h1" },
              React.createElement(
                "a",
                {
                  href: `#${item.id}`,
                  className: activeId === item.id ? "is-active-link" : "",
                  onClick: (e: React.MouseEvent) => {
                    e.preventDefault();
                    handleClick(item);
                  },
                },
                item.text,
              ),
              (() => {
                const h2Items = getH2Items(tocItems.indexOf(item));
                return h2Items.length > 0
                  ? React.createElement(
                      "ul",
                      { className: "toc-h2-list" },
                      h2Items.map((h2Item) =>
                        React.createElement(
                          "li",
                          { key: h2Item.id, className: "toc-h2" },
                          React.createElement(
                            "a",
                            {
                              href: `#${h2Item.id}`,
                              className:
                                activeId === h2Item.id ? "is-active-link" : "",
                              onClick: (e: React.MouseEvent) => {
                                e.preventDefault();
                                handleClick(h2Item);
                              },
                            },
                            h2Item.text,
                          ),
                        ),
                      ),
                    )
                  : null;
              })(),
            ),
          ),
      ),
    ),
  );
}
