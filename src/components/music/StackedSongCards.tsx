import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface SongData {
  title: string;
  artist: string;
  appleMusicUrl: string;
  artworkUrl: string;
}

interface StackedSongCardsProps {
  songs: SongData[];
}

export default function StackedSongCards({ songs }: StackedSongCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [displayCount, setDisplayCount] = useState(3);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // レンダリング前に画面サイズを確認
  useLayoutEffect(() => {
    const checkIsMobile = () => {
      const width = window.innerWidth;
      const newIsMobile = width <= 768;
      const prevIsMobile = isMobile;
      const prevDisplayCount = displayCount;

      setIsMobile(newIsMobile);

      // 768px以上の場合、画面幅に応じて表示数を決定
      let newDisplayCount = 3;
      if (!newIsMobile) {
        if (width >= 1400) {
          newDisplayCount = 5;
        } else if (width >= 1200) {
          newDisplayCount = 4;
        } else if (width >= 1000) {
          newDisplayCount = 3;
        } else {
          newDisplayCount = 2;
        }
      }
      setDisplayCount(newDisplayCount);

      setIsInitialized(true);

      // 画面サイズ変更時にカード位置をリセット
      if (
        cardRefs.current.length > 0 &&
        (prevIsMobile !== newIsMobile || prevDisplayCount !== newDisplayCount)
      ) {
        // すべてのアニメーションを停止
        gsap.killTweensOf(cardRefs.current);

        cardRefs.current.forEach((card, index) => {
          if (card) {
            if (newIsMobile) {
              // モバイル表示に切り替え時
              gsap.set(card, {
                clearProps: "all",
              });
              gsap.set(card, {
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                x: 0,
                y: 0,
                z: 0,
                margin: 0,
                position: "absolute",
                opacity: index === currentSongIndex ? 1 : 0,
                scale: index === currentSongIndex ? 1 : 0.7,
              });
            } else {
              // デスクトップ表示に切り替え時 - 位置を確実にリセット
              gsap.set(card, {
                clearProps: "all",
              });
              gsap.set(card, {
                left: "auto",
                top: "auto",
                transform: `translateX(${index * 20}px)`,
                x: 0,
                y: 0,
                z: 0,
                position: "relative",
                margin: "auto",
                opacity: 1,
                scale: 1,
              });
            }
          }
        });
      }
    };

    // 即座にチェック
    checkIsMobile();

    // リサイズイベントにデバウンス処理を追加
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        // リサイズ時にアニメーションを一時停止
        gsap.globalTimeline.pause();
        checkIsMobile();
        // 少し待ってからアニメーションを再開
        setTimeout(() => {
          gsap.globalTimeline.resume();
        }, 50);
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // 初期表示の設定
  useEffect(() => {
    if (containerRef.current && cardRefs.current.length > 0 && isInitialized) {
      cardRefs.current.forEach((card, index) => {
        if (card) {
          if (isMobile) {
            // モバイル表示の初期設定
            gsap.set(card, {
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              x: 0,
              y: 0,
              margin: 0,
              opacity: 0,
              scale: 0.8,
              position: "absolute",
            });

            // 最初のカードをアニメーション付きで表示
            if (index === currentSongIndex) {
              gsap.to(card, {
                opacity: 1,
                scale: 1,
                duration: 0.8,
                ease: "back.out(1.7)",
                delay: 0.2,
              });
            }
          } else {
            // デスクトップ表示の初期設定 - 位置を確実にリセット
            gsap.set(card, {
              left: "auto",
              top: "auto",
              transform: `translateX(${index * 20}px)`,
              x: 0,
              y: 0,
              z: 0,
              opacity: 1,
              scale: 1,
              position: "relative",
              margin: "auto",
            });
          }
        }
      });
    }
  }, [songs, isMobile, isInitialized, currentSongIndex, displayCount]);

  // displayCount変更時の位置再計算
  useEffect(() => {
    if (!isMobile && cardRefs.current.length > 0 && isInitialized) {
      // すべてのアニメーションを停止
      gsap.killTweensOf(cardRefs.current);

      cardRefs.current.forEach((card, index) => {
        if (card && index < displayCount) {
          gsap.set(card, {
            clearProps: "all",
          });
          gsap.set(card, {
            left: "auto",
            top: "auto",
            transform: `translateX(${index * 20}px)`,
            x: 0,
            y: 0,
            z: 0,
            position: "relative",
            margin: "auto",
            opacity: 1,
            scale: 1,
          });
        }
      });
    }
  }, [displayCount, isMobile, isInitialized]);

  // モバイル表示の自動切り替え
  useEffect(() => {
    if (isMobile && songs.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentSongIndex((prevIndex) => (prevIndex + 1) % songs.length);
      }, 5000); // 5秒間隔で切り替え

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isMobile, songs.length]);

  // モバイル表示のアニメーション
  useEffect(() => {
    if (isMobile && cardRefs.current.length > 0) {
      cardRefs.current.forEach((card, index) => {
        if (card) {
          const overlay = card.querySelector(".song-overlay") as HTMLElement;

          if (index === currentSongIndex) {
            // 位置を確実に中央に設定
            gsap.set(card, {
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              margin: 0,
            });

            // 縮小から拡大するアニメーション
            gsap.fromTo(
              card,
              {
                opacity: 0,
                scale: 0.7,
              },
              {
                opacity: 1,
                scale: 1,
                duration: 0.8,
                ease: "back.out(1.7)",
              },
            );

            // モバイルでは常にオーバーレイを表示
            gsap.to(overlay, {
              y: 0,
              duration: 0.6,
              ease: "power2.out",
              delay: 0.2,
            });
          } else {
            // 非表示カードも位置を中央に設定
            gsap.set(card, {
              left: "50%",
              top: "50%",
              transform: "translate(-50%, calc(-50% + 15px))",
              margin: 0,
            });

            // 拡大から縮小するアニメーション
            gsap.to(card, {
              opacity: 0,
              scale: 0.7,
              duration: 0.6,
              ease: "power2.in",
            });
          }
        }
      });
    }
  }, [currentSongIndex, isMobile]);

  const handleCardHover = (index: number, isHovering: boolean) => {
    if (isMobile) return; // モバイルではホバー効果を無効化

    const card = cardRefs.current[index];
    if (!card) return;

    const overlay = card.querySelector(".song-overlay") as HTMLElement;
    const artwork = card.querySelector(".song-artwork") as HTMLElement;

    if (isHovering) {
      gsap.to(card, {
        y: -12,
        scale: 1.05,
        rotation: 2,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(artwork, {
        scale: 1.1,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(overlay, {
        y: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      gsap.to(card, {
        y: 0,
        z: 0,
        scale: 1,
        rotation: 0,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(artwork, {
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(overlay, {
        y: "100%",
        duration: 0.3,
        ease: "power2.out",
      });
    }
  };

  const handleCardClick = (song: SongData) => {
    if (song.appleMusicUrl) {
      window.open(song.appleMusicUrl, "_blank");
    }
  };

  // 初期化が完了するまで待機
  if (!isInitialized) {
    return null;
  }

  // 表示するsongsを制限
  const displaySongs = isMobile ? songs : songs.slice(0, displayCount);

  return (
    <>
      <div
        className={`stacked-songs-container ${isMobile ? "mobile-mode" : ""}`}
        ref={containerRef}
      >
        <div className="stacked-songs">
          {displaySongs.map((song, index) => (
            <div
              key={index}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className={`stacked-song-card ${isMobile ? "mobile-card" : ""}`}
              style={{
                transform: isMobile
                  ? "translate(-50%, -50%)"
                  : `translateX(${index * 20}px)`,
                zIndex: isMobile ? (index === currentSongIndex ? 10 : 1) : 1,
                opacity: isMobile ? (index === currentSongIndex ? 1 : 0) : 1,
                left: isMobile ? "50%" : "auto",
                top: isMobile ? "50%" : "auto",
                position: isMobile ? "absolute" : "relative",
                margin: isMobile ? "0" : "auto",
                cursor: "pointer",
              }}
              onMouseEnter={() => handleCardHover(index, true)}
              onMouseLeave={() => handleCardHover(index, false)}
              onClick={() => handleCardClick(song)}
            >
              <img
                src={song.artworkUrl}
                alt={`${song.title} - ${song.artist}`}
                className="song-artwork"
              />
              <div className="song-overlay">
                <div className="song-title">{song.title}</div>
                <div className="song-artist">{song.artist}</div>
              </div>
            </div>
          ))}
        </div>
        {isMobile && displaySongs.length > 1 && (
          <div className="song-indicators">
            {displaySongs.map((_, index) => (
              <div
                key={index}
                className={`song-indicator ${index === currentSongIndex ? "active" : ""}`}
                onClick={() => {
                  setCurrentSongIndex(index);
                  // インジケータークリック時のフィードバック
                  const indicator = document.querySelector(
                    `.song-indicator:nth-child(${index + 1})`,
                  );
                  if (indicator) {
                    gsap.fromTo(
                      indicator,
                      { scale: 1 },
                      {
                        scale: 1.3,
                        duration: 0.2,
                        ease: "power2.out",
                        yoyo: true,
                        repeat: 1,
                      },
                    );
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
