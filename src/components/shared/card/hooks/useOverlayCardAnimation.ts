import { useRef, useCallback, useEffect } from "react";
import { gsap } from "gsap";

interface UseOverlayCardAnimationProps {
  disableHover: boolean;
  cardRef: React.RefObject<HTMLElement | null>;
  thumbnailRef: React.RefObject<HTMLImageElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * OverlayCardのアニメーションロジックを管理するカスタムフック
 */
export const useOverlayCardAnimation = ({
  disableHover,
  cardRef,
  thumbnailRef,
  overlayRef,
}: UseOverlayCardAnimationProps) => {
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // 初期ロードアニメーション
  useEffect(() => {
    if (disableHover) {
      // ホバー無効の場合はオーバーレイを常に表示
      if (overlayRef.current) {
        gsap.set(overlayRef.current, { y: 0 });
      }
      return;
    }

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
  }, [disableHover, cardRef, overlayRef]);

  const handleMouseEnter = useCallback(() => {
    if (!cardRef.current || !overlayRef.current) return;

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
  }, [cardRef, thumbnailRef, overlayRef]);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current || !overlayRef.current) return;

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
  }, [cardRef, thumbnailRef, overlayRef]);

  return {
    handleMouseEnter,
    handleMouseLeave,
  };
};
