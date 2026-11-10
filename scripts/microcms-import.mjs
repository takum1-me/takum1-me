/**
 * microCMS へ JSON からコンテンツを入れる / microCMS から JSON に書き出す。
 *
 *   書き出す（編集のたたき台を作る）:
 *     npm run microcms -- export beans-list > beans.json
 *
 *   入れる（既定は dry-run。何をするかを表示するだけで書き込まない）:
 *     npm run microcms -- import beans-list beans.json
 *     npm run microcms -- import beans-list beans.json --apply
 *     npm run microcms -- import beans-list beans.json --apply --draft
 *
 *   --service main を付けると takum1（ブログなど）側を対象にする。既定は coffee。
 *
 * JSON は「オブジェクトの配列」。1 件ごとに:
 *   - id あり・microCMS に既にある → PATCH（書いたフィールドだけ更新）
 *   - id あり・まだ無い             → PUT（その id で作成）
 *   - id なし                       → POST（id は microCMS が振る）
 * createdAt / updatedAt / publishedAt / revisedAt は書き込めないので捨てる。
 * export の出力をそのまま import に戻せる。
 *
 * キー:
 *   MICROCMS_COFFEE_API_KEY        … 既存チェックと export（GET）。サイト表示と同じキー
 *   MICROCMS_COFFEE_WRITE_API_KEY  … POST / PUT / PATCH 用（任意）
 * 無料プランではキーを 1 本しか作れないので、WRITE が未設定なら読み取りキーで書き込む
 * （そのキーに POST / PUT / PATCH の権限を付けておく）。キーはビルド時の .astro フロントマター
 * でしか使っておらず dist/ には出ないが、書き込める以上 PUBLIC_ を付けたりクライアントに渡したりしない。
 *
 * 注意:
 *   - 下書きだけの（一度も公開していない）コンテンツは読み取りキーの GET で 404 になるため
 *     「新規」と判定され、PUT が「既にある」で失敗する。その場合は id を変えるか管理画面で直す。
 *   - 画像フィールドはコンテンツ API では上げられない（マネジメント API が必要）。このスクリプトの対象外。
 */

const SERVICES = {
  coffee: {
    url: "MICROCMS_COFFEE_API_URL",
    readKey: "MICROCMS_COFFEE_API_KEY",
    writeKey: "MICROCMS_COFFEE_WRITE_API_KEY",
  },
  main: {
    url: "MICROCMS_API_URL",
    readKey: "MICROCMS_API_KEY",
    writeKey: "MICROCMS_WRITE_API_KEY",
  },
};

/** 書き込みでは受け付けられないシステムフィールド */
const SYSTEM_FIELDS = ["createdAt", "updatedAt", "publishedAt", "revisedAt"];

/**
 * セレクトフィールドは書き込み時に配列で渡す必要がある。
 * 手書きの JSON で "medium" のように単一値を書いても通るよう、既知の API だけ配列に包む。
 */
const SELECT_FIELDS = {
  "beans-list": ["roastLevel", "process", "country", "genre", "variety"],
};

/** 連続で書き込むときの間隔（API の流量制限に当たらないように） */
const WRITE_INTERVAL_MS = 300;

function usage(message) {
  if (message) console.error(`エラー: ${message}\n`);
  console.error(
    [
      "使い方:",
      "  npm run microcms -- export <endpoint> [--service coffee|main]",
      "  npm run microcms -- import <endpoint> <file.json> [--apply] [--draft] [--service coffee|main]",
    ].join("\n"),
  );
  process.exit(1);
}

function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  let service = "coffee";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--service") {
      service = argv[++i];
    } else if (arg.startsWith("--")) {
      flags.add(arg);
    } else {
      positional.push(arg);
    }
  }
  const unknown = [...flags].filter((f) => !["--apply", "--draft"].includes(f));
  if (unknown.length > 0)
    usage(`知らないオプションです: ${unknown.join(", ")}`);
  if (!SERVICES[service]) usage(`--service は coffee か main です: ${service}`);
  const [command, endpoint, file] = positional;
  return {
    command,
    endpoint,
    file,
    service,
    apply: flags.has("--apply"),
    draft: flags.has("--draft"),
  };
}

function env(name, { required = true } = {}) {
  const value = process.env[name];
  if (!value && required) {
    usage(`${name} が未設定です（.env を確認してください）`);
  }
  return value;
}

