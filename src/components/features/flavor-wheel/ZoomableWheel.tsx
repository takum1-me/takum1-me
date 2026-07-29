import React, { useState, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import type { WheelSegment } from "../../../data/wheel-segment";
import styles from "./ZoomableFlavorWheel.module.css";

const DEFAULT_VIEW = 810;
const DEFAULT_HUB = 69.27416531557695;
const DEFAULT_ZOOM_RADIUS = 280;
const DEFAULT_ZOOM_VIEWPORT = 450;

export interface ZoomableWheelProps {
  segments: WheelSegment[];
  footerIdle: string;
  footerZoomed: string;
  /** 中央ハブ白円の半径（セグメント inner 径と揃える） */
  hubRadius?: number;
  viewBoxSize?: number;
  /** 既定では viewBoxSize と同じ。矩形ビューポートが必要なときのみ指定 */
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  /** ズーム計算でカテゴリ中心へ寄せる半径 */
  zoomFocusRadius?: number;
  /** ズーム後の viewBox 一辺の長さ（全体サイズに対する比率で既定） */
  zoomViewportSize?: number;
  /** ブログのフレーバー入力連携（window.addFlavorFromWheel） */
  flavorIntegration?: boolean;
  /**
   * ズーム中に末端セグメントを選んだときのコールバック。
   * window グローバルを介さずに名前と公式カラーを受け取れる。
   */
  onSelect?: (segment: WheelSegment) => void;
  /** Coffee Character Wheel など PDF 由来 radial が画面上下逆になるときに true（ハブ中心で scaleY(-1)） */
  flipRadialY?: boolean;
  /** false で中央の白ハブ円を出さない */
  showHubCircle?: boolean;
  /** false でセグメントの白縁取りなし */
  segmentOutline?: boolean;
  /**
   * PDF 由来ホイール用。path の groupTransform 直下でパスにだけ適用するローカル変換。
   * ポスター SVG のルート matrix が matrix(scaleX,0,0,-scaleY,...) の場合、
   * "matrix(scaleX,0,0,-scaleY,0,0)" を指定するとパス座標が正しいスクリーン座標になる。
   * テキストは groupTransform 基準で既にスクリーン座標なので影響を受けない。
   */
  pathLocalTransform?: string;
}

declare global {
  interface Window {
    addFlavorFromWheel?: (flavorName: string) => void;
  }
}

export function ZoomableWheel({
  segments,
  footerIdle,
  footerZoomed,
  hubRadius = DEFAULT_HUB,
  viewBoxSize = DEFAULT_VIEW,
  viewBoxWidth: viewBoxWidthProp,
  viewBoxHeight: viewBoxHeightProp,
  zoomFocusRadius = DEFAULT_ZOOM_RADIUS,
  zoomViewportSize = DEFAULT_ZOOM_VIEWPORT,
  flavorIntegration = false,
  onSelect,
  flipRadialY = false,
  showHubCircle = true,
  segmentOutline = true,
  pathLocalTransform,
}: ZoomableWheelProps) {
  const vbW = viewBoxWidthProp ?? viewBoxSize;
  const vbH = viewBoxHeightProp ?? viewBoxSize;

  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [zoomedCategory, setZoomedCategory] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState(`0 0 ${vbW} ${vbH}`);
  const [segmentOpacity, setSegmentOpacity] = useState(1);

  const viewBoxAnimRef = useRef({
    x: 0,
    y: 0,
    width: vbW,
    height: vbH,
  });
  const opacityRef = useRef({ opacity: 1 });

  const hubX = vbW / 2;
  const hubY = vbH / 2;

  useEffect(() => {
    viewBoxAnimRef.current = {
      x: 0,
      y: 0,
      width: vbW,
      height: vbH,
    };
    setViewBox(`0 0 ${vbW} ${vbH}`);
  }, [vbW, vbH]);

  const handleSegmentClick = useCallback(
    (segment: WheelSegment) => {
      // 未ズーム時は、ラベルが無くても親（＝属するカテゴリー）があればズーム対象にする
      if (!zoomedCategory && (segment.name || segment.parent)) {
        let rootCategory = segment;
        while (rootCategory.depth > 1 && rootCategory.parent) {
          const parent = segments.find((s) => s.id === rootCategory.parent);
          if (!parent) break;
          rootCategory = parent;
        }

        setZoomedCategory(rootCategory.id);

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

        const angles = categorySegments
          .map((s) => {
            if (s.zoomAngleDeg !== undefined) return s.zoomAngleDeg;
            const match = s.textTransform.match(/rotate\(([-\d.]+)\)/);
            return match ? parseFloat(match[1]) : null;
          })
          .filter((a): a is number => a !== null);

        const zSize = zoomViewportSize;
        let centerX = hubX;
        let centerY = hubY;

        if (angles.length > 0) {
          // min/max の中点だと ±180° の境界をまたぐカテゴリーで反対側を向くため、
          // 単位ベクトルの合成（円環平均）で中心角を求める
          let sumX = 0;
          let sumY = 0;
          for (const a of angles) {
            const rad = (a * Math.PI) / 180;
            sumX += Math.cos(rad);
            sumY += Math.sin(rad);
          }
          if (Math.hypot(sumX, sumY) > 1e-6) {
            const centerRad = Math.atan2(sumY, sumX);
            centerX = hubX + Math.cos(centerRad) * zoomFocusRadius;
            const sy = flipRadialY ? -1 : 1;
            centerY = hubY + sy * Math.sin(centerRad) * zoomFocusRadius;
          }
        }

        const targetX = centerX - zSize / 2;
        const targetY = centerY - zSize / 2;

        gsap.to(viewBoxAnimRef.current, {
          x: targetX,
          y: targetY,
          width: zSize,
          height: zSize,
          duration: 0.8,
          ease: "power2.inOut",
          onUpdate: () => {
            const vb = viewBoxAnimRef.current;
            setViewBox(`${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
          },
        });

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
      } else if (zoomedCategory && segment.name) {
        if (flavorIntegration && window.addFlavorFromWheel) {
          window.addFlavorFromWheel(segment.name);
        }
        onSelect?.(segment);
      }
    },
    [
      zoomedCategory,
      segments,
      hubX,
      hubY,
      zoomFocusRadius,
      zoomViewportSize,
      flavorIntegration,
      onSelect,
      flipRadialY,
    ],
  );

  const animateZoomOut = useCallback(() => {
    gsap.to(viewBoxAnimRef.current, {
      x: 0,
      y: 0,
      width: vbW,
      height: vbH,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: () => {
        const vb = viewBoxAnimRef.current;
        setViewBox(`${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
      },
    });

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
  }, [vbW, vbH]);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && zoomedCategory) {
        setZoomedCategory(null);
        animateZoomOut();
      }
    },
    [zoomedCategory, animateZoomOut],
  );

  const visibleSegments = segments;

  return (
    <div className={styles.wrapper}>
      <div className={styles["svg-container"]}>
        <svg
          width="100%"
          height="100%"
          viewBox={viewBox}
          onClick={handleBackgroundClick}
          className={zoomedCategory ? styles.svg : styles["svg-default"]}
        >
          {showHubCircle && !zoomedCategory && (
            <circle cx={hubX} cy={hubY} r={hubRadius} fill="white" />
          )}

          <g
            transform={`translate(${hubX},${hubY})${flipRadialY ? " scale(1,-1)" : ""}`}
            opacity={segmentOpacity}
          >
            {/* 1st パス: ウェッジ本体。テキストより先に全て描く */}
            {visibleSegments.map((segment) => {
              const isHovered = hoveredSegment === segment.id;
              const isCategory = segment.depth === 1;
              // ラベルがあるか、カテゴリーに辿れる（parent あり）ならクリック可能
              const interactive =
                Boolean(segment.name) || Boolean(segment.parent);

              return (
                <g key={segment.id} transform={segment.groupTransform}>
                  {/* pathLocalTransform はパスにだけ適用 */}
                  <g transform={pathLocalTransform}>
                    <path
                      d={segment.path}
                      fill={segment.color}
                      stroke={segmentOutline ? "white" : "none"}
                      strokeWidth={segmentOutline ? 2 : 0}
                      vectorEffect={
                        pathLocalTransform ? "non-scaling-stroke" : undefined
                      }
                      strokeLinejoin="miter"
                      opacity={isHovered ? 0.8 : 1}
                      style={{
                        pointerEvents: interactive ? "auto" : "none",
                      }}
                      className={`${styles.segment} ${isCategory ? styles["segment--category"] : styles["segment--subcategory"]}`}
                      onMouseEnter={() =>
                        interactive && setHoveredSegment(segment.id)
                      }
                      onMouseLeave={() =>
                        interactive && setHoveredSegment(null)
                      }
                      onClick={(ev) => {
                        if (!interactive) return;
                        ev.stopPropagation();
                        handleSegmentClick(segment);
                      }}
                    />
                  </g>
                </g>
              );
            })}
            {/* 2nd パス: ラベル。後から描くことでウェッジに隠れない */}
            {visibleSegments.map((segment) => {
              if (!segment.name) return null;
              const isCategory = segment.depth === 1;
              const textLocalToPath = segment.textUsesPathLocalCoords !== false;
              const textTf =
                segment.textTransform + (flipRadialY ? " scale(1,-1)" : "");
              // "\n" 区切りは複数行ラベル（ウェッジに収まらない語の折り返し）
              const lines = segment.name.split("\n");

              const textEl = (
                <text
                  textAnchor={segment.textAnchor}
                  dy=".2em"
                  transform={textTf}
                  fill={segment.textColor}
                  fillOpacity="1"
                  style={{ pointerEvents: "none" }}
                  className={`${styles["segment-text"]} ${isCategory ? styles["segment-text--category"] : styles["segment-text--subcategory"]}`}
                >
                  {lines.map((line, li) => (
                    <tspan
                      key={li}
                      x="0"
                      dy={
                        lines.length === 1
                          ? undefined
                          : li === 0
                            ? `-${((lines.length - 1) * 0.55).toFixed(2)}em`
                            : "1.1em"
                      }
                      className={
                        isCategory
                          ? styles["segment-text__span--category"]
                          : styles["segment-text__span--subcategory"]
                      }
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              );

              return textLocalToPath ? (
                <g
                  key={`label-${segment.id}`}
                  transform={segment.groupTransform}
                >
                  {textEl}
                </g>
              ) : (
                <React.Fragment key={`label-${segment.id}`}>
                  {textEl}
                </React.Fragment>
              );
            })}
          </g>
        </svg>
      </div>

      <div className={styles.footer}>
        {zoomedCategory ? footerZoomed : footerIdle}
      </div>
    </div>
  );
}

export function ZoomableFlavorWheel({
  segments,
}: {
  segments: WheelSegment[];
}) {
  return (
    <ZoomableWheel
      segments={segments}
      footerIdle="カテゴリーをクリックして拡大表示"
      footerZoomed="具体的なフレーバーをクリックして選択"
      flavorIntegration
    />
  );
}
