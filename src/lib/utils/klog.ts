/**
 * Kaffelogic の焙煎ログ（`.klog`）のパーサと指標計算。
 *
 * ファイルは次の 4 ブロックでできている（ファームウェア 7.20.6 のログで確認）。
 *   1. `key:value` のヘッダ（profile_short_name / roast_date / model など）
 *   2. `offsets` 行（列ごとの表示補正値。タブ区切りで列見出しと桁が揃う）
 *   3. タブ区切りの列見出し（`time` から始まる）
 *   4. データ行と、途中に挟まる `!event:value` 行
 *
 * 空行は区切りとして使えない（ヘッダ内にも出る）ので、`offsets` 行と列見出し行を
 * 境界として状態遷移する。DOM も node:fs も使わないので、ビルド時とブラウザの
 * 両方から読める（アップロードツールが後者）。
 *
 * 実装は kaffelogic-2（packages/core/src/klog）の移植。
 */

/** 列見出しの接頭辞の意味 */
export interface KlogColumn {
  /** 接頭辞を落とした列名（例: "temp", "actual_fan_RPM"） */
  name: string;
  /** 既定で非表示（`#`） */
  hidden: boolean;
  /** 温度軸に載せる（`=`） */
  tempAxis: boolean;
  /** 温度軸に合わせて縮尺する（`^`。ファン RPM など） */
  scaled: boolean;
  /** `offsets` 行のこの列の値 */
  offset?: number;
  data: number[];
}

/**
 * データ中に挟まる `!name:value`。
 * 値の形で 3 種に分ける（日付や理由コードを parseFloat すると
 * 黙って誤った数値になるため、数値でないものは text に寄せる）。
 */
export type KlogEvent =
  | { name: string; kind: "time"; value: number; rawValue: string }
  | { name: string; kind: "scalar"; value: number; rawValue: string }
  | { name: string; kind: "text"; rawValue: string };

/** 値が経過秒であるイベント名 */
const TIME_EVENT_NAMES = new Set([
  "colour_change",
  "first_crack",
  "second_crack",
  "second_crack_end",
  "roast_end",
]);

export interface KlogLog {
  /** ヘッダの `key:value`（重複キーは最初の 1 つ） */
  header: Record<string, string>;
  columns: KlogColumn[];
  events: KlogEvent[];
  warnings: string[];
}

/** 列見出しのトークンから接頭辞を剥がす */
function parseColumnHeader(token: string): Omit<KlogColumn, "offset" | "data"> {
  let i = 0;
  let hidden = false;
  let tempAxis = false;
  let scaled = false;
  while (i < token.length) {
    const ch = token[i];
    if (ch === "#") hidden = true;
    else if (ch === "=") tempAxis = true;
    else if (ch === "^") scaled = true;
    else break;
    i += 1;
  }
  return { name: token.slice(i), hidden, tempAxis, scaled };
}

