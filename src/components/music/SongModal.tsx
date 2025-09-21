import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface SongData {
  title: string;
  artist: string;
  appleMusicUrl: string;
  artworkUrl: string;
}

interface SongModalProps {
  song: SongData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SongModal({ song, isOpen, onClose }: SongModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current && overlayRef.current) {
      // モーダル表示アニメーション
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
      );

      gsap.fromTo(
        modalRef.current,
        {
          scale: 0.8,
          opacity: 0,
          y: 50,
        },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "back.out(1.7)",
          delay: 0.1,
        },
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current && overlayRef.current) {
      // モーダル閉じるアニメーション
      gsap.to(modalRef.current, {
        scale: 0.8,
        opacity: 0,
        y: 50,
        duration: 0.3,
        ease: "power2.in",
      });

      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!isOpen || !song) return null;

  return (
    <div className="song-modal-overlay" ref={overlayRef} onClick={handleClose}>
      <div
        className="song-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="song-modal-close" onClick={handleClose}>
          ×
        </button>
        <div className="song-modal-content">
          <img
            src={song.artworkUrl}
            alt={`${song.title} - ${song.artist}`}
            className="song-modal-artwork"
          />
          <div className="song-modal-info">
            <h3 className="song-modal-title">{song.title}</h3>
            <p className="song-modal-artist">{song.artist}</p>
            <a
              href={song.appleMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="song-modal-link"
            >
              Apple Music で聴く
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
