import React, { useEffect, useRef } from 'react';

interface PageTitleProps {
  title: string;
  className?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, className = '' }) => {
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ページの長さとフッターの位置を取得して棒の長さを計算する関数
    const calculateBarHeight = () => {
      if (!titleRef.current) return 0;

      // ページ全体の高さを取得
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );

      // フッターの位置を取得（border-topの位置）
      const footer = document.querySelector('footer');
      let footerBorderTop = documentHeight; // デフォルトはページ全体の高さ
      
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        const scrollY = window.scrollY;
        // フッターの上端（border-topの位置）を取得
        footerBorderTop = footerRect.top + scrollY;
      }

      // ヘッダーの高さを取得
      const header = document.querySelector('.header-wrap');
      let headerHeight = 0;
      if (header) {
        const headerRect = header.getBoundingClientRect();
        headerHeight = headerRect.height;
      }

      // 棒の長さを計算（フッターのborder-topの位置 - ヘッダーの高さ）
      const barHeight = Math.max(0, footerBorderTop - headerHeight);
      
      console.log('Document Height:', documentHeight);
      console.log('Footer Border Top:', footerBorderTop);
      console.log('Header Height:', headerHeight);
      console.log('Calculated Bar Height:', barHeight);

      return barHeight;
    };

    const handleScroll = () => {
      if (titleRef.current) {
        const scrollY = window.scrollY;
        
        // スクロール量に応じて上に上がっていくアニメーション
        const translateY = scrollY; // スクロール分だけ上に移動
        const skewY = 0; // 傾斜をなくして上下反転を防ぐ
        
        // 棒の高さを計算
        const barHeight = calculateBarHeight();
        
        // CSS変数を使用して疑似要素も制御
        titleRef.current.style.setProperty('--scroll-translate-y', `${translateY}px`);
        titleRef.current.style.setProperty('--scroll-skew-y', `${skewY}deg`);
        titleRef.current.style.setProperty('--footer-height', `${barHeight}px`);
        titleRef.current.style.transform = `rotate(180deg) translateY(${translateY}px)`;
      }
    };

    // DOMが完全に読み込まれてから実行
    const initialize = () => {
      // 少し遅延させてすべての要素が確実に存在するようにする
      setTimeout(() => {
        handleScroll();
      }, 200);
    };

    // スクロールイベントリスナーを追加
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // 初期化
    if (document.readyState === 'complete') {
      initialize();
    } else {
      window.addEventListener('load', initialize);
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('load', initialize);
    };
  }, []);

  return (
    <div ref={titleRef} className={`page-title ${className}`}>
      {title}
    </div>
  );
};

export default PageTitle;
