import React from "react";

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
  const [backgroundOpacity, setBackgroundOpacity] = React.useState(0.7);

  React.useEffect(() => {
    if (thumbnail?.url) {
      calculateImageBrightness(thumbnail.url).then((brightness) => {
        // 明度が低い（暗い）場合は背景を白く（opacity: 1）
        // 明度が高い（明るい）場合は背景を半透明（opacity: 0.7）
        const opacity = brightness < 0.9 ? 1.0 : 0.7;
        setBackgroundOpacity(opacity);
      });
    }
  }, [thumbnail?.url]);

  return React.createElement(
    'article',
    { className: "blog-card", 'data-category': category },
    React.createElement(
      'a',
      { href: `/blog/${slug}`, className: "card-link" },
      React.createElement(
        'div',
        { className: "card-thumbnail" },
        thumbnail
          ? React.createElement('img', { src: thumbnail.url, alt: title })
          : React.createElement('div', { className: "card-thumbnail-placeholder" })
      ),
      React.createElement(
        'div',
        {
          className: "card-content",
          style: {
            background: `rgba(255, 255, 255, ${backgroundOpacity})`,
          }
        },
        React.createElement(
          'h2',
          { className: "card-title" },
          title
        ),
        React.createElement(
          'div',
          { className: "card-footer" },
          summary && React.createElement(
            'p',
            { className: "card-summary" },
            summary
          ),
          React.createElement(
            'time',
            { className: "card-date" },
            formatDate(publishedAt)
          )
        )
      )
    )
  );
}