/** `.klog` 本文をパースする。列見出しが見つからなければ null */
export function parseKlog(text: string): KlogLog | null {
  const header: Record<string, string> = {};
  const events: KlogEvent[] = [];
  const warnings: string[] = [];
  let offsets: number[] = [];
  let specs: Omit<KlogColumn, "offset" | "data">[] = [];
  let colData: number[][] = [];
  let state: "header" | "columns" | "data" = "header";

  for (const line of text.split("\n")) {
    if (state === "header") {
      if (line === "offsets" || line.startsWith("offsets\t")) {
        // 列見出し行とトークン位置が揃う（0 番は "offsets" ラベル → NaN）
        offsets = line.split("\t").map((s) => Number.parseFloat(s));
        state = "columns";
        continue;
      }
      if (line.length === 0) continue;
      const colon = line.indexOf(":");
      // 値にコロンが入る行（mains_voltage など）があるので最初のコロンだけで割る
      if (colon === -1) continue;
      const key = line.slice(0, colon);
      if (!(key in header)) header[key] = line.slice(colon + 1);
      continue;
    }

    if (state === "columns") {
      // `offsets` の直後に区切りの空行を入れる書き出しがあるので、
      // 実際の `time` 行が来るまで待つ
      if (line.length === 0) continue;
      const tokens = line.split("\t");
      if (parseColumnHeader(tokens[0] ?? "").name !== "time") {
        warnings.push(
          `列見出しとして扱えない行を飛ばした: ${line.slice(0, 40)}`,
        );
        continue;
      }
      specs = tokens.map(parseColumnHeader);
      colData = specs.map(() => []);
      state = "data";
      continue;
    }

    if (line.length === 0) continue;

    if (line[0] === "!") {
      const rest = line.slice(1);
      const colon = rest.indexOf(":");
      const name = colon === -1 ? rest : rest.slice(0, colon);
      const rawValue = colon === -1 ? "" : rest.slice(colon + 1);
      const num = Number.parseFloat(rawValue);
      const numeric =
        rawValue.length > 0 &&
        !Number.isNaN(num) &&
        /^[\s\d.+-]+$/.test(rawValue);
      if (!numeric) events.push({ name, kind: "text", rawValue });
      else if (TIME_EVENT_NAMES.has(name))
        events.push({ name, kind: "time", value: num, rawValue });
      else events.push({ name, kind: "scalar", value: num, rawValue });
      continue;
    }

    const first = line[0] ?? "";
    if ((first >= "0" && first <= "9") || first === "-" || first === ".") {
      const fields = line.split("\t");
      for (let c = 0; c < specs.length; c += 1) {
        const raw = fields[c];
        colData[c]?.push(
          raw === undefined || raw === "" ? NaN : Number.parseFloat(raw),
        );
      }
      continue;
    }
    warnings.push(`データ行として扱えない行を飛ばした: ${line.slice(0, 40)}`);
  }

  if (specs.length === 0) return null;

  const columns: KlogColumn[] = specs.map((spec, i) => ({
    ...spec,
    offset:
      i < offsets.length && !Number.isNaN(offsets[i]) ? offsets[i] : undefined,
    data: colData[i] ?? [],
  }));

  return { header, columns, events, warnings };
}

/** 列名で系列を引く */
export function series(log: KlogLog, name: string): number[] | undefined {
  return log.columns.find((c) => c.name === name)?.data;
}

/** 時間列（先頭列） */
export function timeSeries(log: KlogLog): number[] {
  return log.columns[0]?.data ?? [];
}

export interface RoastMetrics {
  /** 色変化（秒） */
  colourChangeSec?: number;
  /** 1 ハゼ（秒） */
  firstCrackSec?: number;
  /** 焙煎終了（秒） */
  roastEndSec?: number;
  /** デベロップメント率（%） */
  developmentPercent?: number;
  totalSec?: number;
  peakTemp?: number;
  /** 焙煎終了時の豆温度（煎り上げ温度）。最大値ではなく終了時点の値 */
  endTemp?: number;
  /** 投入 → 色変化 */
  dryingSec?: number;
  /** 色変化 → 1 ハゼ */
  maillardSec?: number;
  /** 1 ハゼ → 焙煎終了 */
  developmentSec?: number;
}

function eventValue(
  log: KlogLog,
  name: string,
  kind: "time" | "scalar",
): number | undefined {
  const ev = log.events.find((e) => e.name === name && e.kind === kind);
  return ev && ev.kind !== "text" ? ev.value : undefined;
}

/**
 * イベントと温度系列から焙煎の指標を出す。
 * デベロップメント率は焙煎機が報告した値を優先し、無ければ
 * (終了 − 1 ハゼ) / 終了 で補う（手元のログでは同じ値になる）。
 */
