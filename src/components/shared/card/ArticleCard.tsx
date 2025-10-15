import React, { useRef, useCallback } from "react";
import { gsap } from "gsap";

interface ArticleCardProps {
  title: string;
  summary?: string;
  publishedAt: string;
  thumbnail?: {
    url: string;
  };
  slug: string;
  category: string;
}

// 画像の明度を計算する関数
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

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 画像の下部25%（card-contentが重なる部分）の明度のみを取得
      const startY = canvas.height * 0.75; // 上部75%をスキップ
      const height = canvas.height * 0.25; // 下部25%のみ
      const imageData = ctx.getImageData(0, startY, canvas.width, height);
      const data = imageData.data;

      let totalBrightness = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 明度を計算（0-1の範囲）
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        totalBrightness += brightness;
      }

      const averageBrightness = totalBrightness / pixelCount;
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

export default function ArticleCard({
  title,
  summary,
  publishedAt,
  thumbnail,
  slug,
  category,
}: ArticleCardProps) {
  const [overlayOpacity, setOverlayOpacity] = React.useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const thumbnailRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // 初期ロードアニメーション
  React.useEffect(() => {
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
    if (!cardRef.current || !thumbnailRef.current || !overlayRef.current)
      return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const card = cardRef.current;
    const thumbnail = thumbnailRef.current;
    const overlay = overlayRef.current;

    tlRef.current = gsap.timeline();
    tlRef.current
      .to(card, {
        y: -12,
        scale: 1.02,
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2)",
        duration: 0.3,
        ease: "power2.out",
      })
      .to(
        thumbnail,
        {
          scale: 1.15,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      )
      .to(
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
    if (!cardRef.current || !thumbnailRef.current || !overlayRef.current)
      return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const card = cardRef.current;
    const thumbnail = thumbnailRef.current;
    const overlay = overlayRef.current;

    tlRef.current = gsap.timeline();
    tlRef.current
      .to(card, {
        y: 0,
        scale: 1,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        duration: 0.4,
        ease: "power2.out",
      })
      .to(
        thumbnail,
        {
          scale: 1,
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      )
      .to(
        overlay,
        {
          y: "100%",
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      );
  }, []);

  React.useEffect(() => {
    if (thumbnail?.url) {
      calculateImageBrightness(thumbnail.url).then((brightness) => {
        // 明度が低い（暗い）場合は背景を薄く（opacity: 0.8）
        // 明度が高い（明るい）場合は背景を濃く（opacity: 0.9）
        const opacity = brightness < 0.5 ? 0.8 : 0.9;
        setOverlayOpacity(opacity);
      });
    }
  }, [thumbnail?.url]);

  return React.createElement(
    "article",
    {
      ref: cardRef,
      className: "blog-card",
      "data-category": category,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    React.createElement(
      "a",
      { href: `/blog/${slug}`, className: "card-link" },
      React.createElement(
        "div",
        { className: "card-thumbnail" },
        thumbnail
          ? React.createElement("img", {
              ref: thumbnailRef,
              src: thumbnail.url,
              alt: title,
              className: "card-thumbnail__img",
            })
          : React.createElement("div", {
              className: "card-thumbnail-placeholder",
            }),
        React.createElement(
          "div",
          {
            ref: overlayRef,
            className: "card-content",
            style: {
              background: `linear-gradient(transparent, rgba(0, 0, 0, ${overlayOpacity}))`,
            },
          },
          React.createElement("h2", { className: "card-title" }, title),
          React.createElement(
            "div",
            { className: "card-footer" },
            summary &&
              React.createElement("p", { className: "card-summary" }, summary),
            React.createElement(
              "time",
              { className: "card-date" },
              formatDate(publishedAt),
            ),
          ),
        ),
      ),
    ),
  );
}