function createClient(serviceName, { needsWrite }) {
  const service = SERVICES[serviceName];
  const base = env(service.url).replace(/\/?$/, "/");
  const readKey = env(service.readKey);
  const writeKey = env(service.writeKey, { required: false }) ?? readKey;
  if (needsWrite && writeKey === readKey) {
    console.error(
      `(${service.writeKey} が未設定なので ${service.readKey} で書き込みます)`,
    );
  }

  async function request(method, path, { body, key } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        "X-MICROCMS-API-KEY": key,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  return {
    get: (path) => request("GET", path, { key: readKey }),
    write: (method, path, body) =>
      request(method, path, { body, key: writeKey }),
  };
}

async function exportAll(client, endpoint) {
  const all = [];
  const limit = 100;
  let total = Infinity;
  for (let offset = 0; offset < total; offset += limit) {
    const res = await client.get(`${endpoint}?limit=${limit}&offset=${offset}`);
    if (!res.ok) {
      throw new Error(
        `${endpoint} の取得に失敗しました: ${res.status} ${res.text}`,
      );
    }
    const page = JSON.parse(res.text);
    total = page.totalCount;
    all.push(...page.contents);
  }
  return all;
}

/** 書き込み用に 1 件を整える（id とシステムフィールドを外し、セレクトを配列にする） */
function toPayload(endpoint, item) {
  const { id: _id, ...rest } = item;
  for (const field of SYSTEM_FIELDS) delete rest[field];
  for (const field of SELECT_FIELDS[endpoint] ?? []) {
    const value = rest[field];
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      rest[field] = [value];
    }
  }
  return rest;
}

/** 既存の値と比べて、実際に変わるフィールドだけを返す（PATCH の差分表示用） */
function changedFields(current, payload) {
  return Object.keys(payload).filter(
    (key) => JSON.stringify(current[key]) !== JSON.stringify(payload[key]),
  );
}

async function importAll(client, { endpoint, items, apply, draft }) {
  const statusQuery = draft ? "?status=draft" : "";
  const summary = { create: 0, update: 0, unchanged: 0, failed: 0 };

  for (const [index, item] of items.entries()) {
    const label = item.name ?? item.title ?? item.id ?? `#${index + 1}`;
    const payload = toPayload(endpoint, item);

    let plan;
    if (!item.id) {
      plan = { method: "POST", path: `${endpoint}${statusQuery}` };
    } else {
      const id = encodeURIComponent(item.id);
      const existing = await client.get(`${endpoint}/${id}`);
      if (existing.status === 404) {
        plan = { method: "PUT", path: `${endpoint}/${id}${statusQuery}` };
      } else if (existing.ok) {
        const fields = changedFields(JSON.parse(existing.text), payload);
        if (fields.length === 0) {
          console.log(`= ${label}: 変更なし`);
          summary.unchanged++;
          continue;
        }
        plan = { method: "PATCH", path: `${endpoint}/${id}`, fields };
      } else {
        console.error(
          `! ${label}: 既存チェックに失敗 ${existing.status} ${existing.text}`,
        );
        summary.failed++;
        continue;
      }
    }

    const detail = plan.fields ? `（${plan.fields.join(", ")}）` : "";
    const verb = plan.method === "PATCH" ? "更新" : "作成";
    console.log(
      `${apply ? "→" : "·"} ${label}: ${verb} ${plan.method}${detail}`,
    );

    if (!apply) {
      summary[plan.method === "PATCH" ? "update" : "create"]++;
      continue;
    }

    const body = plan.fields
      ? Object.fromEntries(plan.fields.map((key) => [key, payload[key]]))
      : payload;
    const res = await client.write(plan.method, plan.path, body);
    if (res.ok) {
      const created = res.text ? JSON.parse(res.text).id : undefined;
      if (plan.method === "POST" && created) console.log(`  id: ${created}`);
      summary[plan.method === "PATCH" ? "update" : "create"]++;
    } else {
      console.error(`  失敗: ${res.status} ${res.text}`);
      summary.failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, WRITE_INTERVAL_MS));
  }

  console.log(
    `\n${apply ? "結果" : "dry-run（--apply で書き込みます）"}: ` +
      `作成 ${summary.create} / 更新 ${summary.update} / 変更なし ${summary.unchanged} / 失敗 ${summary.failed}`,
  );
  if (summary.failed > 0) process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.endpoint) usage("endpoint を指定してください");

  if (args.command === "export") {
    const client = createClient(args.service, { needsWrite: false });
    const items = await exportAll(client, args.endpoint);
    process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
    console.error(`${items.length} 件を書き出しました`);
    return;
  }

  if (args.command === "import") {
    if (!args.file) usage("JSON ファイルを指定してください");
    const { readFile } = await import("node:fs/promises");
    const items = JSON.parse(await readFile(args.file, "utf8"));
    if (!Array.isArray(items)) usage("JSON はオブジェクトの配列にしてください");
    const client = createClient(args.service, { needsWrite: args.apply });
    await importAll(client, { ...args, items });
    return;
  }

  usage(`知らないコマンドです: ${args.command ?? "（なし）"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
