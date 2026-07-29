/**
 * microCMS のセレクト値（内部 ID）→ 画面表示用ラベル。
 * 未知の ID は startCase でそれっぽく整形してフォールバックする。
 */

export const COUNTRY_LABELS: Record<string, { label: string; flag: string }> = {
  kenya: { label: "Kenya", flag: "🇰🇪" },
  ethiopia: { label: "Ethiopia", flag: "🇪🇹" },
  colombia: { label: "Colombia", flag: "🇨🇴" },
  brazil: { label: "Brazil", flag: "🇧🇷" },
  guatemala: { label: "Guatemala", flag: "🇬🇹" },
  panama: { label: "Panama", flag: "🇵🇦" },
  costarica: { label: "Costa Rica", flag: "🇨🇷" },
  rwanda: { label: "Rwanda", flag: "🇷🇼" },
  indonesia: { label: "Indonesia", flag: "🇮🇩" },
  honduras: { label: "Honduras", flag: "🇭🇳" },
  elsalvador: { label: "El Salvador", flag: "🇸🇻" },
  peru: { label: "Peru", flag: "🇵🇪" },
  bolivia: { label: "Bolivia", flag: "🇧🇴" },
  yemen: { label: "Yemen", flag: "🇾🇪" },
  tanzania: { label: "Tanzania", flag: "🇹🇿" },
  burundi: { label: "Burundi", flag: "🇧🇮" },
};

export const PROCESS_LABELS: Record<string, string> = {
  washed: "Washed",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaerobic",
  carbonic: "Carbonic Maceration",
  pulpednatural: "Pulped Natural",
  wetHulled: "Wet Hulled",
  wethulled: "Wet Hulled",
};

export const ROAST_LABELS: Record<string, string> = {
  light: "Light",
  mediumlight: "Medium Light",
  "medium-light": "Medium Light",
  medium: "Medium",
  mediumdark: "Medium Dark",
  "medium-dark": "Medium Dark",
  dark: "Dark",
};

export const GENRE_LABELS: Record<string, string> = {
  singleOrigin: "Single Origin",
  singleorigin: "Single Origin",
  blend: "Blend",
  microlot: "Micro Lot",
  decaf: "Decaf",
};

export const VARIETY_LABELS: Record<string, string> = {
  sl28: "SL28",
  sl34: "SL34",
  batian: "Batian",
  ruilu11: "Ruiru 11",
  ruiru11: "Ruiru 11",
  bourbon: "Bourbon",
  typica: "Typica",
  geisha: "Geisha",
  gesha: "Gesha",
  caturra: "Caturra",
  catuai: "Catuai",
  pacamara: "Pacamara",
  heirloom: "Heirloom",
};

/** "singleOrigin" / "medium-dark" → "Single Origin" / "Medium Dark" */
function startCase(id: string): string {
  return id
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function lookup(map: Record<string, string>, id: string): string {
  return map[id] ?? map[id.toLowerCase()] ?? startCase(id);
}

export const roastLabel = (id: string) => lookup(ROAST_LABELS, id);
export const processLabel = (id: string) => lookup(PROCESS_LABELS, id);
export const genreLabel = (id: string) => lookup(GENRE_LABELS, id);
export const varietyLabel = (id: string) => lookup(VARIETY_LABELS, id);

export function countryLabel(id: string): { label: string; flag: string } {
  return (
    COUNTRY_LABELS[id] ??
    COUNTRY_LABELS[id.toLowerCase()] ?? { label: startCase(id), flag: "🌍" }
  );
}
