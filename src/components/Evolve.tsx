import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { bizzyFormOf, bizzyMiddle, bizzySvg, cocoonSvg } from '../bizzy';
import { buzz } from '../haptics';
import { sound } from '../sounds';
import { FONTS, nativeDriver, themed, useStyles } from '../theme';
import { useReduceMotion } from './FireAura';
import { t } from '../i18n';

const STAGE = 240;
const GLOW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="evg"><stop offset="0" stop-color="#FFF4C8"/><stop offset=".4" stop-color="#FFD36B" stop-opacity=".55"/><stop offset="1" stop-color="#FFD36B" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(#evg)"/></svg>`;
const HALO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="evh"><stop offset="0" stop-color="#FFB347" stop-opacity=".22"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(#evh)"/></svg>`;
const DROP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 24"><path d="M10 1 Q19 13 10 22 Q1 13 10 1Z" fill="#F2A93B"/><ellipse cx="7.5" cy="13" rx="2" ry="3" fill="#FFE2A0" opacity=".8"/></svg>`;
const SPARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20"><path d="M0 -9 Q0 0 9 0 Q0 0 0 9 Q0 0 -9 0 Q0 0 0 -9Z" fill="#FFE48A"/></svg>`;
/** Honey drops flung out when the cocoon bursts: angle up and out, then they fall. */
const DROPS = [-2.5, -2.1, -1.75, -1.4, -1.05, -0.75, -0.5];
const SPARKS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + 0.2);

/**
 * Bizzy evolving, full screen (picked 2026-10-28: the honey cocoon). Honey
 * wraps him into a cocoon, it wobbles while light cracks through, then it
 * bursts open with the new form inside, honey drops and sparkles. Tap Nice
 * to go back. With less motion the old form simply fades into the new one.
 */
export function EvolveScene({ from, to, onClose }: { from: number; to: number; onClose: () => void }) {
  const s = useStyles(makeStyles);
  const reduce = useReduceMotion();
  const [done, setDone] = useState(false);
  const backdrop = useRef(new Animated.Value(0)).current;
  const wrap = useRef(new Animated.Value(0)).current;
  const old = useRef(new Animated.Value(1)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  // The crack is revealed by a growing height, which only the JS driver can animate.
  const crack = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const next = bizzyFormOf(to);
  const mid = (bizzyMiddle(from) + bizzyMiddle(to)) / 2;
  // The cocoon grows up from, and wobbles on, its bottom.
  const base = Math.min(1, bizzyMiddle(from) + (68 * bizzyFormOf(from).k + 10) / 200);

  useEffect(() => {
    Animated.timing(backdrop, { toValue: 1, duration: 250, useNativeDriver: nativeDriver }).start();
    const timing = (v: Animated.Value, toValue: number, duration: number, easing: (x: number) => number, native = nativeDriver) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: native });
    const finish = () => {
      buzz('levelUp');
      sound('levelUp');
    };
    if (reduce) {
      const anim = Animated.sequence([Animated.delay(300), timing(old, 0, 400, Easing.linear), timing(pop, 1, 400, Easing.linear)]);
      anim.start(({ finished }) => {
        if (!finished) return;
        finish();
        setDone(true);
      });
      return () => anim.stop();
    }
    const anim = Animated.sequence([
      Animated.delay(450),
      Animated.parallel([timing(wrap, 1, 750, Easing.out(Easing.back(1.4))), Animated.sequence([Animated.delay(500), timing(old, 0, 250, Easing.linear)])]),
      Animated.delay(250),
      Animated.parallel([timing(wobble, 1, 1300, Easing.inOut(Easing.quad)), timing(crack, 1, 1300, Easing.in(Easing.quad), false)]),
    ]);
    let after: Animated.CompositeAnimation | undefined;
    anim.start(({ finished }) => {
      if (!finished) return;
      finish();
      after = Animated.parallel([timing(burst, 1, 1000, Easing.out(Easing.cubic)), timing(pop, 1, 650, Easing.out(Easing.back(2.2)))]);
      after.start(({ finished: ok }) => ok && setDone(true));
    });
    return () => {
      anim.stop();
      after?.stop();
    };
  }, []);

  function close() {
    Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: nativeDriver }).start(() => onClose());
  }

  const burstOut = (outputRange: number[]) => burst.interpolate({ inputRange: [0, 1], outputRange });
  const unburst = burst.interpolate({ inputRange: [0, 0.001], outputRange: [1, 0], extrapolate: 'clamp' });
  const turn = wobble.interpolate({ inputRange: [0, 0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 1], outputRange: ['0deg', '-8deg', '8deg', '-6deg', '6deg', '-10deg', '10deg', '-12deg', '12deg', '0deg'] });
  const half = (side: -1 | 1) => ({
    opacity: burst.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
    transform: [{ translateX: burstOut([0, side * STAGE * 0.45]) }, { translateY: burstOut([0, STAGE * 0.12]) }, { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${side * 35}deg`] }) }],
  });

  return (
    <Animated.View style={[s.overlay, { opacity: backdrop }]} accessibilityViewIsModal>
      <View style={s.backdrop} />
      <View style={s.center}>
        <Text style={s.title} accessibilityLiveRegion="polite">
          {done ? t('Bizzy became {name}!', { name: t(next.name) }) : t('Bizzy is evolving…')}
        </Text>
        <View style={s.stage} accessible accessibilityLabel={done ? t(next.name) : t('Bizzy is evolving…')}>
          <SvgXml xml={HALO} width={STAGE * 1.4} height={STAGE * 1.4} style={s.halo} />
          {/* The old form, fading inside the cocoon. */}
          <Animated.View style={[s.layer, { opacity: old }]}>
            <SvgXml xml={bizzySvg('happy', true, { form: from })} width={STAGE} height={STAGE} />
          </Animated.View>
          {/* The new form pops out of the burst. */}
          <Animated.View style={[s.layer, { opacity: pop.interpolate({ inputRange: [0, 0.05], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
            <SvgXml xml={bizzySvg(done ? 'happy' : 'excited', true, { form: to })} width={STAGE} height={STAGE} />
          </Animated.View>
          {!reduce && (
            <>
              <Animated.View style={[s.layer, { transformOrigin: `50% ${base * 100}%`, transform: [{ scaleY: wrap }, { rotate: turn }] }]} pointerEvents="none">
                <Animated.View style={[s.layer, half(-1)]}>
                  <SvgXml xml={cocoonSvg(from, 'left')} width={STAGE} height={STAGE} />
                </Animated.View>
                <Animated.View style={[s.layer, half(1)]}>
                  <SvgXml xml={cocoonSvg(from, 'right')} width={STAGE} height={STAGE} />
                </Animated.View>
                {/* Light cracking through from the top down, gone the moment it bursts. */}
                <Animated.View style={[s.crack, { height: crack.interpolate({ inputRange: [0, 1], outputRange: [0, STAGE] }), opacity: unburst }]}>
                  {/* A box of its own at full size, so the drawing is cut off rather than squeezed. */}
                  <View style={s.full}>
                    <SvgXml xml={cocoonSvg(from, 'crack')} width={STAGE} height={STAGE} />
                  </View>
                </Animated.View>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[s.fx, { left: STAGE / 2 - STAGE * 0.45, top: mid * STAGE - STAGE * 0.45, opacity: burstOut([1, 0]), transform: [{ scale: burstOut([0.3, 1.4]) }] }]}
              >
                <SvgXml xml={GLOW} width={STAGE * 0.9} height={STAGE * 0.9} />
              </Animated.View>
              {DROPS.map((a, i) => (
                <Animated.View
                  key={`d${i}`}
                  pointerEvents="none"
                  style={[
                    s.fx,
                    {
                      left: STAGE / 2 - 8,
                      top: mid * STAGE - 10,
                      opacity: burst.interpolate({ inputRange: [0, 0.01, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                      transform: [
                        { translateX: burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, Math.cos(a) * STAGE * 0.3, Math.cos(a) * STAGE * 0.4] }) },
                        { translateY: burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, Math.sin(a) * STAGE * 0.3, STAGE * 0.42] }) },
                      ],
                    },
                  ]}
                >
                  <SvgXml xml={DROP} width={16} height={20} />
                </Animated.View>
              ))}
              {SPARKS.map((a, i) => (
                <Animated.View
                  key={`s${i}`}
                  pointerEvents="none"
                  style={[
                    s.fx,
                    {
                      left: STAGE / 2 - 10,
                      top: mid * STAGE - 10,
                      transform: [
                        { translateX: burstOut([0, Math.cos(a) * STAGE * (i % 2 ? 0.34 : 0.44)]) },
                        { translateY: burstOut([0, Math.sin(a) * STAGE * (i % 2 ? 0.34 : 0.44)]) },
                        { scale: burst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.1, 0] }) },
                      ],
                    },
                  ]}
                >
                  <SvgXml xml={SPARK} width={20} height={20} />
                </Animated.View>
              ))}
            </>
          )}
        </View>
        <Text style={[s.text, !done && s.hidden]}>{t(next.text)}</Text>
        <Pressable onPress={close} disabled={!done} style={[s.button, !done && s.hidden]} accessibilityRole="button" accessibilityElementsHidden={!done}>
          <Text style={s.buttonText}>{t('Nice!')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const makeStyles = themed((c) => ({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 11 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.bg, opacity: 0.95 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 26, textAlign: 'center', minHeight: 34 },
  stage: { width: STAGE, height: STAGE },
  halo: { position: 'absolute', left: -STAGE * 0.2, top: -STAGE * 0.2 },
  layer: { position: 'absolute', left: 0, top: 0, width: STAGE, height: STAGE },
  crack: { position: 'absolute', left: 0, top: 0, width: STAGE, overflow: 'hidden' },
  full: { width: STAGE, height: STAGE },
  fx: { position: 'absolute' },
  text: { color: c.muted, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 280, minHeight: 42 },
  // Honey gold like the Evolve button: part of the rewards layer, the same in every theme.
  button: { minHeight: 52, minWidth: 200, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFC94D', backgroundImage: 'linear-gradient(90deg, #FFE48A, #FFB347)' },
  buttonText: { fontFamily: 'Vivid_800ExtraBold', fontSize: 17, color: '#2A1A05' },
  hidden: { opacity: 0 },
}));
