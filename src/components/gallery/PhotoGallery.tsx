import { useState } from "react";
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

  const closeModal = () => {
    setSelectedPhoto(null);
  };

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
            className="photo-item"
            onClick={() => openModal(index)}
          >
            <img
              src={photo.photo.url}
              alt={photo.place}
              className="photo-image"
              loading="lazy"
            />
            <div className="photo-overlay">
              <p className="photo-place">{photo.place}</p>
              <p className="photo-date">{formatDate(photo.date)}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedPhoto !== null && (
        <div className="photo-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
