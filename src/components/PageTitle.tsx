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
      if (!titleRef.current) return 100; // フォールバック値

      try {
        // ページ全体の高さを取得（より堅牢な方法）
        const documentHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight,
          window.innerHeight
        );

        // フッターの位置を取得（border-topの位置）
        const footer = document.querySelector('footer');
        let footerBorderTop = documentHeight; // デフォルトはページ全体の高さ
        
        if (footer && footer.getBoundingClientRect) {
          const footerRect = footer.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset;
          // フッターの上端（border-topの位置）を取得
          footerBorderTop = Math.max(0, footerRect.top + scrollY);
        }

        // ヘッダーの高さを取得
        const header = document.querySelector('.header-wrap');
        let headerHeight = 0;
        if (header && header.getBoundingClientRect) {
          const headerRect = header.getBoundingClientRect();
          headerHeight = Math.max(0, headerRect.height);
        }

        // 棒の長さを計算（フッターのborder-topの位置 - ヘッダーの高さ）
        const barHeight = Math.max(100, footerBorderTop - headerHeight);
        
        // デバッグログ（開発時のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('Document Height:', documentHeight);
          console.log('Footer Border Top:', footerBorderTop);
          console.log('Header Height:', headerHeight);
          console.log('Calculated Bar Height:', barHeight);
        }

        return barHeight;
      } catch (error) {
        // エラーが発生した場合はフォールバック値を使用
        console.warn('PageTitle calculation error:', error);
        return 100;
      }
    };

    const handleScroll = () => {
      if (!titleRef.current) return;

      try {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        
        // スクロール量に応じて上に上がっていくアニメーション
        const translateY = scrollY; // スクロール分だけ上に移動
        const skewY = 0; // 傾斜をなくして上下反転を防ぐ
        
        // 棒の高さを計算
        const barHeight = calculateBarHeight();
        
        // CSS変数を使用して疑似要素も制御（より安全な設定）
        const element = titleRef.current;
        element.style.setProperty('--scroll-translate-y', `${translateY}px`);
        element.style.setProperty('--scroll-skew-y', `${skewY}deg`);
        element.style.setProperty('--footer-height', `${barHeight}px`);
        element.style.transform = `rotate(180deg) translateY(${translateY}px)`;
      } catch (error) {
        console.warn('PageTitle scroll handler error:', error);
      }
    };

    // DOMが完全に読み込まれてから実行
    const initialize = () => {
      // 複数回の遅延で確実に初期化
      const delayedInit = () => {
        setTimeout(() => {
          handleScroll();
        }, 100);
      };
      
      // 即座に実行
      handleScroll();
      // 少し遅延して実行
      delayedInit();
      // さらに遅延して実行（ビルド後の環境に対応）
      setTimeout(delayedInit, 300);
    };

    // イベントリスナーを追加（より安全な方法）
    const addEventListeners = () => {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
    };

    const removeEventListeners = () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };

    // イベントリスナーを追加
    addEventListeners();
    
    // 初期化（複数のタイミングで実行）
    if (document.readyState === 'complete') {
      initialize();
    } else {
      window.addEventListener('load', initialize);
      // DOMContentLoadedでも実行
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
      }
    }

    // クリーンアップ
    return () => {
      removeEventListeners();
      window.removeEventListener('load', initialize);
      document.removeEventListener('DOMContentLoaded', initialize);
    };
  }, []);

  return (
    <div ref={titleRef} className={`page-title ${className}`}>
      {title}
    </div>
  );
};

export default PageTitle;
