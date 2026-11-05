"use client";
import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverValue);
}

/** Layout desktop del tabellone (board Desktop) da 1024 px. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
