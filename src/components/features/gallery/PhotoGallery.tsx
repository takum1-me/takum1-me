import { useState, useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import "./photo-gallery.css";

export interface PhotoGalleryProps {
  photos: {
    id: string;
    photo: {
      url: string;
      height: number;
      width: number;
    };
    date: string;
    place: string;
  }[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const photoItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const modalTlRef = useRef<gsap.core.Timeline | null>(null);

  // photosが未定義または空の場合は空配列を使用
  const photoList = photos || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const openModal = (index: number) => {
    setSelectedPhoto(index);
  };

  const closeModal = useCallback(() => {
    if (modalTlRef.current) {
      modalTlRef.current.kill();
    }
    if (modalRef.current && modalContentRef.current) {
      modalTlRef.current = gsap.timeline({
        onComplete: () => {
          setSelectedPhoto(null);
        },
      });
      modalTlRef.current
        .to(modalContentRef.current, {
          scale: 0.9,
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        })
        .to(
          modalRef.current,
          {
            opacity: 0,
            duration: 0.3,
            ease: "power2.out",
          },
          0,
        );
    } else {
      setSelectedPhoto(null);
    }
  }, []);

  // モーダルの開閉アニメーション
  useEffect(() => {
    if (selectedPhoto !== null && modalRef.current && modalContentRef.current) {
      if (modalTlRef.current) {
        modalTlRef.current.kill();
      }
      gsap.set(modalRef.current, { opacity: 0 });
      gsap.set(modalContentRef.current, { scale: 0.9, opacity: 0 });
      modalTlRef.current = gsap.timeline();
      modalTlRef.current
        .to(modalRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        })
        .to(
          modalContentRef.current,
          {
            scale: 1,
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
          },
          0,
        );
    }
  }, [selectedPhoto]);

  // 写真アイテムのホバーアニメーション
  const handlePhotoMouseEnter = useCallback((index: number) => {
    const item = photoItemsRef.current[index];
    const overlay = item?.querySelector<HTMLElement>(".photo-overlay");
    const image = item?.querySelector<HTMLElement>(".photo-image");
    if (item && overlay && image) {
      gsap.to(item, {
        y: -4,
        scale: 1.05,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
        duration: 0.2,
        ease: "power2.out",
      });
      gsap.to(overlay, {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(image, {
        scale: 1.05,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }, []);

  const handlePhotoMouseLeave = useCallback((index: number) => {
    const item = photoItemsRef.current[index];
    const overlay = item?.querySelector<HTMLElement>(".photo-overlay");
    const image = item?.querySelector<HTMLElement>(".photo-image");
    if (item && overlay && image) {
      gsap.to(item, {
        y: 0,
        scale: 1,
        boxShadow: "none",
        duration: 0.2,
        ease: "power2.out",
      });
      gsap.to(overlay, {
        y: "100%",
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(image, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }, []);

  const navigatePhoto = (direction: "prev" | "next") => {
    if (selectedPhoto === null) return;

    if (direction === "prev") {
      setSelectedPhoto(
        (selectedPhoto - 1 + photoList.length) % photoList.length,
      );
    } else {
      setSelectedPhoto((selectedPhoto + 1) % photoList.length);
    }
  };

  // 写真がない場合のメッセージを表示
  if (photoList.length === 0) {
    return (
      <div className="photo-gallery-empty">
        <p>まだ写真がありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="photo-gallery">
        {photoList.map((photo, index) => (
          <div
            key={photo.id}
            ref={(el) => {
              if (el) photoItemsRef.current[index] = el;
            }}
            className="photo-item"
            onClick={() => openModal(index)}
            onMouseEnter={() => handlePhotoMouseEnter(index)}
            onMouseLeave={() => handlePhotoMouseLeave(index)}
          >
            <img
              src={photo.photo.url}
              alt={photo.place}
              className="photo-image"
              loading="lazy"
            />
            <div
              className="photo-overlay"
              style={{ opacity: 0, transform: "translateY(100%)" }}
            >
              <p className="photo-place">{photo.place}</p>
              <p className="photo-date">{formatDate(photo.date)}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedPhoto !== null && (
        <div
          ref={modalRef}
          className="photo-modal"
          onClick={closeModal}
          style={{ opacity: 0 }}
        >
          <div
            ref={modalContentRef}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ opacity: 0, transform: "scale(0.9)" }}
          >
            <button className="modal-close" onClick={closeModal}>
              ×
            </button>
            <button
              className="modal-nav modal-prev"
              onClick={() => navigatePhoto("prev")}
            >
              ‹
            </button>
            <button
              className="modal-nav modal-next"
              onClick={() => navigatePhoto("next")}
            >
              ›
            </button>
            <img
              src={photoList[selectedPhoto].photo.url}
              alt={photoList[selectedPhoto].place}
              className="modal-image"
            />
            <div className="modal-info">
              <p className="modal-place">{photoList[selectedPhoto].place}</p>
              <p className="modal-date">
                {formatDate(photoList[selectedPhoto].date)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
