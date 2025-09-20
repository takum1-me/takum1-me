import React, { useRef, useCallback } from "react";
import { gsap } from "gsap";

interface HomeArticleCardProps {
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

      // 画像全体の明度を取得
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

export default function HomeArticleCard({
  title,
  summary,
  publishedAt,
  thumbnail,
  slug,
  category,
}: HomeArticleCardProps) {
  const [overlayOpacity, setOverlayOpacity] = React.useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const thumbnailRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

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
        y: -8,
        duration: 0.1,
        ease: "power2.out",
      })
      .to(
        thumbnail,
        {
          scale: 1.1,
          duration: 0.05,
          ease: "power2.out",
        },
        0,
      )
      .to(
        overlay,
        {
          opacity: 1,
          duration: 0.05,
          ease: "power2.out",
        },
        0.05,
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
        duration: 0.2,
        ease: "power2.out",
      })
      .to(
        thumbnail,
        {
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
        },
        0,
      )
      .to(
        overlay,
        {
          opacity: 0,
          duration: 0.15,
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
      className: "home-article-card",
      "data-category": category,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    React.createElement(
      "a",
      { href: `/blog/${slug}`, className: "home-card-link" },
      React.createElement(
        "div",
        { className: "home-card-thumbnail" },
        thumbnail
          ? React.createElement("img", {
              ref: thumbnailRef,
              src: thumbnail.url,
              alt: title,
            })
          : React.createElement("div", {
              className: "home-card-thumbnail-placeholder",
            }),
        React.createElement(
          "div",
          {
            ref: overlayRef,
            className: "home-card-overlay",
            style: {
              background: `rgba(255, 255, 255, ${overlayOpacity})`,
            },
          },
          React.createElement("h2", { className: "home-card-title" }, title),
          React.createElement(
            "div",
            { className: "home-card-footer" },
            summary &&
              React.createElement(
                "p",
                { className: "home-card-summary" },
                summary,
              ),
            React.createElement(
              "time",
              { className: "home-card-date" },
              formatDate(publishedAt),
            ),
          ),
        ),
      ),
    ),
  );
}
