import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

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
  const textRef = useRef<HTMLSpanElement>(null);

  // GSAPテキストタイピングアニメーション
  useEffect(() => {
    if (!textRef.current || !title) return;

    // テキストを文字ごとに分割してspanで囲む
    const chars = title.split('').map((char, index) => 
      `<span class="char" style="opacity: 0; transform: translateY(20px);">${char}</span>`
    ).join('');
    
    textRef.current.innerHTML = chars;

    // GSAPアニメーション
    const tl = gsap.timeline({ delay: 0.2 });
    
    // 各文字を順番に表示し、カーソルを移動
    title.split('').forEach((char, index) => {
      // 文字を表示
      tl.to(`.char:nth-child(${index + 1})`, {
        opacity: 1,
        y: 0,
        duration: 0.2,
        ease: "power2.out"
      })
      // カーソルを現在の文字の後ろに追加
      .call(() => {
        // 既存のカーソルを削除
        const existingCursor = textRef.current?.querySelector('.typing-cursor');
        if (existingCursor) {
          existingCursor.remove();
        }
        
        // 新しいカーソルを現在の文字の後ろに追加
        const currentChar = textRef.current?.querySelector(`.char:nth-child(${index + 1})`);
        if (currentChar) {
          const cursor = document.createElement('span');
          cursor.className = 'typing-cursor';
          cursor.style.opacity = '1';
          cursor.textContent = '|';
          currentChar.parentNode?.insertBefore(cursor, currentChar.nextSibling);
          
          // カーソルの点滅アニメーション
          gsap.to(cursor, {
            opacity: 0,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
            ease: "power2.inOut"
          });
        }
      }, null, "-=0.1");
    });
    
    // タイピング完了後にカーソルを非表示
    tl.call(() => {
      const cursor = textRef.current?.querySelector('.typing-cursor');
      if (cursor) {
        gsap.killTweensOf(cursor);
        gsap.set(cursor, { opacity: 0 });
      }
    });

    return () => {
      tl.kill();
      // 全てのカーソルアニメーションを停止
      const cursors = textRef.current?.querySelectorAll('.typing-cursor');
      cursors?.forEach(cursor => gsap.killTweensOf(cursor));
    };
  }, [title]);

  useEffect(() => {
    // モバイルサイズ（768px以下）ではスクロールアニメーションを無効化
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return; // モバイルではスクロールアニメーションを実行しない
    }

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
        // エラーハンドリング
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
            // エラーハンドリング
          }
        }, delay);
      };

      // 即座に実行
      try {
        handleScroll();
      } catch (error) {
        // エラーハンドリング
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
      window.addEventListener("resize", () => {
        // リサイズ時にモバイル判定を更新
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          // モバイルになったらスクロールアニメーションを停止
          if (titleRef.current) {
            titleRef.current.style.transform = 'rotate(180deg)';
          }
        } else {
          // デスクトップになったらスクロールアニメーションを再開
          handleScroll();
        }
      }, { passive: true });
      // 画面サイズ変更時の追加イベント
      window.addEventListener("orientationchange", () => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          if (titleRef.current) {
            titleRef.current.style.transform = 'rotate(180deg)';
          }
        } else {
          handleScroll();
        }
      }, {
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

  return React.createElement(
    'div',
    {
      ref: titleRef,
      className: `page-title ${className}`
    },
    React.createElement('span', { ref: textRef })
  );
};

export default PageTitle;
