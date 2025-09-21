import { coffeeFlavors } from "../../data/coffee-flavor";
import type { CoffeeFlavor as CoffeeFlavorType } from "../../data/coffee-flavor";

interface CoffeeFlavorTagProps {
  flavorName: string;
}

export default function CoffeeFlavorTag({ flavorName }: CoffeeFlavorTagProps) {
  // フレーバー名に一致する色を検索
  const flavorData = coffeeFlavors.find(
    (flavor: CoffeeFlavorType) => flavor.flavor === flavorName,
  );

  // 色が見つからない場合はデフォルト色を使用
  const color = flavorData?.color || "#8b7355";

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

