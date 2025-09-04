export function isTrace(kind: string) {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.has(kind) || p.get("trace")?.split(",").includes(kind);
  } catch {
    return false;
  }
}

export function tlog(kind: string, ...args: any[]) {
  if (!isTrace(kind)) return;
  // eslint-disable-next-line no-console
  console.info(`[TRACE:${kind}]`, ...args);
}
