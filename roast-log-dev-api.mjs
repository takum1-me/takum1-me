import fs from "node:fs/promises";
import path from "node:path";

/**
 * /beans/logs/upload から src/data/roast-logs/ へ直接書き込むための、
 * 開発サーバー限定のエンドポイント（POST /__roast-logs）。
 *
 * 静的サイトなので本番にはサーバーが無い。`apply: "serve"` を付けて
 * dev でしか登録されないようにしてあり、ビルド成果物には一切入らない。
 *
 * ブラウザからのリクエストでファイルを書くので、受け付ける範囲を絞る:
 *   - POST のみ
 *   - ファイル名は `<バッチ ID>.klog` か `index.json` だけ
 *   - 解決後のパスが roast-logs ディレクトリの外に出たら拒否
 */

/** 受け付けるファイル名。バッチ ID は「8 桁の日付 - 英数字」 */
const KLOG_NAME = /^\d{8}-[A-Za-z0-9]+\.klog$/;
const MANIFEST_NAME = "index.json";

/** 1 リクエストの上限（.klog は 1 件 60KB ほど） */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const TARGET_DIR = "src/data/roast-logs";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("リクエストが大きすぎます"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * @param {string} rootDir リポジトリのルート
 * @returns {import("vite").Plugin}
 */
export function roastLogDevApi(rootDir) {
  const dir = path.resolve(rootDir, TARGET_DIR);

  return {
    name: "roast-log-dev-api",
    // dev サーバーでのみ有効。build には含まれない
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__roast-logs", async (req, res) => {
        const send = (status, payload) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
        };

        if (req.method !== "POST") return send(405, { error: "POST のみです" });

        try {
          const body = JSON.parse(await readBody(req));
          const files = Array.isArray(body.files) ? body.files : [];
          if (files.length === 0) return send(400, { error: "files が空です" });

          const written = [];
          for (const file of files) {
            const name = String(file?.name ?? "");
            if (name !== MANIFEST_NAME && !KLOG_NAME.test(name)) {
              return send(400, {
                error: `書き込めないファイル名です: ${name}`,
              });
            }
            // ディレクトリの外に出る名前（"../" など）を弾く
            const target = path.resolve(dir, name);
            if (target !== path.join(dir, name)) {
              return send(400, { error: `不正なパスです: ${name}` });
            }
            if (typeof file.text !== "string") {
              return send(400, {
                error: `${name} の中身が文字列ではありません`,
              });
            }
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(target, file.text, "utf8");
            written.push(name);
          }

          send(200, { written, dir: TARGET_DIR });
        } catch (error) {
          send(500, {
            error: error instanceof Error ? error.message : "失敗しました",
          });
        }
      });
    },
  };
}
