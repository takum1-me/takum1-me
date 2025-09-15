// 最近思った一言のデータ
export interface Thought {
  id: string;
  content: string;
  date: string;
}

// JSONファイルからデータを読み込み
import thoughtsData from './thoughts.json';

// idを自動生成してThought配列を作成
export const thoughts: Thought[] = thoughtsData.map((thought, index) => ({
  id: (index + 1).toString(),
  ...thought
}));

// 最新の一言を取得（配列の最初の要素）
export function getCurrentThought(): Thought | null {
  return thoughts.length > 0 ? thoughts[0] : null;
}

// 一言を更新
export function updateThought(id: string, content: string): void {
  const thought = thoughts.find(t => t.id === id);
  if (thought) {
    thought.content = content;
    thought.date = new Date().toISOString().split('T')[0];
  }
}

// 新しい一言を追加（配列の最初に追加）
export function addThought(content: string): void {
  const newThought: Thought = {
    id: (thoughts.length + 1).toString(),
    content,
    date: new Date().toISOString().split('T')[0]
  };
  
  thoughts.unshift(newThought); // 配列の最初に追加
}
