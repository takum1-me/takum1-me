import { useState, useEffect } from "react";
import { getCurrentThought, thoughts } from "../../data/thoughts";
import type { Thought } from "../../data/thoughts";

interface ThoughtDisplayProps {
  className?: string;
}

export default function ThoughtDisplay({
  className = "",
}: ThoughtDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allThoughts, setAllThoughts] = useState<Thought[]>([]);
  const currentThought = getCurrentThought();

  useEffect(() => {
    // 新しい順でソート
    const sortedThoughts = [...thoughts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    setAllThoughts(sortedThoughts);
  }, []);

  if (!currentThought) {
    return null;
  }

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div
        className={`thought-display clickable ${className}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <p className="thought-content">{currentThought.content}</p>
        <span className="thought-date">{currentThought.date}</span>
        <span className="thought-hint">クリックして過去の一言を見る</span>
      </div>

      {/* モーダルを直接ここに実装 */}
      {isModalOpen && (
        <div className="thought-modal-overlay" onClick={handleClose}>
          <div className="thought-modal" onClick={(e) => e.stopPropagation()}>
            <div className="thought-modal-header">
              <h3 className="thought-modal-title">一言の履歴</h3>
              <button className="thought-modal-close" onClick={handleClose}>
                ×
              </button>
            </div>

            <div className="thought-modal-content">
              {allThoughts.map((thought, index) => (
                <div
                  key={thought.id}
                  className={`thought-item ${index === 0 ? "active" : ""}`}
                >
                  <p className="thought-item-content">{thought.content}</p>
                  <span className="thought-item-date">{thought.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
