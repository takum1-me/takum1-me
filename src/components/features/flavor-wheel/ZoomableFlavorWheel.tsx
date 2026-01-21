import React, { useState, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import type { FlavorSegment } from "../../../data/flavor-wheel-segments";
import styles from "./ZoomableFlavorWheel.module.css";

interface ZoomableFlavorWheelProps {
  segments: FlavorSegment[];
}

// グローバル関数の型定義
declare global {
  interface Window {
    addFlavorFromWheel?: (flavorName: string) => void;
  }
}

export function ZoomableFlavorWheel({ segments }: ZoomableFlavorWheelProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [zoomedCategory, setZoomedCategory] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState("0 0 810 810");
  const [segmentOpacity, setSegmentOpacity] = useState(1);
  const [activeInput, setActiveInput] = useState<
    "aroma" | "flavor" | "aftertaste" | null
  >(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const viewBoxAnimRef = useRef({ x: 0, y: 0, width: 810, height: 810 });
  const opacityRef = useRef({ opacity: 1 });

  // アクティブ入力フィールドの変更を監視
  useEffect(() => {
    const handleActiveInputChange = (e: CustomEvent) => {
      setActiveInput(e.detail.activeInput);
    };

    window.addEventListener(
      "activeInputChange",
      handleActiveInputChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "activeInputChange",
        handleActiveInputChange as EventListener,
      );
    };
  }, []);

  const handleSegmentClick = useCallback(
    (segment: FlavorSegment) => {
      // ズームしていない状態で、任意の層をクリック → 親の第1層にズーム
      if (!zoomedCategory && segment.name) {
        // 第1層の親を探す
        let rootCategory = segment;
        while (rootCategory.depth > 1 && rootCategory.parent) {
          const parent = segments.find((s) => s.id === rootCategory.parent);
          if (!parent) break;
          rootCategory = parent;
        }

        setZoomedCategory(rootCategory.id);

        // カテゴリーブロック全体を取得（rootCategoryの子孫）
        const categorySegments = [
          rootCategory,
          ...segments.filter((s) => {
            let current = s;
            while (current.parent) {
              if (current.parent === rootCategory.id) return true;
              const parent = segments.find((p) => p.id === current.parent);
              if (!parent) break;
              current = parent;
            }
            return false;
          }),
        ];

        // 全セグメントの角度を取得
        const angles = categorySegments
          .map((s) => {
            const match = s.textTransform.match(/rotate\(([-\d.]+)\)/);
            return match ? parseFloat(match[1]) : null;
          })
          .filter((a) => a !== null) as number[];

        if (angles.length > 0) {
          const minAngle = Math.min(...angles);
          const maxAngle = Math.max(...angles);
          const centerAngle = (minAngle + maxAngle) / 2;
          const centerRad = (centerAngle * Math.PI) / 180;

          const centerRadius = 280;
          const centerX = 405 + Math.cos(centerRad) * centerRadius;
          const centerY = 405 + Math.sin(centerRad) * centerRadius;

          const viewSize = 450;
          const targetX = centerX - viewSize / 2;
          const targetY = centerY - viewSize / 2;

          // GSAPでスムーズな連続アニメーション
          gsap.to(viewBoxAnimRef.current, {
            x: targetX,
            y: targetY,
            width: viewSize,
            height: viewSize,
            duration: 0.8,
            ease: "power2.inOut",
            onUpdate: () => {
              const vb = viewBoxAnimRef.current;
              const newViewBox = `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
              setViewBox(newViewBox);
            },
          });

          // 透明度も同時にスムーズに変化
          gsap.to(opacityRef.current, {
            opacity: 0.85,
            duration: 0.3,
            ease: "power1.inOut",
            onUpdate: () => {
              setSegmentOpacity(opacityRef.current.opacity);
            },
            onComplete: () => {
              gsap.to(opacityRef.current, {
                opacity: 1,
                duration: 0.3,
                ease: "power1.out",
                onUpdate: () => {
                  setSegmentOpacity(opacityRef.current.opacity);
                },
              });
            },
          });
        }
      }
      // すでにズームしている状態でクリック → 入力フィールドに追加
      else if (zoomedCategory && segment.name) {
        if (window.addFlavorFromWheel) {
          window.addFlavorFromWheel(segment.name);
        }
      }
    },
    [zoomedCategory, segments],
  );

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // SVG背景をクリックした場合、ズームアウト
      if (e.target === e.currentTarget && zoomedCategory) {
        setZoomedCategory(null);

        // GSAPでスムーズなズームアウト
        gsap.to(viewBoxAnimRef.current, {
          x: 0,
          y: 0,
          width: 810,
          height: 810,
          duration: 0.8,
          ease: "power2.inOut",
          onUpdate: () => {
            const vb = viewBoxAnimRef.current;
            setViewBox(`${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
          },
        });

        // 透明度も同時にスムーズに変化
        gsap.to(opacityRef.current, {
          opacity: 0.85,
          duration: 0.3,
          ease: "power1.inOut",
          onUpdate: () => setSegmentOpacity(opacityRef.current.opacity),
          onComplete: () => {
            gsap.to(opacityRef.current, {
              opacity: 1,
              duration: 0.3,
              ease: "power1.out",
              onUpdate: () => setSegmentOpacity(opacityRef.current.opacity),
            });
          },
        });
      }
    },
    [zoomedCategory],
  );

  const resetZoom = useCallback(() => {
    if (!zoomedCategory) return;

    setZoomedCategory(null);

    // GSAPでスムーズなズームアウト
    gsap.to(viewBoxAnimRef.current, {
      x: 0,
      y: 0,
      width: 810,
      height: 810,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: () => {
        const vb = viewBoxAnimRef.current;
        setViewBox(`${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
      },
    });

    // 透明度も同時にスムーズに変化
    gsap.to(opacityRef.current, {
      opacity: 0.85,
      duration: 0.3,
      ease: "power1.inOut",
      onUpdate: () => setSegmentOpacity(opacityRef.current.opacity),
      onComplete: () => {
        gsap.to(opacityRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: "power1.out",
          onUpdate: () => setSegmentOpacity(opacityRef.current.opacity),
        });
      },
    });
  }, [zoomedCategory]);

  // すべてのセグメントを表示（非表示にしない）
  const visibleSegments = segments;

  return (
    <div className={styles.wrapper}>
      {/* SVGホイール */}
      <div className={styles["svg-container"]}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox}
          onClick={handleBackgroundClick}
          className={zoomedCategory ? styles.svg : styles["svg-default"]}
        >
          {/* 中心の白い円（固定位置、ズーム時は非表示） */}
          {!zoomedCategory && (
            <circle cx="405" cy="405" r="69.27416531557695" fill="white" />
          )}

          <g transform="translate(405,405)" opacity={segmentOpacity}>
            {/* フレーバーセグメント */}
            {visibleSegments.map((segment) => {
              if (!segment.name) return null;

              const isHovered = hoveredSegment === segment.id;
              const isCategory = segment.depth === 1;

              return (
                <g key={segment.id}>
                  <path
                    d={segment.path}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinejoin="miter"
                    opacity={isHovered ? 0.8 : 1}
                    className={`${styles.segment} ${isCategory ? styles["segment--category"] : styles["segment--subcategory"]}`}
                    onMouseEnter={() => setHoveredSegment(segment.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSegmentClick(segment);
                    }}
                  />
                  <text
                    textAnchor={segment.textAnchor}
                    dy=".2em"
                    transform={segment.textTransform}
                    fill={segment.textColor}
                    fillOpacity="1"
                    className={`${styles["segment-text"]} ${isCategory ? styles["segment-text--category"] : styles["segment-text--subcategory"]}`}
                  >
                    <tspan
                      x="0"
                      className={
                        isCategory
                          ? styles["segment-text__span--category"]
                          : styles["segment-text__span--subcategory"]
                      }
                    >
                      {segment.name}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ヘルプテキスト */}
      <div className={styles.footer}>
        {zoomedCategory
          ? "具体的なフレーバーをクリックして選択"
          : "カテゴリーをクリックして拡大表示"}
      </div>
    </div>
  );
}
