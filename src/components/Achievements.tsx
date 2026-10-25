import { Pressable, Text, View } from 'react-native';
import { TIER_NAMES, type AchievementStatus, type Reward } from '../achievements';
import { card, themed, useStyles, FONTS, headingCase } from '../theme';
import { brandFillSmall, brandInk, brandTextShadow, fill, GradientText, Sticker, StickerHeading, VIVID_HEAVY } from './Vivid';
import { achievementTierLook, brandGlow, brandLine, ICON_GLYPHS, RARITY } from '../vivid';

/**
 * Achievement tiers to reach and claim, claimable ones first, then the rewards
 * won so far. Part of the Awards page on the profile.
 */
export function Achievements({
  achievements,
  rewards,
  onClaim,
}: {
  achievements: AchievementStatus[];
  rewards: Reward[];
  onClaim: (id: string) => void;
}) {
  const s = useStyles(makeStyles);
  // Tokens are counted in the inventory; here only what stays: themes, titles, looks, ad-free and Premium time.
  const shown = rewards.filter((r) => r.kind !== 'token');
  const earned = achievements.reduce((n, a) => n + Math.min(a.claimed, a.def.tiers.length), 0);
  const total = achievements.reduce((n, a) => n + a.def.tiers.length, 0);
  // Claimable ones first.
  const sorted = [...achievements].sort(
    (a, b) => Number(b.reached > b.claimed) - Number(a.reached > a.claimed),
  );

  return (
    <View>
      <StickerHeading glyph="Medal" grad={RARITY.legendary}>
        <Text style={s.heading}>Achievements</Text>
      </StickerHeading>
      <Text style={s.sub}>
        {earned} of {total} tiers claimed · reach a tier, then claim your XP and rewards
      </Text>

      {sorted.map((a) => {
        const claimable = a.reached > a.claimed;
        const tierToClaim = a.def.tiers[a.claimed];
        const shownTier = claimable ? tierToClaim : a.next;
        const prevGoal = a.reached > 0 ? a.def.tiers[a.reached - 1].goal : 0;
        const pct = a.next ? Math.min(1, Math.max(0, (a.value - prevGoal) / (a.next.goal - prevGoal))) : 1;
        return (
          <View key={a.def.id} style={[s.card, claimable && s.cardClaimable]}>
            <View style={s.row}>
              <Sticker grad={achievementTierLook(Math.max(0, a.claimed - 1))} mythic={a.claimed >= 7} glyph={ICON_GLYPHS[a.def.icon]} size={48} dim={a.claimed === 0} />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{a.def.title}</Text>
                <Text style={s.desc}>
                  {shownTier ? a.def.description(shownTier.goal) : 'All tiers complete!'}
                </Text>
              </View>
              {claimable ? (
                <Pressable onPress={() => onClaim(a.def.id)} style={s.claim} accessibilityRole="button">
                  <Text style={s.claimText}>Claim +{tierToClaim.xp}</Text>
                </Pressable>
              ) : shownTier ? (
                <GradientText style={s.reward}>+{shownTier.xp} XP</GradientText>
              ) : (
                <GradientText style={s.reward}>COMPLETE</GradientText>
              )}
            </View>

            <View style={s.tiers}>
              {a.def.tiers.map((t, i) => (
                <View
                  key={t.goal}
                  style={[
                    s.tierDot,
                    i < a.claimed && { ...fill(achievementTierLook(i)), borderColor: 'transparent' },
                    i >= a.claimed && i < a.reached && { borderColor: achievementTierLook(i).c2 },
                  ]}
                >
                  <Text style={[s.tierGoal, i < a.claimed && { color: achievementTierLook(i).ink }]}>{t.goal}</Text>
                </View>
              ))}
            </View>

            {a.next && (
              <>
                <View style={s.track}>
                  <View style={[s.fill, fill(achievementTierLook(a.reached), 90), { width: `${Math.round(pct * 100)}%` }]} />
                </View>
                <Text style={s.progress}>
                  {a.value} / {a.next.goal} {a.def.unit} · next: {TIER_NAMES[a.reached]}
                  {a.next.reward ? ` · unlocks ${a.next.reward.label}` : ''}
                </Text>
              </>
            )}
            {claimable && tierToClaim.reward && (
              <Text style={s.unlock}>Claim to unlock {tierToClaim.reward.label}</Text>
            )}
          </View>
        );
      })}

      <StickerHeading glyph="Gift" grad={RARITY.epic} style={{ marginTop: 22 }}>
        <Text style={[s.heading, s.subHeading, { marginTop: 0 }]}>Your rewards</Text>
      </StickerHeading>
      {shown.length === 0 ? (
        <Text style={s.sub}>Claim achievement tiers and reach new levels to unlock themes, titles, frames and more.</Text>
      ) : (
        <View style={s.rewards}>
          {shown.map((r, i) => (
            <View key={i} style={s.rewardChip}>
              <Text style={s.rewardChipText}>
                {r.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={[s.sub, { marginTop: 10 }]}>Tokens are in your bag at the top right, where you can also wear your looks.</Text>
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
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rewardChip: { ...card(c), borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderColor: brandLine(c), borderWidth: 1.5 },
  rewardChipText: { color: c.text, fontSize: 13, fontWeight: '600' },
}));
