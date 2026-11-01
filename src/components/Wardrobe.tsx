import { memo, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CATEGORIES } from '../library';
import { formName, AREA_GOAL, outfitCounts, outfitDrawing, outfitList, outfitName, RARITY_LABEL, wornOutfits, type Outfit, type OutfitSlot } from '../outfits';
import type { GameState } from '../game';
import { card, themed, useStyles } from '../theme';
import { N, t } from '../i18n';
import { Bizzy } from './Bizzy';
import { Chip } from './Chip';
import { RARITY_COLORS } from './PrizeSticker';

/** Outfit rarity (1 Rare, 2 Epic, 3 Legendary) in the rewards layer's colours. */
export const OUTFIT_COLORS: Record<Outfit['rarity'], string> = {
  1: RARITY_COLORS.uncommon.label,
  2: RARITY_COLORS.rare.label,
  3: RARITY_COLORS.legendary.label,
};

const SLOT_NAMES: Record<OutfitSlot, string> = { head: N('Hats'), face: N('Glasses'), neck: N('Neck'), back: N('Capes') };
const PER_ROW = 4;

/** How to get an outfit not owned yet. */
function howToGet(outfit: Outfit, progress?: number): string {
  if (outfit.area) {
    const area = CATEGORIES.find((c) => c.id === outfit.area);
    const tasks = t('Finish {goal} tasks in {area}: {n} of {goal} done.', { goal: AREA_GOAL, area: area ? t(area.label) : outfit.area, n: progress ?? 0 });
    return `${tasks} ${t('Or win it sooner on the lucky wheel’s {rarity} slice.', { rarity: t(RARITY_LABEL[outfit.rarity]) })}`;
  }
  return t('Win it on the lucky wheel’s {rarity} slice.', { rarity: t(RARITY_LABEL[outfit.rarity]) });
}

/**
 * The Outfits tab of the inventory (design "Outfits, in their own inventory
 * tab"): Bizzy on a little stage wearing what he has on, slot filters, and
 * every outfit as Bizzy wearing just that piece. Owned ones come first,
 * rarest first; tap one to put it on or take it off. The rest are faded and
 * say how to get them when tapped.
 */
