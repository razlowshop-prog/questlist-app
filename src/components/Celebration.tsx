import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import type { LevelMilestone } from '../achievements';
import { eyebrow, FONTS, nativeDriver, themed, useStyles, useTheme } from '../theme';
import { CoinShower } from './Fortuna';
import { TOKEN_INFO } from '../tokens';
import { RewardPicture } from './RewardPicture';
import { brandFill, brandInk, brandTextShadow, ConfettiBurst, LevelBadge, VIVID_HEAVY } from './Vivid';
import { brandGlow, brandLine, MYTHIC } from '../vivid';

export interface CelebrationEvent {
  level: number;
  rank: string;
  newRank: boolean;
  /** The level's reward, when it has one that is not claimed yet. */
  milestone?: LevelMilestone;
}

const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);
const SPARKS = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);

/**
 * Full-screen level-up: light rays, rings and the new level number bouncing
 * in. If the level has a reward, it is handed over next like a new item in a
 * game: the card flips in with a burst of sparks and a Collect button.
 */
export function Celebration({
  event,
  onCollect,
  onClose,
}: {
  event: CelebrationEvent;
  onCollect: () => void;
  onClose: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [phase, setPhase] = useState<'level' | 'reward'>('level');
  const backdrop = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;
  const rings = useRef(new Animated.Value(0)).current;
  const item = useRef(new Animated.Value(0)).current;
  const sparks = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdrop, { toValue: 1, duration: 250, useNativeDriver: nativeDriver }).start();
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: nativeDriver }));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (phase === 'level') {
      intro.setValue(0);
      rings.setValue(0);
      Animated.parallel([
        Animated.timing(intro, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.8)), useNativeDriver: nativeDriver }),
        Animated.timing(rings, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      ]).start();
      // Moves on by itself so a quick tap isn't needed.
      const t = setTimeout(next, 2800);
      return () => clearTimeout(t);
    }
    item.setValue(0);
    sparks.setValue(0);
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(item, { toValue: 1, duration: 800, easing: Easing.out(Easing.back(1.4)), useNativeDriver: nativeDriver }),
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(sparks, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
        ]),
      ]),
    ]).start();
  }, [phase]);

  function next() {
    if (phase === 'level' && event.milestone) setPhase('reward');
    else if (phase === 'level') close(onClose);
  }

  function close(then: () => void) {
    Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: nativeDriver }).start(() => then());
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const milestone = event.milestone;

  return (
    <Animated.View style={[s.overlay, { opacity: backdrop }]}>
      <Pressable style={s.fill} onPress={phase === 'level' ? next : undefined} accessibilityRole="button" accessibilityLabel={phase === 'level' ? 'Continue' : undefined}>
        <View style={s.backdrop} />
        {/* Fortuna: a shower of gold coins on every level-up. */}
        {c.check === 'coin' && <CoinShower />}
        <View style={s.center} pointerEvents="box-none">
          <Animated.View style={[s.rays, { transform: [{ rotate }] }]} pointerEvents="none">
            {RAYS.map((deg) => (
              <View key={deg} style={[s.ray, { transform: [{ rotate: `${deg}deg` }] }]} />
            ))}
          </Animated.View>

          {phase === 'level' ? (
            <>
              {[0, 0.25].map((delay) => (
                <Animated.View
                  key={delay}
                  pointerEvents="none"
                  style={[
                    s.ring,
                    {
                      opacity: rings.interpolate({ inputRange: [0, delay, 1], outputRange: [0, 0.9, 0] }),
                      transform: [{ scale: rings.interpolate({ inputRange: [0, delay, 1], outputRange: [0.2, 0.2, 2.4] }) }],
                    },
                  ]}
                />
              ))}
              <Animated.Text
                style={[s.eyebrow, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
              >
                Level up
              </Animated.Text>
              <Animated.View
                style={{
                  opacity: intro,
                  marginVertical: 8,
                  transform: [
                    { perspective: 800 },
                    { rotateY: intro.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] }) },
                    { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  ],
                }}
                accessible
                accessibilityLabel={`Level ${event.level}`}
              >
                <ConfettiBurst scale={2.2} />
                <LevelBadge level={event.level} size={132} />
              </Animated.View>
              <Animated.Text style={[s.rank, { opacity: intro }]}>
                {event.newRank ? `New rank · ${event.rank}` : event.rank}
              </Animated.Text>
              <Text style={s.hint}>{milestone ? 'Tap to see your reward' : 'Tap to continue'}</Text>
            </>
          ) : (
            milestone && (
              <>
                <Animated.Text style={[s.eyebrow, { opacity: item }]}>New item unlocked</Animated.Text>
                <View style={s.itemWrap}>
                  {SPARKS.map((a, i) => (
                    <Animated.View
                      key={i}
                      pointerEvents="none"
                      style={[
                        s.spark,
                        i % 2 === 1 && s.sparkSmall,
                        { backgroundColor: MYTHIC[i % MYTHIC.length], boxShadow: `0px 0px 8px ${MYTHIC[i % MYTHIC.length]}` },
                        {
                          opacity: sparks.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
                          transform: [
                            { translateX: sparks.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * (i % 2 ? 120 : 160)] }) },
                            { translateY: sparks.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * (i % 2 ? 120 : 160)] }) },
                            { rotate: '45deg' },
                          ],
                        },
                      ]}
                    />
                  ))}
                  <Animated.View
                    style={[
                      s.item,
                      {
                        opacity: item.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
                        transform: [
                          { perspective: 800 },
                          { rotateY: item.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
                          { scale: item.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                        ],
                      },
                    ]}
                  >
                    <View style={s.itemIcon}>
                      <RewardPicture milestone={milestone} size={72} />
                    </View>
                    <Text style={s.itemName}>{milestone.reward?.label ?? `+${milestone.bonusXp} XP bonus`}</Text>
                    {milestone.reward?.token && <Text style={s.itemDesc}>{TOKEN_INFO[milestone.reward.token].description}</Text>}
                    {(milestone.reward?.kind === 'frame' || milestone.reward?.kind === 'title') && <Text style={s.itemDesc}>Wear it from your profile.</Text>}
                    {(milestone.reward?.kind === 'flame' || milestone.reward?.kind === 'celebration') && (
                      <Text style={s.itemDesc}>Pick it in your inventory at the top right, under Customise your app.</Text>
                    )}
                    <Text style={s.itemMeta}>
                      Level {milestone.level} reward{milestone.reward && milestone.bonusXp ? ` · +${milestone.bonusXp} XP` : ''}
                    </Text>
                  </Animated.View>
                </View>
                <Animated.View style={{ opacity: item }}>
                  <Pressable onPress={() => close(onCollect)} style={s.collect} accessibilityRole="button">
                    <Text style={s.collectText}>Collect</Text>
                  </Pressable>
                </Animated.View>
              </>
            )
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = themed((c) => ({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 },
  fill: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.bg, opacity: 0.94 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  rays: { position: 'absolute', width: 520, height: 520, alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 2, height: 520, backgroundColor: brandLine(c), opacity: c.dark ? 0.13 : 0.2 },
  ring: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: brandLine(c), boxShadow: `0px 0px 18px ${brandGlow(0.5)}` },
  eyebrow: { ...eyebrow(c, 13), color: c.label, letterSpacing: 4 },
  rank: { fontFamily: FONTS.serifItalic, color: c.text, fontSize: 22 },
  hint: { color: c.faint, fontSize: 13, marginTop: 28 },
  itemWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 18 },
  item: {
    width: 220,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: brandLine(c),
    borderRadius: c.radius + 4,
    boxShadow: `0px 0px 40px ${brandGlow(0.4)}`,
  },
  itemIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  itemName: { fontFamily: FONTS.serif, color: c.text, fontSize: 22, textAlign: 'center' },
  itemMeta: { ...eyebrow(c, 11), color: c.muted, textAlign: 'center' },
  itemDesc: { color: c.muted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 6, marginBottom: 2 },
  spark: { position: 'absolute', width: 9, height: 9 },
  sparkSmall: { width: 6, height: 6 },
  collect: { ...brandFill(c), minHeight: 54, minWidth: 220, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  collectText: { fontFamily: VIVID_HEAVY, fontSize: 17, color: brandInk(c), ...brandTextShadow(c) },
}));
