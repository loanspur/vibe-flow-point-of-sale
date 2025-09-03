// Snapshot native console methods to prevent extension interference
// @ts-ignore
if (typeof window !== "undefined" && !window.__nativeConsole) {
  // @ts-ignore
  window.__nativeConsole = { 
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    log: console.log
  };
}

type Level = "error"|"warn"|"info"|"debug";
function enabled(level: Level) {
  const env = (import.meta?.env?.VITE_LOG_LEVEL ?? "warn").toLowerCase();
  const order: Record<Level,number> = { error:0, warn:1, info:2, debug:3 };
  return (order[level] ?? 1) <= (order[env as Level] ?? 1);
}
export function isTrace(kind?: string) {
  try {
    const p = new URLSearchParams(window.location.search);
    if (!p.has("trace")) return false;
    if (!kind) return true;
    const raw = p.get("trace");
    return raw === "*" || raw?.split(",").includes(kind);
  } catch { return false; }
}

// Use native console methods to prevent extension interference
const nativeConsole = typeof window !== "undefined" ? 
  // @ts-ignore
  (window.__nativeConsole || console) : console;

export const log = {
  error: (...a:any[]) => enabled("error") && nativeConsole.error(...a),
  warn:  (...a:any[]) => enabled("warn")  && nativeConsole.warn(...a),
  info:  (...a:any[]) => enabled("info")  && nativeConsole.info(...a),
  debug: (...a:any[]) => enabled("debug") && nativeConsole.debug(...a),
  trace: (kind:string, ...a:any[]) => isTrace(kind) && nativeConsole.info(`[TRACE:${kind}]`, ...a),
};

// Logger helper to gate noisy console logs
export const DEBUG = (import.meta.env.DEV && (window as any).__DEBUG__) === true;
export const dlog = (...args: any[]) => { if (DEBUG) console.log(...args); };
export const dwarn = (...args: any[]) => { if (DEBUG) console.warn(...args); };
export const derror = (...args: any[]) => { if (DEBUG) console.error(...args); };
