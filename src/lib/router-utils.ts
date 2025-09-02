import { useCallback, useContext } from "react";
import { UNSAFE_NavigationContext } from "react-router-dom";

type NavFn = (to: string, opts?: { replace?: boolean }) => void;

export function useSafeNavigate(): NavFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = useContext(UNSAFE_NavigationContext) as any | undefined;
  const nav = ctx?.navigator; // has push/replace when inside Router
  return useCallback<NavFn>((to, opts) => {
    if (nav && typeof nav.push === "function") {
      if (opts?.replace) nav.replace(to);
      else nav.push(to);
    } else {
      if (opts?.replace) window.location.replace(to);
      else window.location.assign(to);
    }
  }, [nav]);
}
