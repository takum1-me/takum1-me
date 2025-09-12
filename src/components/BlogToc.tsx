import { useEffect, useState, useRef } from "react";
import "./blog-toc.css";

interface TocItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

export default function BlogToc() {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const tocRef = useRef<HTMLDivElement>(null);
  const lastClickTime = useRef<number>(0);

  useEffect(() => {
    // H1とH2タグを抽出してToCを生成
    const headings = document.querySelectorAll('.article-content h1, .article-content h2');
    const items: TocItem[] = [];

    headings.forEach((heading, index) => {
      const element = heading as HTMLElement;
      const id = element.id || `heading-${index}`;
      
      // IDが設定されていない場合は設定
      if (!element.id) {
        element.id = id;
      }

      items.push({
        id,
        text: element.textContent || '',
        level: parseInt(element.tagName.substring(1)),
        element
      });
    });

    setTocItems(items);

    // スクロールイベントでアクティブな見出しを追跡
    let ticking = false;
    let lastScrollTop = 0;
    let scrollDirection = 'down';

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;
          
          // スクロール方向の判定にヒステリシスを追加
          const scrollDiff = scrollTop - lastScrollTop;
          if (Math.abs(scrollDiff) > 5) {
            scrollDirection = scrollDiff > 0 ? 'down' : 'up';
          }
          lastScrollTop = scrollTop;

          // ページ下部の判定
          const threshold = 100;
          if (scrollTop + windowHeight >= documentHeight - threshold) {
            // 最後のH2をアクティブにする
            const lastH2 = items.filter(item => item.level === 2).pop();
            if (lastH2) {
              setActiveId(lastH2.id);
            }
          } else {
            // スクロール方向に応じた判定
            let activeHeading = null;
            
            if (scrollDirection === 'down') {
              // 下にスクロール：下30%より上で下30%に一番近い見出し
              const bottom30Percent = scrollTop + windowHeight * 0.7;
              let closestHeading = null;
              let minDistance = Infinity;
              
              items.forEach(item => {
                const rect = item.element.getBoundingClientRect();
                const headingTop = scrollTop + rect.top;
                
                if (headingTop <= bottom30Percent) {
                  const distance = Math.abs(headingTop - bottom30Percent);
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestHeading = item;
                  }
                }
              });
              
              activeHeading = closestHeading;
            } else {
              // 上にスクロール：上30%より下で上30%に一番近い見出し
              const top30Percent = scrollTop + windowHeight * 0.3;
              let closestHeading = null;
              let minDistance = Infinity;
              
              items.forEach(item => {
                const rect = item.element.getBoundingClientRect();
                const headingTop = scrollTop + rect.top;
                
                if (headingTop >= top30Percent) {
                  const distance = Math.abs(headingTop - top30Percent);
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestHeading = item;
                  }
                }
              });
              
              activeHeading = closestHeading;
            }
            
            if (activeHeading) {
              // まず全てのアクティブ状態をクリア
              const tocLinks = document.querySelectorAll('.toc a');
              tocLinks.forEach(link => {
                link.classList.remove('is-active-link');
              });
              
              // H2がアクティブな場合、親のH1もアクティブ状態を維持
              if (activeHeading.level === 2) {
                // このH2の親のH1を見つける
                const currentIndex = items.findIndex(item => item.id === activeHeading.id);
                let parentH1 = null;
                
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
                    parentLink.classList.add('is-active-link');
                  }
                }
              }
              
              // 現在の見出しをアクティブにする
              const currentLink = document.querySelector(`.toc a[href="#${activeHeading.id}"]`);
              if (currentLink) {
                currentLink.classList.add('is-active-link');
              }
              setActiveId(activeHeading.id);
            }
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初期化時に一度実行
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClick = (item: TocItem) => {
    lastClickTime.current = Date.now();
    
    const element = document.getElementById(item.id);
    if (element) {
      const header = document.querySelector<HTMLElement>(".header-wrap .nav");
      const offset = header ? Math.ceil(header.getBoundingClientRect().height + 20) : 90;
      
      const targetPosition = element.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  if (tocItems.length === 0) {
    return null;
  }

  // H1とH2を階層構造に整理
  const renderTocItems = () => {
    const result: JSX.Element[] = [];
    let currentH1Index = -1;

    tocItems.forEach((item, index) => {
      if (item.level === 1) {
        // H1の場合
        currentH1Index = index;
        result.push(
          <li key={item.id} className="toc-h1">
            <a
              href={`#${item.id}`}
              className={activeId === item.id ? 'is-active-link' : ''}
              onClick={(e) => {
                e.preventDefault();
                handleClick(item);
              }}
            >
              {item.text}
            </a>
            {/* このH1の下にあるH2を取得（次のH1まで） */}
            {(() => {
              const h2Items: TocItem[] = [];
              
              // 次のH1のインデックスを見つける
              let nextH1Index = tocItems.findIndex((nextItem, nextIndex) => 
                nextIndex > index && nextItem.level === 1
              );
              
              // 次のH1が見つからない場合は最後まで
              if (nextH1Index === -1) {
                nextH1Index = tocItems.length;
              }
              
              // 現在のH1と次のH1の間のH2を取得
              for (let i = index + 1; i < nextH1Index; i++) {
                if (tocItems[i].level === 2) {
                  h2Items.push(tocItems[i]);
                }
              }

              if (h2Items.length > 0) {
                return (
                  <ul className="toc-h2-list">
                    {h2Items.map((h2Item) => (
                      <li key={h2Item.id} className="toc-h2">
                        <a
                          href={`#${h2Item.id}`}
                          className={activeId === h2Item.id ? 'is-active-link' : ''}
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
                );
              }
              return null;
            })()}
          </li>
        );
      }
    });

    return result;
  };

  return (
    <aside className="toc" ref={tocRef} aria-label="目次">
      <ul className="toc-list">
        {renderTocItems()}
      </ul>
    </aside>
  );
}
