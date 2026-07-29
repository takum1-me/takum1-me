/** Flavor / Character などインタラクティブホイール共通のセグメント型 */
export interface WheelSegment {
  id: string;
  path: string;
  color: string;
  /** 空ならパスのみ描画（ホバー・クリック対象外にできる） */
  name: string;
  depth: number;
  parent?: string;
  textTransform: string;
  textAnchor: "start" | "middle" | "end";
  textColor: string;
  /** PDF→SVG 変換後の基点からハブへの平行移動（ローカル path とセット） */
  groupTransform?: string;
  /** SVGPDF 由来ホイールのズーム扇方向（°）。指定時は textTransform の rotate より優先 */
  zoomAngleDeg?: number;
  /**
   * false のとき textTransform はハブ中心まで translate(hub) した直後の座標（ウェッジの groupTransform と無関係）。
   * LENGTH の SHORT / MEDIUM / LONG のようにラベルだけ外弧側にある場合に使う。
   */
  textUsesPathLocalCoords?: boolean;
}
