import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./CuppingTimer.module.css";

/**
 * カッピング用の 3 連タイマー（/cupping）。
 *
 * 「注いでからの経過」「ブレイクまで」「飲み始めまで」を 1 つのボタンで同時に走らせる。
 *
 * 経過は setInterval の積み上げではなく、開始時刻と現在時刻の差から毎回計算し直す。
 * こうしておくと、画面が消えてタブのタイマーが止められても、戻ってきた瞬間に実時間へ
 * 追いつく（積み上げ方式だと止まっていた分がまるごと抜ける）。あわせて状態を
 * localStorage に置くので、うっかりページを閉じても続きから読み直せる。
 */

const STORAGE_KEY = "cupping-timer:v1";

/** カッピングの標準的な区切り。ブレイクが 4 分、飲み始めが 8 分 */
const DEFAULT_BREAK_MS = 4 * 60_000;
const DEFAULT_DRINK_MS = 8 * 60_000;

/** 設定で入れられる上限。プルダウンの丈もこれで決まる */
const MAX_MINUTES = 59;
const MAX_SECONDS = 59;

interface TimerState {
  /** 走り出した時刻（epoch ms）。止めているあいだは null */
  startedAt: number | null;
  /** 前回止めるまでに積み上がった経過（ms） */
  carriedMs: number;
  /** ブレイクまでの長さ（ms） */
  breakMs: number;
  /** 飲み始めまでの長さ（ms） */
  drinkMs: number;
  /** 到達時にビープを鳴らすか */
  sound: boolean;
}

const INITIAL_STATE: TimerState = {
  startedAt: null,
  carriedMs: 0,
  breakMs: DEFAULT_BREAK_MS,
  drinkMs: DEFAULT_DRINK_MS,
  sound: true,
};

/** どちらの区切りを「もう知らせた」か */
interface Announced {
  break: boolean;
  drink: boolean;
}

function toMs(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function loadState(): TimerState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const saved = JSON.parse(raw) as Partial<TimerState>;
    return {
      startedAt:
        typeof saved.startedAt === "number" && Number.isFinite(saved.startedAt)
          ? saved.startedAt
          : null,
      carriedMs: toMs(saved.carriedMs, 0),
      breakMs: toMs(saved.breakMs, DEFAULT_BREAK_MS),
      drinkMs: toMs(saved.drinkMs, DEFAULT_DRINK_MS),
      sound: saved.sound !== false,
    };
  } catch {
    // 壊れた値でも読み込みごと落とさない。初期値で始める
    return INITIAL_STATE;
  }
}

function isSameState(a: TimerState, b: TimerState): boolean {
  return (
    a.startedAt === b.startedAt &&
    a.carriedMs === b.carriedMs &&
    a.breakMs === b.breakMs &&
    a.drinkMs === b.drinkMs &&
    a.sound === b.sound
  );
}

function elapsedOf(state: TimerState, now: number): number {
  if (state.startedAt === null) return state.carriedMs;
  // 端末の時計が巻き戻っても経過が減らないようにする
  return state.carriedMs + Math.max(0, now - state.startedAt);
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** ms を mm:ss と 1/100 秒に割る */
function splitClock(ms: number): { clock: string; cs: string } {
  const total = Math.max(0, Math.floor(ms));
  return {
    clock: `${pad(Math.floor(total / 60_000))}:${pad(Math.floor(total / 1000) % 60)}`,
    cs: pad(Math.floor(total / 10) % 100),
  };
}

/** カード見出しに出す「4:00」形式 */
function shortClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  return `${Math.floor(total / 60_000)}:${pad(Math.floor(total / 1000) % 60)}`;
}

/** 到達を知らせる短いビープ。鳴らす回数で 2 つの区切りを聞き分ける */
function playBeep(ctx: AudioContext, times: number): void {
  for (let i = 0; i < times; i += 1) {
    const at = ctx.currentTime + i * 0.32;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.28);
  }
}

