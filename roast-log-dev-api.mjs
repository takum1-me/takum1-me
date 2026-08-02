import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * /beans/logs/upload から src/data/roast-logs/ へ直接書き込むための、
 * 開発サーバー限定のエンドポイント（POST /__roast-logs）。
 * `commit: true` なら、書いたあとに commit と push まで走らせる。
 *
 * 静的サイトなので本番にはサーバーが無い。`apply: "serve"` を付けて
 * dev でしか登録されないようにしてあり、ビルド成果物には一切入らない。
 *
 * ブラウザからのリクエストでファイルを書いて push まで行くので、
 * 受け付ける範囲を絞る:
 *   - POST のみ
 *   - ファイル名は `<バッチ ID>.klog` か `index.json` だけ
 *   - 解決後のパスが roast-logs ディレクトリの外に出たら拒否
 *   - stage するのは roast-logs ディレクトリだけ（`git add -A` はしない）
 *   - git はシェルを介さず execFile で呼ぶ
 */

/** 受け付けるファイル名。バッチ ID は「ログ番号 - 8 桁の焙煎日」 */
const KLOG_NAME = /^\d{4,}-\d{8}\.klog$/;
const MANIFEST_NAME = "index.json";

/** 1 リクエストの上限（.klog は 1 件 60KB ほど） */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const TARGET_DIR = "src/data/roast-logs";

/**
 * 直近の実行結果。
 * ファイルを書くと Vite がページを読み直すので、commit / push（10 秒ほど
 * かかる）のレスポンスはたいてい受け取れない。そこでサーバー側に残しておき、
 * 読み直したあとの画面が GET で取りに来られるようにする。
 */
let lastRun = null;

/**
 * 書いたログを commit して push する。
 * stage するのは roast-logs ディレクトリだけなので、作業中の他の変更は巻き込まない。
 *
 * @param {string} cwd リポジトリのルート
 * @param {string[]} written 書き込んだファイル名
 */
async function commitAndPush(cwd, written) {
  const git = (...args) => run("git", args, { cwd, encoding: "utf8" });

  const branch = (await git("rev-parse", "--abbrev-ref", "HEAD")).stdout.trim();

  // 対象ディレクトリだけを stage する
  await git("add", "--", TARGET_DIR);

  // 中身が変わっていなければ commit するものが無い
  const staged = (await git("diff", "--cached", "--name-only")).stdout.trim();
  if (staged === "") {
    return { branch, committed: false, pushed: false, detail: "変更なし" };
  }

  const batches = written
    .filter((name) => name.endsWith(".klog"))
    .map((name) => name.replace(/\.klog$/, ""));
  const subject =
    batches.length > 0
      ? `data(beans): 焙煎ログ ${batches.join(", ")} を追加する`
      : "data(beans): 焙煎ログのメタデータを更新する";

  await git("commit", "-m", subject);
  const sha = (await git("rev-parse", "--short", "HEAD")).stdout.trim();

  // upstream があればそのまま、無ければ -u で作る
  let hasUpstream = true;
  try {
    await git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
  } catch {
    hasUpstream = false;
  }

  try {
    if (hasUpstream) await git("push");
    else await git("push", "-u", "origin", branch);
  } catch (error) {
    // commit は済んでいるので、push だけ失敗したことが分かるように返す
    return {
      branch,
      committed: true,
      sha,
      subject,
      pushed: false,
      detail: `push に失敗: ${error instanceof Error ? error.message.split("\n")[0] : "不明"}`,
    };
  }

  return { branch, committed: true, sha, subject, pushed: true };
}

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

        // 読み直し後に結果を拾いに来るための口
        if (req.method === "GET") return send(200, { last: lastRun });
        if (req.method !== "POST") return send(405, { error: "POST のみです" });

        lastRun = { at: Date.now(), state: "running" };
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

          const git = body.commit
            ? await commitAndPush(rootDir, written)
            : undefined;
          lastRun = {
            at: Date.now(),
            state: "done",
            written,
            dir: TARGET_DIR,
            git,
          };
          send(200, lastRun);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "失敗しました";
          lastRun = { at: Date.now(), state: "error", error: message };
          send(500, { error: message });
        }
      });
    },
  };
}
