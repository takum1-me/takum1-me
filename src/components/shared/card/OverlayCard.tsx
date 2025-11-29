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
    if (!cardRef.current || !overlayRef.current)
      return;

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
    if (!cardRef.current || !overlayRef.current)
      return;

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
      className: `overlay-card ${className}`,
      "data-category": dataCategory,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: onClick,
    },
    React.createElement(
      "div",
      { className: "card-thumbnail" },
      imageUrl
        ? React.createElement("img", {
            ref: thumbnailRef,
            src: imageUrl,
            alt: imageAlt || title,
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
        (subtitle || date) &&
          React.createElement(
            "div",
            { className: "card-footer" },
            subtitle &&
              React.createElement(
                "p",
                { className: "card-subtitle" },
                subtitle,
              ),
            date &&
              React.createElement(
                "time",
                { className: "card-date" },
                formatDate(date),
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
        className: "card-link",
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