export function Wardrobe({ state, form, onToggle }: { state: GameState; form: number; onToggle: (id: string) => void }) {
  const s = useStyles(makeStyles);
  const [slot, setSlot] = useState<OutfitSlot | 'all'>('all');
  const [hint, setHint] = useState<{ outfit: Outfit; text: string } | null>(null);
  const worn = wornOutfits(state);
  const wornKey = JSON.stringify(worn);
  const drawing = useMemo(() => outfitDrawing(worn), [wornKey]);
  const list = useMemo(() => outfitList(state), [state.completions, state.tasks, state.wheelSpins]);
  const counts = useMemo(() => outfitCounts(state), [list]);
  const shown = list.filter((x) => slot === 'all' || x.outfit.slot === slot);
  const rows: (typeof shown)[] = [];
  for (let i = 0; i < shown.length; i += PER_ROW) rows.push(shown.slice(i, i + PER_ROW));
  const names = Object.values(worn)
    .map((id) => list.find((x) => x.outfit.id === id)?.outfit)
    .filter((o): o is Outfit => !!o)
    .map(outfitName);

  return (
    <View style={{ gap: 10 }}>
      <View style={s.stage}>
        <Text style={s.stageName} numberOfLines={2}>
          {formName(form)}
          {names.length ? ` · ${names.join(', ')}` : ''}
        </Text>
        <Bizzy size={136} motion="idle" outfit={drawing ?? null} />
      </View>
      <View style={s.counts}>
        {([1, 2, 3] as const).map((r) => (
          <Text key={r} style={[s.count, { color: OUTFIT_COLORS[r] }]}>
            {t(RARITY_LABEL[r])} {counts[r][0]}/{counts[r][1]}
          </Text>
        ))}
      </View>
      <View style={s.chips}>
        <Chip label={t('All')} active={slot === 'all'} onPress={() => setSlot('all')} />
        {(Object.keys(SLOT_NAMES) as OutfitSlot[]).map((k) => (
          <Chip key={k} label={t(SLOT_NAMES[k])} active={slot === k} onPress={() => setSlot(k)} />
        ))}
      </View>
      {hint && (
        <Pressable onPress={() => setHint(null)} style={s.hint} accessibilityRole="button" accessibilityLabel={`${outfitName(hint.outfit)}. ${hint.text} ${t('Tap to close')}`}>
          <Text style={s.hintTitle}>
            {outfitName(hint.outfit)} <Text style={{ color: OUTFIT_COLORS[hint.outfit.rarity] }}>· {t(RARITY_LABEL[hint.outfit.rarity])}</Text>
          </Text>
          <Text style={s.hintText}>{hint.text}</Text>
        </Pressable>
      )}
      <View style={{ gap: 8 }}>
        {rows.map((row, r) => (
          <View key={r} style={s.row}>
            {Array.from({ length: PER_ROW }, (_, j) => {
              const x = row[j];
              if (!x) return <View key={j} style={s.spacer} />;
              return (
                <Item
                  key={x.outfit.id}
                  outfit={x.outfit}
                  owned={x.owned}
                  on={worn[x.outfit.slot] === x.outfit.id}
                  onPress={() => {
                    if (x.owned) {
                      setHint(null);
                      onToggle(x.outfit.id);
                    } else setHint({ outfit: x.outfit, text: howToGet(x.outfit, x.progress) });
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <Text style={s.note}>{t('Outfits are earned, never bought: 50 tasks in an area, or the wheel’s outfit slices. The wheel never gives one twice.')}</Text>
    </View>
  );
}

/** One outfit: Bizzy wearing just that piece, its name and a rarity line. */
const Item = memo(function Item({ outfit, owned, on, onPress }: { outfit: Outfit; owned: boolean; on: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const piece = useMemo(() => outfitDrawing({ [outfit.slot]: outfit.id }), [outfit.id]);
  const name = outfitName(outfit);
  const rarity = t(RARITY_LABEL[outfit.rarity]);
  return (
    <Pressable
      onPress={onPress}
      style={[s.item, on && { borderColor: OUTFIT_COLORS[outfit.rarity], borderWidth: 2 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: !owned }}
      accessibilityLabel={`${name}, ${rarity}${owned ? (on ? `, ${t('wearing')}` : '') : `, ${t('not won yet')}`}`}
    >
      <View style={{ opacity: owned ? 1 : 0.28 }}>
        <Bizzy size={54} motion="none" flap={false} outfit={piece} />
      </View>
      {!owned && <Text style={s.lock}>?</Text>}
      <Text style={s.name} numberOfLines={2}>
        {name}
      </Text>
      <View style={[s.rarity, { backgroundColor: OUTFIT_COLORS[outfit.rarity] }]} />
    </Pressable>
  );
});

const makeStyles = themed((c) => ({
  stage: { ...card(c), height: 180, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, overflow: 'hidden' },
  stageName: { position: 'absolute', left: 12, top: 10, right: 12, color: c.faint, fontSize: 12 },
  counts: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  count: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  spacer: { flex: 1 },
  item: { ...card(c), flex: 1, padding: 0, paddingTop: 4, paddingBottom: 9, paddingHorizontal: 2, alignItems: 'center', gap: 0, minWidth: 0 },
  lock: { position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center', color: c.text, fontSize: 20, fontWeight: '800' },
  name: { color: c.muted, fontSize: 10.5, lineHeight: 12.5, height: 25, textAlign: 'center', paddingHorizontal: 2 },
  rarity: { position: 'absolute', left: 8, right: 8, bottom: 3, height: 3, borderRadius: 3 },
  hint: { ...card(c), padding: 12, gap: 3 },
  hintTitle: { color: c.text, fontSize: 14, fontWeight: '800' },
  hintText: { color: c.muted, fontSize: 13, lineHeight: 18 },
  note: { color: c.faint, fontSize: 12, lineHeight: 17, marginTop: 4 },
  show: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 12 },
  pedestal: { width: 104, height: 112, borderRadius: 16, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4, backgroundColor: c.surface },
  showTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
  showSmall: { color: c.faint, fontSize: 12 },
  evo: { flexDirection: 'row', gap: 3 },
  pip: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border },
  pipOn: { backgroundColor: c.accent },
  rbar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rname: { width: 66, fontSize: 11, fontWeight: '800' },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' },
  rcount: { width: 34, textAlign: 'right', color: c.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
}));

/**
 * Bizzy's showcase card on the profile (design "Bizzy's showcase card"): him
 * on a pedestal in what he wears, his form and evolution track, outfits
 * collected per rarity and a few of them. Tap it for the whole wardrobe.
 */
export function BizzyShowcase({ state, form, onOpen }: { state: GameState; form: number; onOpen: () => void }) {
  const s = useStyles(makeStyles);
  const worn = wornOutfits(state);
  const wornKey = JSON.stringify(worn);
  const drawing = useMemo(() => outfitDrawing(worn), [wornKey]);
  const list = useMemo(() => outfitList(state), [state.completions, state.tasks, state.wheelSpins]);
  const counts = useMemo(() => outfitCounts(state), [list]);
  const owned = list.filter((x) => x.owned).length;
  return (
    <Pressable
      onPress={onOpen}
      style={s.show}
      accessibilityRole="button"
      accessibilityLabel={`${t('Your Bizzy')}: ${formName(form)}. ${t('Form {n} of {total}', { n: form, total: 10 })}. ${t('Outfits {n} of {total}', { n: owned, total: list.length })}. ${t('Open outfits')}`}
    >
      <View style={s.pedestal}>
        <Bizzy size={96} motion="idle" outfit={drawing ?? null} />
      </View>
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <Text style={s.showTitle} numberOfLines={1}>
          {t('Your Bizzy')} · {formName(form)}
        </Text>
        <View style={s.evo}>
          {Array.from({ length: 10 }, (_, i) => (
            <View key={i} style={[s.pip, i < form && s.pipOn]} />
          ))}
        </View>
        <Text style={s.showSmall}>
          {t('Form {n} of {total}', { n: form, total: 10 })} · {t('Outfits {n} of {total}', { n: owned, total: list.length })}
        </Text>
        {([1, 2, 3] as const).map((r) => (
          <View key={r} style={s.rbar}>
            <Text style={[s.rname, { color: OUTFIT_COLORS[r] }]}>{t(RARITY_LABEL[r])}</Text>
            <View style={s.track}>
              <View style={{ width: `${(counts[r][0] / counts[r][1]) * 100}%`, height: '100%', borderRadius: 3, backgroundColor: OUTFIT_COLORS[r] }} />
            </View>
            <Text style={s.rcount}>
              {counts[r][0]}/{counts[r][1]}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
