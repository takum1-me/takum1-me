import React, { useEffect, useRef } from "react";

interface PageTitleProps {
  title: string;
  className?: string;
  pageType?: "blog" | "about" | "default";
}

const PageTitle: React.FC<PageTitleProps> = ({
  title,
  className = "",
  pageType = "default",
}) => {
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // main-contentの下端に合わせて棒の高さを計算
    const calculateBarHeight = () => {
      if (!titleRef.current) return 100; // フォールバック値

      try {
        // main-content要素を取得
        const mainContent = document.querySelector(".main-content");

        if (mainContent) {
          // main-contentの下端位置を取得
          const mainRect = mainContent.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset || 0;
          const mainBottom = mainRect.bottom + scrollY;

          // デバッグログ（開発時のみ）
          if (process.env.NODE_ENV === "development") {
            console.log("Main Content Bottom:", mainBottom);
            console.log("Calculated Bar Height:", mainBottom);
          }

          return Math.max(100, mainBottom);
        } else {
          // main-contentが見つからない場合はページの高さの93%をフォールバック
          const viewportHeight =
            window.innerHeight || document.documentElement.clientHeight || 1000;
          const documentHeight = Math.max(
            document.body?.scrollHeight || 0,
            document.body?.offsetHeight || 0,
            document.documentElement?.scrollHeight || 0,
            document.documentElement?.offsetHeight || 0,
            viewportHeight,
          );

          const pageHeight = Math.max(documentHeight, viewportHeight);
          return Math.max(100, pageHeight * 0.93);
        }
      } catch (error) {
        // エラーが発生した場合はフォールバック値を使用
        console.warn("PageTitle calculation error:", error);
        return Math.max(100, window.innerHeight * 0.93); // ビューポートの93%
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

        // CSS変数を使用して疑似要素も制御
        const element = titleRef.current;
        element.style.setProperty("--scroll-translate-y", `${translateY}px`);
        element.style.setProperty("--scroll-skew-y", `${skewY}deg`);
        element.style.setProperty("--footer-height", `${barHeight}px`);
        element.style.setProperty("--page-height-90", `${barHeight}px`);
        element.style.transform = `rotate(180deg) translateY(${translateY}px)`;
      } catch (error) {
        console.warn("PageTitle scroll handler error:", error);
      }
    };

    // DOMが完全に読み込まれてから実行
    const initialize = () => {
      // 複数回の遅延で確実に初期化（ビルド環境対応）
      const delayedInit = (delay: number) => {
        setTimeout(() => {
          try {
            handleScroll();
          } catch (error) {
            console.warn("PageTitle delayed init error:", error);
          }
        }, delay);
      };

      // 即座に実行
      try {
        handleScroll();
      } catch (error) {
        console.warn("PageTitle immediate init error:", error);
      }

      // 複数のタイミングで実行（ビルド環境での遅延対応）
      delayedInit(50);
      delayedInit(100);
      delayedInit(300);
      delayedInit(500);
      delayedInit(1000);
    };

    // イベントリスナーを追加（より安全な方法）
    const addEventListeners = () => {
      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll, { passive: true });
      // 画面サイズ変更時の追加イベント
      window.addEventListener("orientationchange", handleScroll, {
        passive: true,
      });
    };

    const removeEventListeners = () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("orientationchange", handleScroll);
    };

    // イベントリスナーを追加
    addEventListeners();

    // 初期化（複数のタイミングで実行）
    const runInitialize = () => {
      initialize();
    };

    // 即座に実行
    runInitialize();

    // 複数のタイミングで実行
    if (document.readyState === "complete") {
      runInitialize();
    } else {
      window.addEventListener("load", runInitialize);
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", runInitialize);
      }
    }

    // 追加の初期化タイミング
    setTimeout(runInitialize, 50);
    setTimeout(runInitialize, 100);
    setTimeout(runInitialize, 500);

    // クリーンアップ
    return () => {
      removeEventListeners();
      window.removeEventListener("load", runInitialize);
      document.removeEventListener("DOMContentLoaded", runInitialize);
    };
  }, [pageType]);

  return (
    <div ref={titleRef} className={`page-title ${className}`}>
      {title}
    </div>
  );
};

export default PageTitle;
