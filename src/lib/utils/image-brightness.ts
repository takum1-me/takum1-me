/**
 * 画像の明度を計算するユーティリティ関数
 */

/**
 * 画像の明度を計算する関数（軽量化版）
 * @param imageUrl 画像のURL
 * @returns 明度（0-1の範囲）
 */
export const calculateImageBrightness = (imageUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    // 同じオリジンかどうかをチェック
    let isSameOrigin = false;
    try {
      const imageUrlObj = new URL(imageUrl, window.location.href);
      isSameOrigin = imageUrlObj.origin === window.location.origin;
    } catch {
      // URLの解析に失敗した場合は外部画像として扱う
      isSameOrigin = false;
    }

    // 外部画像の場合は明度計算をスキップしてデフォルト値を返す（CORSエラーを回避）
    if (!isSameOrigin) {
      resolve(0.5);
      return;
    }

    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(0.5); // デフォルト値
          return;
        }

        // パフォーマンス改善：画像サイズを縮小して計算
        const maxSize = 100;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // サンプリング：全てのピクセルではなく一部をサンプリング
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const step = Math.max(1, Math.floor(data.length / 4 / 100)); // 100ピクセル程度サンプリング

        let totalBrightness = 0;
        let sampleCount = 0;

        for (let i = 0; i < data.length; i += step * 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // 明度を計算（0-1の範囲）
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          totalBrightness += brightness;
          sampleCount++;
        }

        const averageBrightness = totalBrightness / sampleCount;
        resolve(averageBrightness);
      } catch (error) {
        // Canvas操作でエラーが発生した場合はデフォルト値を返す
        resolve(0.5);
      }
    };

    img.onerror = () => {
      // エラー時はデフォルト値
      resolve(0.5);
    };

    img.src = imageUrl;
  });
};

