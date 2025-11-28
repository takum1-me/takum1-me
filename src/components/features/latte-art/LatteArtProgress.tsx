import { useState } from "react";
import type { LatteArt, LatteArtDesign } from "../../../lib/microcms/latte-art";
import "./latte-art-progress.css";

interface LatteArtProgressProps {
  latteArts: LatteArt[];
}

const designLabels: Record<LatteArtDesign, string> = {
  heart: "ハート",
  tulip: "チューリップ",
  layeredHeart: "レイヤードハート",
  rosetta: "ロゼッタ",
  wiggledHeart: "ウィグルハート",
  wingedTulip: "ウィングドチューリップ",
  Swan: "スワン",
};

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return dateString;
  }
}

export default function LatteArtProgress({ latteArts }: LatteArtProgressProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [closingIndex, setClosingIndex] = useState<number | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [shouldLoadImages, setShouldLoadImages] = useState<Set<number>>(
    new Set(),
  );

  // 画像URLを最適化（サイズを指定）
  const optimizeImageUrl = (url: string, width: number = 400): string => {
    // microCMSの画像URLにクエリパラメータを追加
    if (url.includes("microcms.io")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}w=${width}&fm=webp&q=80`;
    }
    return url;
  };

  const handleItemClick = (index: number) => {
    if (selectedIndex === index) {
      // 閉じる時：アニメーションを開始
      setClosingIndex(index);
      // アニメーション完了後に状態をリセット
      setTimeout(() => {
        setSelectedIndex(null);
        setClosingIndex(null);
        setShouldLoadImages((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }, 600); // CSSのアニメーション時間と合わせる
    } else {
      // 開く時：即座に状態を更新
      setClosingIndex(null);
      setSelectedIndex(index);
      // アニメーション開始後に画像の読み込みを開始
      setTimeout(() => {
        setShouldLoadImages((prev) => new Set(prev).add(index));
      }, 100); // アニメーション開始後少し遅延させて読み込み
    }
  };

  if (latteArts.length === 0) {
    return (
      <div className="latte-art-progress-empty">
        <p>まだ記録がありません</p>
      </div>
    );
  }

  return (
    <div className="latte-art-progress">
      <div className="latte-art-list">
        {latteArts.map((latteArt, index) => {
          const isExpanded = selectedIndex === index;
          const isClosing = closingIndex === index;
          const shouldShowDetails = isExpanded || isClosing;

          return (
            <div
              key={latteArt.id}
              className={`latte-art-item ${
                isExpanded ? "expanded" : ""
              } ${isClosing ? "closing" : ""}`}
              onClick={() => handleItemClick(index)}
            >
              <div className="latte-art-item-header">
                <div className="latte-art-item-main">
                  {latteArt.photos && latteArt.photos.length > 0 && (
                    <div className="latte-art-photo">
                      <img
                        src={optimizeImageUrl(latteArt.photos[0].url, 160)}
                        alt={latteArt.title || "ラテアート"}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <div className="latte-art-item-info">
                    <h3 className="latte-art-title">
                      {latteArt.title || "無題"}
                    </h3>
                    <div className="latte-art-meta">
                      {latteArt.date && (
                        <span className="latte-art-date">
                          {formatDate(latteArt.date)}
                        </span>
                      )}
                      {latteArt.design && latteArt.design.length > 0 && (
                        <div className="latte-art-designs">
                          {latteArt.design.map((design) => (
                            <span key={design} className="latte-art-design-tag">
                              {designLabels[design] || design}
                            </span>
                          ))}
                        </div>
                      )}
                      {latteArt.practiceCount !== undefined && (
                        <span className="latte-art-practice-count">
                          練習回数: {latteArt.practiceCount}回
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="latte-art-expand-icon">
                  {isExpanded ? "−" : "+"}
                </div>
              </div>
              {shouldShowDetails && (
                <div
                  className={`latte-art-details ${isClosing ? "closing" : "opening"}`}
                >
                  {latteArt.goal && (
                    <div className="latte-art-detail-section">
                      <h4>目標</h4>
                      <p>{latteArt.goal}</p>
                    </div>
                  )}
                  {latteArt.review && (
                    <div className="latte-art-detail-section">
                      <h4>感想</h4>
                      <p>{latteArt.review}</p>
                    </div>
                  )}
                  {latteArt.issue && (
                    <div className="latte-art-detail-section">
                      <h4>課題</h4>
                      <p>{latteArt.issue}</p>
                    </div>
                  )}
                  {latteArt.photos && latteArt.photos.length > 1 && (
                    <div className="latte-art-detail-section">
                      <h4>写真</h4>
                      {shouldLoadImages.has(index) ? (
                        <div className="latte-art-photos-grid">
                          {latteArt.photos.slice(1).map((photo, photoIndex) => {
                            const imageKey = `${latteArt.id}-${photoIndex}`;
                            const isLoaded = imagesLoaded.has(imageKey);

                            return (
                              <div
                                key={photoIndex}
                                className="latte-art-photo-wrapper"
                              >
                                {!isLoaded && (
                                  <div className="latte-art-photo-placeholder" />
                                )}
                                <img
                                  src={optimizeImageUrl(photo.url, 300)}
                                  alt={`${latteArt.title || "ラテアート"} ${photoIndex + 2}`}
                                  loading="lazy"
                                  decoding="async"
                                  onLoad={() => {
                                    setImagesLoaded((prev) =>
                                      new Set(prev).add(imageKey),
                                    );
                                  }}
                                  style={{
                                    opacity: isLoaded ? 1 : 0,
                                    transition: "opacity 0.3s ease",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="latte-art-photos-grid">
                          {latteArt.photos.slice(1).map((_, photoIndex) => (
                            <div
                              key={photoIndex}
                              className="latte-art-photo-wrapper"
                            >
                              <div className="latte-art-photo-placeholder" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
