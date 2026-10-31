import { useEffect, useRef, type RefObject } from 'react';
import { type HostInstance } from 'react-native';
import { Easing, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { chainAt, hop, type Curve, type Pt } from '../flight';
import { FlyingBizzy, measureIn, useFlyer, useWait } from './fx/Flyer';
import { useReduceMotion } from './FireAura';

/** One loop round an ellipse, as four curves, starting on its right. */
function ellipse(c: Pt, rx: number, ry: number): Curve[] {
  const k = 0.5523;
  const [x, y] = c;
  return [
    [[x + rx, y], [x + rx, y + ry * k], [x + rx * k, y + ry], [x, y + ry]],
    [[x, y + ry], [x - rx * k, y + ry], [x - rx, y + ry * k], [x - rx, y]],
    [[x - rx, y], [x - rx, y - ry * k], [x - rx * k, y - ry], [x, y - ry]],
    [[x, y - ry], [x + rx * k, y - ry], [x + rx, y - ry * k], [x + rx, y]],
  ];
}

type Spot = { x: number; y: number; w: number; h: number };
const SIZE = 52;

/**
 * Bizzy on the profile (picked 2026-10-29: ideas A, C and E, taking turns):
 * A flies round the picture, passing behind and in front, and waves from on
 * top; C sits on the level pill, swings, dozes off and jolts awake; E polishes
 * the pinned trophies one by one. Between them he flies over to the next spot
 * instead of jumping. With less motion he just sits on top of the picture.
 * Rendered inside `root`, next to the picture (which has zIndex 2).
 */
export function ProfileBizzy({ root, frame, pill, trophies }: { root: RefObject<HostInstance | null>; frame: RefObject<HostInstance | null>; pill: RefObject<HostInstance | null>; trophies: RefObject<(HostInstance | null)[]> }) {
  const flyer = useFlyer('happy');
  const reduce = useReduceMotion();
  const { alive, wait } = useWait();
  const started = useRef(false);
  const where = (r: HostInstance | null) => measureIn(r, root.current);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Let the page lay out first.
    const id = setTimeout(() => run().catch(() => {}), 400);
    return () => clearTimeout(id);
  }, []);

  /** Flies from where he is to `to` with a little hop. */
  async function goTo(to: Pt) {
    const from: Pt = [flyer.x.value, flyer.y.value];
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 4) return;
    flyer.setFast(true);
    flyer.setMood('happy');
    flyer.rot.value = withTiming(0, { duration: 200 });
    await flyer.fly(hop(from, to, 50), 750);
  }

  async function aroundFrame(f: Spot) {
    const c: Pt = [f.x + f.w / 2, f.y + f.h / 2 - 6];
    const rx = f.w / 2 + 30;
    const ry = f.h * 0.2;
    const start: Pt = [c[0] + rx, c[1]];
    await goTo(start);
    if (!alive.current) return;
    // Two slow loops (passing behind on the far side), then up on top to wave.
    await flyer.fly([...ellipse(c, rx, ry), ...ellipse(c, rx, ry)], 8400, { easing: Easing.linear });
    if (!alive.current) return;
    await flyer.fly([[start, [start[0] + 2, c[1] - 54], [c[0] + 20, f.y - 30], [c[0], f.y - 14]]], 600);
    flyer.setMood('wave');
    flyer.setFast(false);
    await wait(1800);
  }

  async function onPill(p: Spot) {
    const seat: Pt = [p.x + p.w - 14, p.y - 14];
    await goTo(seat);
    if (!alive.current) return;
    flyer.setFast(false);
    flyer.rot.value = withSequence(...[6, -6, 6, -6, 0].map((r) => withTiming(r, { duration: 600, easing: Easing.inOut(Easing.sin) })));
    await wait(3000);
    flyer.setMood('sleepy');
    await wait(2600);
    if (!alive.current) return;
    flyer.setMood('excited');
    flyer.setFast(true);
    await flyer.fly(hop(seat, seat, 24), 500);
    flyer.setMood('happy');
    await wait(800);
  }

  async function polish(list: Spot[]) {
    for (const tr of list) {
      const at: Pt = [tr.x + tr.w / 2 + 6, tr.y + 4];
      await goTo(at);
      if (!alive.current) return;
      flyer.setMood('curious');
      flyer.rot.value = withSequence(...Array.from({ length: 8 }, (_, i) => withTiming(i % 2 ? -12 : 12, { duration: 85 })), withTiming(0, { duration: 85 }));
      flyer.x.value = withSequence(...Array.from({ length: 8 }, (_, i) => withTiming(at[0] + (i % 2 ? -5 : 5), { duration: 85 })), withTiming(at[0], { duration: 85 }));
      await wait(800);
      flyer.setMood('happy');
      await wait(300);
    }
    flyer.setMood('proud');
    await wait(1500);
  }

  async function run() {
    const f = await where(frame.current);
    if (!f || !alive.current) return;
    const top: Pt = [f.x + f.w / 2, f.y - 14];
    flyer.place(top[0], top[1]);
    if (reduce) return;
    flyer.setMood('wave');
    await wait(1500);
    for (let turn = 0; alive.current; turn++) {
      const step = turn % 3;
      if (step === 0) {
        const at = await where(frame.current);
        if (at) await aroundFrame(at);
      } else if (step === 1) {
        const at = await where(pill.current);
        if (at) await onPill(at);
      } else {
        const list = (await Promise.all((trophies.current ?? []).map((r) => where(r)))).filter((s): s is Spot => !!s && s.w > 0);
        if (list.length) await polish(list);
      }
    }
  }

  // In front of the picture, except on the far half of a loop round it.
  const { p, path, flying } = flyer;
  const depth = useAnimatedStyle(() => {
    let behind = false;
    if (flying.value && path.value.length >= 4) {
      const [, y] = chainAt(path.value, p.value);
      const [, y0] = chainAt(path.value, 0);
      behind = y < y0 - 2;
    }
    return { zIndex: behind ? 1 : 3 };
  });
  return <FlyingBizzy flyer={flyer} size={SIZE} style={depth} />;
}
