export interface CoffeeEquipment {
  name: string;
}

export interface CoffeePreference {
  name: string;
}

export interface Interest {
  name: string;
}


export interface CoffeeSection {
  title: string;
  description: string;
  equipment: CoffeeEquipment[];
  preferences: CoffeePreference[];
}

export interface OtherInterests {
  title: string;
  interests: Interest[];
}

export interface AboutData {
  coffee: CoffeeSection;
  otherInterests: OtherInterests;
}

export const aboutData: AboutData = {
  coffee: {
    title: "コーヒー",
    description: "ドリップにはCT62やbeandy silkを使用しています。ローストにも挑戦しており、特に浅煎りが好きです。",
    equipment: [
      { name: "CT62" },
      { name: "beandy silk" }
    ],
    preferences: [
      { name: "コロンビア" },
      { name: "Chiroso" },
      { name: "その他様々な品種を探索中..." }
    ]
  },
  otherInterests: {
    title: "その他の関心分野",
    interests: [
      { name: "Design / UX" },
      { name: "キャッチコピー / 広告" },
      { name: "美術・読書" },
      { name: "旅行" }
    ]
  }
};