export default function CuppingTimer() {
  const [state, setState] = useState<TimerState>(loadState);
  const [now, setNow] = useState(() => Date.now());

  const running = state.startedAt !== null;
  const elapsed = elapsedOf(state, now);

  const audioRef = useRef<AudioContext | null>(null);
  const announcedRef = useRef<Announced>({ break: false, drink: false });

  // 読み直した直後は「すでに過ぎている区切り」を知らせ済みとして始める。
  // これが無いと、5 分経った状態でページを開くだけでビープが鳴る。
  const restoredRef = useRef(false);
  if (!restoredRef.current) {
    restoredRef.current = true;
    const at = elapsedOf(state, Date.now());
    announcedRef.current = {
      break: at >= state.breakMs,
      drink: at >= state.drinkMs,
    };
  }

  // 走っているあいだだけ再描画する。値そのものは Date.now() から出しているので、
  // このループが止められても表示がずれるだけで、計測はずれない
  useEffect(() => {
    if (!running) return;
    let frame = window.requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = window.requestAnimationFrame(tick);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [running]);

  // 画面が戻ってきた／bfcache から復帰した瞬間に実時間へ追いつかせる
  useEffect(() => {
    const sync = () => setNow(Date.now());
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 保存できなくても、開いているあいだの計測は続けられる
    }
  }, [state]);

  // 同じタイマーを 2 つのタブで開いていても食い違わないようにする。
  // 中身が同じなら参照を変えず、保存 → storage → 保存 の往復に入らないようにする
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setState((current) => {
        const next = loadState();
        return isSameState(current, next) ? current : next;
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 走っているあいだは画面を消させない。断られても計測自体は続く
  useEffect(() => {
    if (!running) return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    const acquire = async () => {
      if (stopped || sentinel !== null) return;
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) {
          void next.release();
          return;
        }
        // 画面が消えると OS 側で解除されるので、戻ってきたら取り直せるようにする
        next.addEventListener("release", () => {
          if (sentinel === next) sentinel = null;
        });
        sentinel = next;
      } catch {
        // 未対応・拒否・非セキュアコンテキストのいずれでもここに来る
      }
    };

    const onVisible = () => void acquire();
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [running]);

  const notify = useCallback(
    (beeps: number) => {
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(beeps === 1 ? [220] : [180, 120, 180]);
      }
      const ctx = audioRef.current;
      if (!state.sound || !ctx) return;
      void ctx
        .resume()
        .then(() => playBeep(ctx, beeps))
        .catch(() => undefined);
    },
    [state.sound],
  );

  // 区切りを跨いだら知らせる。目標を伸ばして未到達に戻ったら、また鳴らせるよう印を戻す
  useEffect(() => {
    const announced = announcedRef.current;
    if (elapsed < state.breakMs) announced.break = false;
    if (elapsed < state.drinkMs) announced.drink = false;
    if (!running) return;
    if (!announced.break && elapsed >= state.breakMs) {
      announced.break = true;
      notify(1);
    }
    if (!announced.drink && elapsed >= state.drinkMs) {
      announced.drink = true;
      notify(2);
    }
  }, [running, elapsed, state.breakMs, state.drinkMs, notify]);

  /** iOS は操作をきっかけにしないと音を出せないので、開始のタップで用意する */
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    try {
      audioRef.current = new AudioContext();
    } catch {
      // 音が出せない環境ではバイブと表示だけで知らせる
    }
    return audioRef.current;
  }, []);

  const handleToggle = useCallback(() => {
    const ctx = ensureAudio();
    void ctx?.resume().catch(() => undefined);
    setNow(Date.now());
    setState((current) =>
      current.startedAt === null
        ? { ...current, startedAt: Date.now() }
        : {
            ...current,
            startedAt: null,
            carriedMs: elapsedOf(current, Date.now()),
          },
    );
  }, [ensureAudio]);

  const handleReset = useCallback(() => {
    setNow(Date.now());
    setState((current) => ({ ...current, startedAt: null, carriedMs: 0 }));
  }, []);

  const setDuration = useCallback(
    (key: "breakMs" | "drinkMs", ms: number) =>
      setState((current) => ({ ...current, [key]: ms })),
    [],
  );

  const marks = [
    { key: "breakMs" as const, label: "ブレイク", targetMs: state.breakMs },
    { key: "drinkMs" as const, label: "飲み始め", targetMs: state.drinkMs },
  ];

  const elapsedTime = splitClock(elapsed);
  const isPristine = !running && elapsed === 0;

  let status =
    "スタートを押すと、3 つのタイマーが同時に走ります。数字を押すと時間を変えられます。";
  if (running) {
    status = "計測中。画面を消しても、閉じても、開き直せば続きから表示します。";
  } else if (elapsed > 0) {
    status = "一時停止中。再開を押すと続きから進みます。";
  }

  return (
    <div className={styles.timer}>
      <section
        className={`${styles.elapsed} ${running ? styles["elapsed--running"] : ""}`}
      >
        <p className={styles.elapsed__label}>注いでからの経過</p>
        <p className={styles.elapsed__time}>
          <span className={styles.elapsed__clock}>{elapsedTime.clock}</span>
          <span className={styles.elapsed__cs}>.{elapsedTime.cs}</span>
        </p>
      </section>

      <div className={styles.marks}>
        {marks.map((mark) => {
          const remaining = mark.targetMs - elapsed;
          const done = remaining <= 0;
          const time = splitClock(done ? -remaining : remaining);
          const progress =
            mark.targetMs > 0 ? Math.min(1, elapsed / mark.targetMs) : 1;

          return (
            <article
              key={mark.key}
              className={`${styles.mark} ${done ? styles["mark--done"] : ""}`}
            >
              <div className={styles.mark__head}>
                <span className={styles.mark__label}>{mark.label}</span>
                <span className={styles.mark__target}>
                  {done ? "到達" : isPristine ? "" : shortClock(mark.targetMs)}
                </span>
              </div>

              {/* 走らせる前だけ、残り＝設定値なので数字をそのまま書き換えられる。
                  走り出したあとの数字はカウントダウンなので触らせない */}
              {isPristine ? (
                <TargetClock
                  label={mark.label}
                  targetMs={mark.targetMs}
                  onChange={(ms) => setDuration(mark.key, ms)}
                />
              ) : (
                <p className={styles.mark__time}>
                  <span className={styles.mark__clock}>
                    {done ? "+" : ""}
                    {time.clock}
                  </span>
                  <span className={styles.mark__cs}>.{time.cs}</span>
                </p>
              )}

              <span className={styles.mark__bar} aria-hidden="true">
                <span
                  className={styles.mark__fill}
                  style={{ width: `${progress * 100}%` }}
                />
              </span>
            </article>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.primary} ${running ? styles["primary--running"] : ""}`}
          onClick={handleToggle}
        >
          {running ? "一時停止" : isPristine ? "スタート" : "再開"}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={handleReset}
          disabled={isPristine}
        >
          リセット
        </button>
      </div>

      <label className={styles.sound}>
        <input
          type="checkbox"
          checked={state.sound}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              sound: event.target.checked,
            }))
          }
        />
        <span>到達したら音を鳴らす</span>
      </label>

      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </div>
  );
}

/** 秒数を mmss の 4 桁に畳む */
function toDigits(totalSeconds: number): string {
  return `${pad(Math.floor(totalSeconds / 60))}${pad(totalSeconds % 60)}`;
}

const MINUTE_OPTIONS = Array.from({ length: MAX_MINUTES + 1 }, (_, i) => i);
const SECOND_OPTIONS = Array.from({ length: MAX_SECONDS + 1 }, (_, i) => i);

/** 指で触る端末かどうか。プルダウンと打ち込みを出し分ける */
function useCoarsePointer(): boolean {
  // 初回描画から正しい側を出す。後から差し替えると入力欄が一瞬ちらつく
  const [coarse, setCoarse] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return coarse;
}

/**
 * カードの大きい数字そのものを設定欄にしたもの。見た目はどちらも「04:00」のまま、
 * 入れ方だけを端末に合わせる。スマホは分と秒のプルダウン（OS のホイールが出る）、
 * キーボードのある端末は 4 桁の打ち込み。
 */
function TargetClock({
  label,
  targetMs,
  onChange,
}: {
  label: string;
  targetMs: number;
  onChange: (ms: number) => void;
}) {
  const minutes = Math.floor(targetMs / 60_000);
  const seconds = Math.floor(targetMs / 1000) % 60;
  const coarse = useCoarsePointer();

  if (coarse) {
    return (
      <p className={styles.mark__time}>
        <select
          className={styles.mark__select}
          aria-label={`${label}までの分`}
          value={minutes}
          onChange={(event) =>
            onChange(Number(event.target.value) * 60_000 + seconds * 1000)
          }
        >
          {MINUTE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {pad(value)}
            </option>
          ))}
        </select>
        <span className={styles.mark__clock}>:</span>
        <select
          className={styles.mark__select}
          aria-label={`${label}までの秒`}
          value={seconds}
          onChange={(event) =>
            onChange(minutes * 60_000 + Number(event.target.value) * 1000)
          }
        >
          {SECOND_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {pad(value)}
            </option>
          ))}
        </select>
        <span className={styles.mark__cs}>.00</span>
      </p>
    );
  }

  return (
    <p className={styles.mark__time}>
      <DigitsInput
        aria-label={`${label}までの時間（4 桁で分と秒）`}
        totalSeconds={minutes * 60 + seconds}
        onCommit={(total) => onChange(total * 1000)}
      />
      <span className={styles.mark__cs}>.00</span>
    </p>
  );
}

/**
 * mm:ss を 1 つの欄で打ち込む。持っているのは数字 4 桁だけで、右詰めで解釈する
 * （0430 も 430 も 4:30）。打っている途中も必ず mm:ss の形で見せるので、
 * 4 桁入れ終わった時点で分と秒の両方が埋まる。
 */
function DigitsInput({
  totalSeconds,
  onCommit,
  "aria-label": ariaLabel,
}: {
  totalSeconds: number;
  onCommit: (totalSeconds: number) => void;
  "aria-label": string;
}) {
  const [draft, setDraft] = useState(() => toDigits(totalSeconds));

  useEffect(() => setDraft(toDigits(totalSeconds)), [totalSeconds]);

  const padded = draft.padStart(4, "0");
  const display = `${padded.slice(0, 2)}:${padded.slice(2)}`;

  const commit = () => {
    const minutes = Math.min(Number(padded.slice(0, 2)), MAX_MINUTES);
    const seconds = Math.min(Number(padded.slice(2)), MAX_SECONDS);
    setDraft(`${pad(minutes)}${pad(seconds)}`);
    onCommit(minutes * 60 + seconds);
  };

  return (
    <input
      className={styles.mark__input}
      // 表示は常に mm:ss なので、打たれた分は数字だけ拾って末尾 4 桁を残す
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={display}
      onChange={(event) =>
        setDraft(event.target.value.replace(/\D/g, "").slice(-4))
      }
      onFocus={(event) => event.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}
