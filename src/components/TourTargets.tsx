import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import type { HostInstance } from 'react-native';

/**
 * Where the first-time tour can point: parts of the app register themselves
 * under a name (useTourTarget), and the tour (AppTour) measures them. Outside
 * a provider registering does nothing.
 */
type Targets = Map<string, HostInstance | null> & {
  /** Scrolls Today's list so a point of its content (from the top of the list) is at the top. */
  scrollTo?: (y: number) => void;
};
const TourTargetContext = createContext<Targets | null>(null);

export type { Targets as TourTargets };

export function TourTargetProvider({ targets, children }: { targets: Targets; children: ReactNode }) {
  return <TourTargetContext.Provider value={targets}>{children}</TourTargetContext.Provider>;
}

/** A ref to put on the view the tour points at as `key`. */
export function useTourTarget(key: string): (r: HostInstance | null) => void {
  const targets = useContext(TourTargetContext);
  const ref = useRef((r: HostInstance | null) => {
    if (r) targets?.set(key, r);
    else targets?.delete(key);
  });
  return ref.current;
}

/** Today's list lends the tour its scrolling, to bring what it shows into view. */
export function useTourScroller(scrollTo: (y: number) => void) {
  const targets = useContext(TourTargetContext);
  useEffect(() => {
    if (!targets) return;
    targets.scrollTo = scrollTo;
    return () => {
      if (targets.scrollTo === scrollTo) targets.scrollTo = undefined;
    };
  }, [targets, scrollTo]);
}

export function useTourTargets(): Targets {
  return useRef<Targets>(new Map()).current;
}
