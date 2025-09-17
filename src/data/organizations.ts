export interface Organization {
  name: string;
  url: string;
  period: string;
  role?: string;
}

export const organizations: Organization[] = [
  {
    name: "筑波大学情報学群情報科学類",
    url: "https://www.coins.tsukuba.ac.jp/",
    period: "2022年4月〜"
  },
  {
    name: "全学学類・専門学群・総合学域群代表者会議",
    url: "https://www.zdk.tsukuba.ac.jp/",
    period: "2023年4月〜",
    role: "議長（2024年5月〜2025年3月）"
  },
  {
    name: "情報科学類 クラス代表者会議",
    url: "https://www.coins.tsukuba.ac.jp/~class/",
    period: "2022年4月〜",
    role: "議長（2023年4月〜2025年3月）"
  },
  {
    name: "珈琲・俺",
    url: "https://cafeore.cafe/",
    period: "2023年6月〜",
    role: "総務局長（2024年1月〜2024年12月）"
  }
];
