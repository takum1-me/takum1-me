/**
 * ヘッダー・フッター・SNS リンクで共有するサイト内外のリンク。
 * 並び順はそのまま画面の並び順になる。
 */

export const NAV_ITEMS = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Works", href: "/works" },
  { label: "Lab", href: "/lab" },
  { label: "Beans", href: "/beans" },
] as const;

export type SnsVariant = "twitter" | "instagram" | "github";

export const SNS_LINKS: {
  name: string;
  /** グリッド内で文字だけで並べるときの短い表記 */
  short: string;
  href: string;
  variant: SnsVariant;
}[] = [
  {
    name: "X (Twitter)",
    short: "X",
    href: "https://twitter.com/takum1_me",
    variant: "twitter",
  },
  {
    name: "Instagram",
    short: "Instagram",
    href: "https://instagram.com/takum1_me",
    variant: "instagram",
  },
  {
    name: "GitHub",
    short: "GitHub",
    href: "https://github.com/takum1-me",
    variant: "github",
  },
];
