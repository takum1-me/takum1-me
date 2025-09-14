// コーヒー用語リスト
export const coffeeWords = [
  // 産地・国名
  "ETHIOPIA",
  "COLOMBIA", 
  "GUATEMALA",
  "BRAZIL",
  "KENYA",
  "COSTA RICA",
  "JAMAICA",
  "YEMEN",
  "INDONESIA",
  "VIETNAM",
  
  // 焙煎度
  "LIGHT ROAST",
  "MEDIUM ROAST", 
  "DARK ROAST",
  "FRENCH ROAST",
  "CINNAMON ROAST",
  "CITY ROAST",
  "FULL CITY ROAST",
  "VIENNA ROAST",
  
  // 品種
  "ARABICA",
  "ROBUSTA",
  "GEISHA",
  "TYPICA",
  "BOURBON",
  "CATURRA",
  "PACAMARA",
  "MARAGOGYPE",
  
  // 飲み物・抽出方法
  "ESPRESSO",
  "CAPPUCCINO", 
  "LATTE",
  "AMERICANO",
  "MACCHIATO",
  "MOCHA",
  "COLD BREW",
  "DRIP",
  "FRENCH PRESS",
  "AEROPRESS",
  "V60",
  "CHEMEX",
  "SIPHON",
  
  // 味・香り
  "CHOCOLATE",
  "CARAMEL",
  "NUTTY",
  "FRUITY",
  "FLORAL",
  "CITRUS",
  "BERRY",
  "SPICE",
  "WOODY",
  "SMOKY",
  
  // プロセス
  "WASHED",
  "NATURAL",
  "HONEY",
  "FERMENTED",
  "CARBONIC MACERATION",
  "ANAEROBIC",
  
  // その他
  "ORGANIC",
  "FAIR TRADE",
  "SINGLE ORIGIN",
  "BLEND",
  "MICRO LOT",
  "CUP OF EXCELLENCE"
] as const;

// ランダムに選択する関数
export const getRandomCoffeeWords = (count: number = 20): string[] => {
  const shuffled = [...coffeeWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// ランダムな色付きのコーヒー用語を返す関数
export const getRandomColoredCoffeeWords = (count: number = 20): Array<{word: string, color: string}> => {
  const shuffled = [...coffeeWords].sort(() => Math.random() - 0.5);
  const selectedWords = shuffled.slice(0, count);
  
  // コーヒーらしい色のパレット
  const colors = [
    '#8B4513', // サドルブラウン
    '#A0522D', // シエナ
    '#CD853F', // ペルー
    '#D2691E', // チョコレート
    '#DEB887', // バーリーウッド
    '#F4A460', // サンディブラウン
    '#8B7355', // カーキブラウン
    '#A0522D', // シエナ
    '#654321', // ダークブラウン
    '#6F4E37', // コーヒーブラウン
    '#3C2414', // エスプレッソブラウン
    '#2F1B14', // ダークロースト
  ];
  
  return selectedWords.map(word => ({
    word,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
};
