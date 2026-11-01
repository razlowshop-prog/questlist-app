import { Pressable, Text, View } from 'react-native';
import { rewardLabel, TIER_NAMES, type AchievementStatus } from '../achievements';
import { card, themed, useStyles, FONTS, headingCase } from '../theme';
import { brandFillSmall, brandInk, brandTextShadow, fill, GradientText, Sticker, StickerHeading, VIVID_HEAVY } from './Vivid';
import { achievementTierLook, brandGlow, brandLine, ICON_GLYPHS, RARITY } from '../vivid';
import { t } from '../i18n';

/**
 * Achievement tiers to reach and claim, claimable ones first, then the rewards
 * won so far. Part of the Awards page on the profile.
 */
export function Achievements({
  achievements,
  onClaim,
}: {
  achievements: AchievementStatus[];
  onClaim: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  const earned = achievements.reduce((n, a) => n + Math.min(a.claimed, a.def.tiers.length), 0);
  const total = achievements.reduce((n, a) => n + a.def.tiers.length, 0);
  // Claimable ones first.
  const sorted = [...achievements].sort(
    (a, b) => Number(b.reached > b.claimed) - Number(a.reached > a.claimed),
  );

  return (
    <View>
      <StickerHeading glyph="Medal" grad={RARITY.legendary}>
        <Text style={s.heading}>{t('Achievements')}</Text>
      </StickerHeading>
      <Text style={s.sub}>
        {t('{n} of {total} tiers claimed · reach a tier, then claim your XP and rewards', { n: earned, total })}
      </Text>

      {sorted.map((a) => {
        const claimable = a.reached > a.claimed;
        const tierToClaim = a.def.tiers[a.claimed];
        const shownTier = claimable ? tierToClaim : a.next;
        const prevGoal = a.reached > 0 ? a.def.tiers[a.reached - 1].goal : 0;
        const pct = a.next ? Math.min(1, Math.max(0, (a.value - prevGoal) / (a.next.goal - prevGoal))) : 1;
        // Not found yet: no name, goal or progress, only that there is one.
        if (a.def.secret && a.reached === 0) {
          return (
            <View key={a.def.id} style={s.card}>
              <View style={s.row}>
                <Sticker grad={achievementTierLook(0)} glyph={ICON_GLYPHS.Shield} size={48} dim />
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{t('Secret achievement')}</Text>
                  <Text style={s.desc}>{t('Keep playing around to find it.')}</Text>
                </View>
                <GradientText style={s.reward}>???</GradientText>
              </View>
            </View>
          );
        }
        return (
          <View key={a.def.id} style={[s.card, claimable && s.cardClaimable]}>
            <View style={s.row}>
              <Sticker grad={achievementTierLook(Math.max(0, a.claimed - 1))} mythic={a.claimed >= 7} glyph={ICON_GLYPHS[a.def.icon]} size={48} dim={a.claimed === 0} />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{t(a.def.title)}</Text>
                <Text style={s.desc}>
                  {shownTier ? a.def.description(shownTier.goal) : t('All tiers complete!')}
                </Text>
              </View>
              {claimable ? (
                <Pressable onPress={() => onClaim(a.def.id)} style={s.claim} accessibilityRole="button">
                  <Text style={s.claimText}>{t('Claim +{n}', { n: tierToClaim.xp })}</Text>
                </Pressable>
              ) : shownTier ? (
                <GradientText style={s.reward}>+{shownTier.xp} XP</GradientText>
              ) : (
                <GradientText style={s.reward}>{t('COMPLETE')}</GradientText>
              )}
            </View>

            <View style={s.tiers}>
              {a.def.tiers.map((tier, i) => (
                <View
                  key={tier.goal}
                  style={[
                    s.tierDot,
                    i < a.claimed && { ...fill(achievementTierLook(i)), borderColor: 'transparent' },
                    i >= a.claimed && i < a.reached && { borderColor: achievementTierLook(i).c2 },
                  ]}
                >
                  <Text style={[s.tierGoal, i < a.claimed && { color: achievementTierLook(i).ink }]}>{tier.goal}</Text>
                </View>
              ))}
            </View>

            {a.next && (
              <>
                <View style={s.track}>
                  <View style={[s.fill, fill(achievementTierLook(a.reached), 90), { width: `${Math.round(pct * 100)}%` }]} />
                </View>
                <Text style={s.progress}>
                  {a.value} / {a.next.goal} {t(a.def.unit)} · {t('next: {tier}', { tier: t(TIER_NAMES[a.reached]) })}
                  {a.next.reward ? ` · ${t('unlocks {reward}', { reward: rewardLabel(a.next.reward) })}` : ''}
                </Text>
              </>
            )}
            {claimable && tierToClaim.reward && (
              <Text style={s.unlock}>{t('Claim to unlock {reward}', { reward: rewardLabel(tierToClaim.reward) })}</Text>
            )}
          </View>
        );
      })}

    </View>
  );
}

const makeStyles = themed((c) => ({
  heading: { fontFamily: FONTS.serif, color: c.text, fontSize: 19, lineHeight: 24, ...headingCase(c) },
  subHeading: { fontSize: 19, lineHeight: 24, marginTop: 22 },
  sub: { color: c.muted, fontSize: 14, marginTop: 4, marginBottom: 16 },
  card: { ...card(c), padding: 14, marginBottom: 10, gap: 10 },
  cardClaimable: { borderWidth: 1.5, borderColor: brandLine(c), boxShadow: `0px 0px 16px ${brandGlow(0.3)}` },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: c.text, fontSize: 16, fontWeight: '700' },
  desc: { color: c.muted, fontSize: 13, marginTop: 2 },
  reward: { fontFamily: VIVID_HEAVY, fontSize: 14 },
  claim: { ...brandFillSmall(c), paddingHorizontal: 14, minHeight: 38, justifyContent: 'center', borderRadius: 12 },
  claimText: { color: brandInk(c), fontFamily: VIVID_HEAVY, fontSize: 13, ...brandTextShadow(c) },
  tiers: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tierDot: {
    minWidth: 34,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: c.radius,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierGoal: { color: c.muted, fontSize: 11, fontWeight: '700' },
  track: { height: c.lineWeight, borderRadius: c.lineWeight / 2, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: '100%' },
  progress: { color: c.muted, fontSize: 12, marginTop: -4 },
  unlock: { color: c.gold, fontSize: 12, fontWeight: '700' },
}));
