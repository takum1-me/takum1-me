import { useState, useEffect } from "react";
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
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());

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
    setSelectedIndex(index);
    // モーダルが開いたら画像の読み込みを開始
    setTimeout(() => {
      setImagesLoaded((prev) => {
        const next = new Set(prev);
        latteArts[index].photos?.forEach((_, photoIndex) => {
          if (photoIndex > 0) {
            next.add(`${latteArts[index].id}-${photoIndex}`);
          }
        });
        return next;
      });
    }, 100);
  };

  const handleCloseModal = () => {
    setSelectedIndex(null);
  };

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIndex !== null) {
        handleCloseModal();
      }
    };

    if (selectedIndex !== null) {
      document.addEventListener("keydown", handleEscape);
      // モーダルが開いている時はbodyのスクロールを無効化
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  if (latteArts.length === 0) {
    return (
      <div className="latte-art-progress-empty">
        <p>まだ記録がありません</p>
      </div>
    );
  }

  const selectedLatteArt =
    selectedIndex !== null ? latteArts[selectedIndex] : null;

  return (
    <div className="latte-art-progress">
      <div className="latte-art-list">
        {latteArts.map((latteArt, index) => (
          <div
            key={latteArt.id}
            className="latte-art-item"
            onClick={() => handleItemClick(index)}
          >
            <div className="latte-art-card-wrapper">
              {latteArt.photos && latteArt.photos.length > 0 && (
                <div className="latte-art-card-image">
                  <img
                    src={optimizeImageUrl(latteArt.photos[0].url, 400)}
                    alt={latteArt.title || "ラテアート"}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              <div className="latte-art-card-overlay">
                {latteArt.date && (
                  <p className="latte-art-date">{formatDate(latteArt.date)}</p>
                )}
                {latteArt.design && latteArt.design.length > 0 && (
                  <p className="latte-art-designs">
                    {latteArt.design
                      .map((design) => designLabels[design] || design)
                      .join(" / ")}
                  </p>
                )}
                {latteArt.practiceCount !== undefined && (
                  <p className="latte-art-practice-count">
                    練習回数: {latteArt.practiceCount}回
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* モーダル */}
      {selectedLatteArt && (
        <div
          className="latte-art-modal-overlay"
          onClick={handleCloseModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCloseModal();
          }}
          role="button"
          tabIndex={-1}
        >
          <div
            className="latte-art-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCloseModal();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="latte-art-modal-title"
          >
            <button
              className="latte-art-modal-close"
              onClick={handleCloseModal}
              aria-label="閉じる"
            >
              ×
            </button>

            <div className="latte-art-modal-content">
              {selectedLatteArt.photos &&
                selectedLatteArt.photos.length > 0 && (
                  <div className="latte-art-modal-image">
                    <img
                      src={optimizeImageUrl(
                        selectedLatteArt.photos[0].url,
                        1200,
                      )}
                      alt={selectedLatteArt.title || "ラテアート"}
                      loading="eager"
                    />
                  </div>
                )}

              <div className="latte-art-modal-info">
                {selectedLatteArt.title && (
                  <h2
                    id="latte-art-modal-title"
                    className="latte-art-modal-title"
                  >
                    {selectedLatteArt.title}
                  </h2>
                )}

                <div className="latte-art-modal-meta">
                  {selectedLatteArt.date && (
                    <span className="latte-art-modal-date">
                      {formatDate(selectedLatteArt.date)}
                    </span>
                  )}
                  {selectedLatteArt.design &&
                    selectedLatteArt.design.length > 0 && (
                      <div className="latte-art-modal-designs">
                        {selectedLatteArt.design.map((design) => (
                          <span
                            key={design}
                            className="latte-art-modal-design-tag"
                          >
                            {designLabels[design] || design}
                          </span>
                        ))}
                      </div>
                    )}
                  {selectedLatteArt.practiceCount !== undefined && (
                    <span className="latte-art-modal-practice-count">
                      練習回数: {selectedLatteArt.practiceCount}回
                    </span>
                  )}
                </div>
              </div>

              <div className="latte-art-modal-body">

                {selectedLatteArt.goal && (
                  <div className="latte-art-modal-section">
                    <h3>目標</h3>
                    <p>{selectedLatteArt.goal}</p>
                  </div>
                )}

                {selectedLatteArt.review && (
                  <div className="latte-art-modal-section">
                    <h3>感想</h3>
                    <p>{selectedLatteArt.review}</p>
                  </div>
                )}

                {selectedLatteArt.issue && (
                  <div className="latte-art-modal-section">
                    <h3>課題</h3>
                    <p>{selectedLatteArt.issue}</p>
                  </div>
                )}

                {selectedLatteArt.photos &&
                  selectedLatteArt.photos.length > 1 && (
                    <div className="latte-art-modal-section">
                      <h3>写真</h3>
                      <div className="latte-art-modal-photos-grid">
                        {selectedLatteArt.photos
                          .slice(1)
                          .map((photo, photoIndex) => {
                            const imageKey = `${selectedLatteArt.id}-${photoIndex + 1}`;
                            const isLoaded = imagesLoaded.has(imageKey);

                            return (
                              <div
                                key={photoIndex}
                                className="latte-art-modal-photo-wrapper"
                              >
                                {!isLoaded && (
                                  <div className="latte-art-photo-placeholder" />
                                )}
                                <img
                                  src={optimizeImageUrl(photo.url, 600)}
                                  alt={`${selectedLatteArt.title || "ラテアート"} ${photoIndex + 2}`}
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
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
