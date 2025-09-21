import { useState, useEffect, useRef } from "react";
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
  const [selectedSong, setSelectedSong] = useState<SongData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (containerRef.current && cardRefs.current.length > 0) {
      // 各カードの正しい位置に設定
      cardRefs.current.forEach((card, index) => {
        if (card) {
          gsap.set(card, {
            x: index * 20,
            opacity: 1,
          });
        }
      });
    }
  }, [songs]);

  const handleSongClick = (song: SongData) => {
    setSelectedSong(song);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSong(null);
  };

  const handleCardHover = (index: number, isHovering: boolean) => {
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
        x: index * 20,
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

  return (
    <>
      <div className="stacked-songs-container" ref={containerRef}>
        <div className="stacked-songs">
          {songs.map((song, index) => (
            <div
              key={index}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="stacked-song-card"
              style={{
                transform: `translateX(${index * 20}px)`,
                zIndex: 1,
              }}
              onClick={() => handleSongClick(song)}
              onMouseEnter={() => handleCardHover(index, true)}
              onMouseLeave={() => handleCardHover(index, false)}
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
      </div>

      
    </>
  );
}
