import React, { useRef, useCallback, useEffect } from "react";
import { gsap } from "gsap";

interface OverlayCardProps {
  title: string;
  subtitle?: string;
  date?: string;
  imageUrl?: string;
  imageAlt?: string;
  onClick?: () => void;
  href?: string;
  isExternal?: boolean;
  className?: string;
  dataCategory?: string;
  githubUrl?: string;
}

// 画像の明度を計算する関数（軽量化版）
const calculateImageBrightness = (imageUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(0.5); // デフォルト値
        return;
      }

      // パフォーマンス改善：画像サイズを縮小して計算
      const maxSize = 100;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // サンプリング：全てのピクセルではなく一部をサンプリング
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const step = Math.max(1, Math.floor(data.length / 4 / 100)); // 100ピクセル程度サンプリング

      let totalBrightness = 0;
      let sampleCount = 0;

      for (let i = 0; i < data.length; i += step * 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 明度を計算（0-1の範囲）
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        totalBrightness += brightness;
        sampleCount++;
      }

      const averageBrightness = totalBrightness / sampleCount;
      resolve(averageBrightness);
    };

    img.onerror = () => {
      resolve(0.5); // エラー時はデフォルト値
    };

    img.src = imageUrl;
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
};

export default function OverlayCard({
  title,
  subtitle,
  date,
  imageUrl,
  imageAlt,
  onClick,
  href,
  isExternal = false,
  className = "",
  dataCategory,
  githubUrl,
}: OverlayCardProps) {
  const [overlayOpacity, setOverlayOpacity] = React.useState(0.8);
  const cardRef = useRef<HTMLElement>(null);
  const thumbnailRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // 初期ロードアニメーション
  useEffect(() => {
    if (cardRef.current && overlayRef.current) {
      // オーバーレイの初期状態を設定
      gsap.set(overlayRef.current, { y: "100%" });

      gsap.fromTo(
        cardRef.current,
        {
          y: 50,
          opacity: 0,
          scale: 0.9,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.7)",
          delay: Math.random() * 0.3, // ランダムな遅延で自然な表示
        },
      );
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!cardRef.current || !overlayRef.current) return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const card = cardRef.current;
    const thumbnail = thumbnailRef.current;
    const overlay = overlayRef.current;

    tlRef.current = gsap.timeline();

    // カードのアニメーション
    tlRef.current.to(card, {
      y: -12,
      scale: 1.02,
      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2)",
      duration: 0.3,
      ease: "power2.out",
    });

    // サムネイルがある場合のみスケールアニメーション
    if (thumbnail) {
      tlRef.current.to(
        thumbnail,
        {
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
    }

    // オーバーレイのアニメーション
    tlRef.current.to(
      overlay,
      {
        y: 0,
        duration: 0.4,
        ease: "power2.out",
      },
      0,
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current || !overlayRef.current) return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const card = cardRef.current;
    const thumbnail = thumbnailRef.current;
    const overlay = overlayRef.current;

    tlRef.current = gsap.timeline();

    // カードのアニメーション
    tlRef.current.to(card, {
      y: 0,
      scale: 1,
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
      duration: 0.4,
      ease: "power2.out",
    });

    // サムネイルがある場合のみスケールアニメーション
    if (thumbnail) {
      tlRef.current.to(
        thumbnail,
        {
          scale: 1,
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      );
    }

    // オーバーレイのアニメーション
    tlRef.current.to(
      overlay,
      {
        y: "100%",
        duration: 0.4,
        ease: "power2.out",
      },
      0,
    );
  }, []);

  useEffect(() => {
    if (imageUrl) {
      // パフォーマンス改善：デバウンス処理を追加
      const timeoutId = setTimeout(() => {
        calculateImageBrightness(imageUrl).then((brightness) => {
          // 明度が低い（暗い）場合は背景を薄く（opacity: 0.8）
          // 明度が高い（明るい）場合は背景を濃く（opacity: 0.9）
          const opacity = brightness < 0.5 ? 0.8 : 0.9;
          setOverlayOpacity(opacity);
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      // サムネイルがない場合はデフォルトのオーバーレイ不透明度を設定
      setOverlayOpacity(0.85);
    }
  }, [imageUrl]);

  const cardContent = React.createElement(
    "article",
    {
      ref: cardRef,
      className: `overlay-card bg-white rounded-xl shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.1)] overflow-hidden relative aspect-video w-full max-w-[25rem] origin-center z-0 border border-gray-200 cursor-pointer max-[1024px]:max-w-[20rem] max-[768px]:max-w-full max-[768px]:aspect-[4/3] ${className}`,
      "data-category": dataCategory,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: onClick,
    },
    React.createElement(
      "div",
      { className: "card-thumbnail relative w-full h-full overflow-hidden" },
      imageUrl
        ? React.createElement("img", {
            ref: thumbnailRef,
            src: imageUrl,
            alt: imageAlt || title,
            className:
              "card-thumbnail__img w-full h-full object-cover relative z-0",
          })
        : React.createElement("div", {
            className:
              "card-thumbnail-placeholder w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 relative z-0 flex items-center justify-center text-gray-400 text-xl font-medium",
          }),
      React.createElement(
        "div",
        {
          ref: overlayRef,
          className:
            "card-content absolute bottom-0 left-0 w-full p-md box-border z-[1] translate-y-full",
          style: {
            background: `linear-gradient(transparent, rgba(0, 0, 0, ${overlayOpacity}))`,
          },
        },
        React.createElement(
          "h2",
          {
            className:
              "card-title text-2xl font-bold text-white m-0 mb-3 leading-[1.3] line-clamp-3 break-words max-w-full [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]",
          },
          title,
        ),
        (subtitle || date || githubUrl) &&
          React.createElement(
            "div",
            { className: "card-footer flex flex-col gap-sm mt-auto" },
            subtitle &&
              React.createElement(
                "p",
                {
                  className:
                    "card-subtitle text-gray-200 text-sm leading-[1.4] m-0 line-clamp-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
                },
                subtitle,
              ),
            date &&
              React.createElement(
                "time",
                {
                  className:
                    "card-date text-gray-400 text-xs font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] whitespace-nowrap",
                },
                formatDate(date),
              ),
            githubUrl &&
              React.createElement(
                "a",
                {
                  href: githubUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className:
                    "card-github-link text-white text-xs font-medium flex items-center gap-1 mt-1 hover:text-gray-200 transition-colors [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
                  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.stopPropagation();
                    // 親のリンクのクリックを防ぐためにpreventDefaultは不要
                    // GitHubリンク自体の動作は維持する
                  },
                },
                React.createElement(
                  "svg",
                  {
                    width: "16",
                    height: "16",
                    viewBox: "0 0 24 24",
                    fill: "currentColor",
                    className: "card-github-icon",
                  },
                  React.createElement("path", {
                    d: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
                  }),
                ),
                "GitHub",
              ),
          ),
      ),
    ),
  );

  // hrefが指定されている場合はリンクでラップ
  if (href) {
    return React.createElement(
      "a",
      {
        href,
        className:
          "card-link block no-underline text-inherit h-full relative z-0",
        ...(isExternal && {
          target: "_blank",
          rel: "noopener noreferrer",
        }),
      },
      cardContent,
    );
  }

  return cardContent;
}
