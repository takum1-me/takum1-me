import { coffeeFlavors } from "../../../data/coffee-flavor";
import type { CoffeeFlavor as CoffeeFlavorType } from "../../../data/coffee-flavor";

interface CoffeeFlavorTagProps {
  flavorName: string;
}

export default function CoffeeFlavorTag({ flavorName }: CoffeeFlavorTagProps) {
  // フレーバー名に一致する色を検索
  const flavorData = coffeeFlavors.find(
    (flavor: CoffeeFlavorType) => flavor.flavor === flavorName,
  );

  // 色が見つからない場合はデフォルト色を使用
  const originalColor = flavorData?.color || "#8b7355";
  const color = addOpacity(originalColor, 0.8);

  return (
    <span
      className="flavor-tag"
      style={{
        borderColor: color,
        color: color,
      }}
    >
      {flavorName}
    </span>
  );
}

// 透明度を追加する関数
function addOpacity(hexColor: string, opacity: number): string {
  // ヘックスカラーをRGBに変換
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