export function computeMetrics(log: KlogLog): RoastMetrics {
  const colourChangeSec = eventValue(log, "colour_change", "time");
  const firstCrackSec = eventValue(log, "first_crack", "time");
  const roastEndSec = eventValue(log, "roast_end", "time");

  const time = timeSeries(log);
  const totalSec =
    roastEndSec ?? (time.length > 0 ? time[time.length - 1] : undefined);

  let peakTemp: number | undefined;
  for (const v of series(log, "temp") ?? []) {
    if (!Number.isNaN(v) && (peakTemp === undefined || v > peakTemp))
      peakTemp = v;
  }

  // 煎り上げ温度は終了時点の値。最大値（peakTemp）とは別物で、
  // 終了後に冷却へ入るログでは両者がずれる
  const endTemp =
    roastEndSec !== undefined
      ? valueAt(time, series(log, "temp"), roastEndSec)
      : undefined;

  let developmentPercent = eventValue(log, "development_percent", "scalar");
  if (
    developmentPercent === undefined &&
    firstCrackSec !== undefined &&
    roastEndSec
  ) {
    developmentPercent = ((roastEndSec - firstCrackSec) / roastEndSec) * 100;
  }

  return {
    colourChangeSec,
    firstCrackSec,
    roastEndSec,
    developmentPercent,
    totalSec,
    peakTemp,
    endTemp,
    dryingSec: colourChangeSec,
    maillardSec:
      firstCrackSec !== undefined && colourChangeSec !== undefined
        ? firstCrackSec - colourChangeSec
        : undefined,
    developmentSec:
      roastEndSec !== undefined && firstCrackSec !== undefined
        ? roastEndSec - firstCrackSec
        : undefined,
  };
}

/**
 * 時刻 `t` における系列の値。サンプルの間は線形に補間する。
 * イベント時刻はサンプルの刻みとずれるので、素直に前後から求める。
 */
export function valueAt(
  time: number[],
  values: number[] | undefined,
  t: number,
): number | undefined {
  if (!values || time.length === 0) return undefined;
  for (let i = 0; i < time.length; i += 1) {
    const ti = time[i];
    if (ti === undefined || ti < t) continue;
    if (i === 0) return values[0];
    const prev = time[i - 1];
    const a = values[i - 1];
    const b = values[i];
    if (prev === undefined || a === undefined || b === undefined)
      return undefined;
    const span = ti - prev;
    return span === 0 ? b : a + ((b - a) * (t - prev)) / span;
  }
  return values[values.length - 1];
}

/**
 * ヘッダの `roast_date`（"27/06/2026 09:48:50 UTC"）を ISO 文字列にする。
 * dd/mm/yyyy 固定なので Date のパーサには任せない。
 */
export function parseRoastDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s*(UTC)?/);
  if (!m) return undefined;
  const [, dd, mm, yyyy, hh, mi, ss] = m;
  const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * バッチ ID を導出する（例: "20260627-0023"）。
 * 焙煎日 + 焙煎機が振ったログ番号なので、同じログからは何度でも同じ ID が出る。
 * ログ番号が取れない場合だけ焙煎時刻の時分で代用する。
 */
export function deriveBatchId(log: KlogLog): string | undefined {
  const iso = parseRoastDate(log.header.roast_date);
  if (!iso) return undefined;
  const day = iso.slice(0, 10).replace(/-/g, "");
  const logNo = log.header.log_file_name?.match(/log(\d+)\.klog/i)?.[1];
  if (logNo) return `${day}-${logNo.padStart(4, "0")}`;
  return `${day}-${iso.slice(11, 13)}${iso.slice(14, 16)}`;
}

/**
 * ヘッダの `model` からメーカー名だけを残す。
 *
 * 実機のログには `model:<機種>/<地域>/<製造番号>` のように個体を特定できる
 * シリアルが入る。ページには出していないが、生ファイルをリポジトリに置くと
 * そのまま公開されてしまうので、取り込む時点で落とす。
 * 他の行は触らないので、グラフにも指標にも影響しない。
 */
export function stripMachineSerial(text: string): string {
  // 改行コードは残したいので $ ではなく「改行以外」で止める
  return text.replace(/^model:[^\r\n]*/m, "model:Kaffelogic");
}

/** 秒 → "m:ss"。未定義は "–" */
export function mmss(sec: number | undefined): string {
  if (sec === undefined || Number.isNaN(sec)) return "–";
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** 数値 → "15.6%"。未定義は "–" */
export function percent(n: number | undefined, digits = 1): string {
  return n === undefined || Number.isNaN(n) ? "–" : `${n.toFixed(digits)}%`;
}

/** 数値 → "214°C"。未定義は "–" */
export function celsius(n: number | undefined, digits = 0): string {
  return n === undefined || Number.isNaN(n) ? "–" : `${n.toFixed(digits)}°C`;
}
