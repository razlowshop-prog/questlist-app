import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { TokenKind } from '../achievements';
import { Chip } from '../components/Chip';
import { Stepper } from '../components/Stepper';
import { VividButton, VividSwitch } from '../components/Vivid';
import {
  addDevTickets,
  addDevTokens,
  addDevXp,
  clearDev,
  DEV_MULTIPLIERS,
  devDays,
  hasDevChanges,
  setDevLevel,
  setDevMultiplier,
  setDevStreak,
  setUnlockAll,
  setBubbleSpot,
  setDoneMoment,
} from '../devTools';
import { updateInfo } from '../appUpdate';
import { currentStreak, levelInfo, MAX_LEVEL, restDaysOf, totalXp, type GameState } from '../game';
import { num } from '../i18n';
import { themed, useStyles } from '../theme';
import { tokenCounts } from '../tokens';
import { MenuGroup, MenuRow } from './MenuScreen';

// Test builds only (devTools.ts), so the page is in English and not translated.

const TOKENS: { kind: TokenKind; label: string }[] = [
  { kind: 'rest', label: 'Rest days' },
  { kind: 'double', label: 'Double XP' },
  { kind: 'reroll', label: 'Challenge swaps' },
  { kind: 'adfree', label: 'Ad-free days' },
];

const LEVEL_JUMPS = [5, 10, 25, 50, 100];
const XP_STEPS = [100, 1000, 10000];
const STREAK_DAYS = [0, 3, 7, 30, 100];

/** Menu → Developer: jump to a level, multiply XP, own every look, fill the bag and fake a streak. */
const DONE_MOMENTS = [
  ['check', 'A Honey check'],
  ['rain', 'B Honey rain'],
  ['stamp', 'C Trophy stamp'],
  ['rays', 'D Sun rays'],
] as const;

const BUBBLE_SPOTS = [
  ['row', 'Now'],
  ['above', 'A Above'],
  ['left', 'B Left'],
  ['week', 'C Week row'],
  ['float', 'D Floating'],
] as const;

export function DevScreen({ state, today, onChange, onReplayDone }: { state: GameState; today: string; onChange: (next: GameState) => void; onReplayDone: () => void }) {
  const s = useStyles(makeStyles);
  const xp = totalXp(state);
  const level = levelInfo(xp).level;
  const [pick, setPick] = useState(level);
  // The picker follows the level when it changes another way (XP buttons, a ticked task).
  useEffect(() => setPick(level), [level]);
  const multiplier = state.dev?.multiplier ?? 1;
  const tokens = tokenCounts(state);
  const streak = currentStreak(state.completions, today, restDaysOf(state));
  const madeUp = devDays(state);
  const code = updateInfo();

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.intro}>
        Only in test builds. The store version has no Developer page and drops these changes, so they can’t be used to cheat.
      </Text>

      <MenuGroup label="App version">
        <MenuRow
          first
          label={code.builtIn ? 'Code from the build' : `Update from ${code.when ? code.when.toLocaleString() : 'unknown time'}`}
          sub={`Update ${code.id.slice(0, 8)} · channel ${code.channel} · runtime ${code.runtime.slice(0, 8)}`}
        />
      </MenuGroup>

      <MenuGroup label="All-done animation">
        <MenuRow first label="Pick one, then play it on Today" sub="A honey check (now) · B honey rain · C trophy stamp · D sun rays. Ticking your last task of the day plays the picked one too." />
        <View style={s.chips}>
          {DONE_MOMENTS.map(([kind, label]) => (
            <Chip key={kind} label={label} active={(state.dev?.doneMoment ?? 'check') === kind} onPress={() => onChange(setDoneMoment(state, kind))} />
          ))}
        </View>
        <View style={s.block}>
          <VividButton compact label="Play on Today" onPress={onReplayDone} />
        </View>
      </MenuGroup>

      <MenuGroup label="Bizzy's bubble on the streak card">
        <MenuRow first label="Pick where it shows, then tap Bizzy on Today" sub="Now: a line under him (moves the card) · A above him · B left of him · C instead of the week · D floating under him" />
        <View style={s.chips}>
          {BUBBLE_SPOTS.map(([spot, label]) => (
            <Chip key={spot} label={label} active={(state.dev?.bubbleSpot ?? 'row') === spot} onPress={() => onChange(setBubbleSpot(state, spot))} />
          ))}
        </View>
      </MenuGroup>

      <MenuGroup label="Level">
        <MenuRow first label={`Level ${level}`} sub={`${num(xp)} XP in total${state.dev?.xp ? `, ${state.dev.xp > 0 ? '+' : ''}${num(state.dev.xp)} from this page` : ''}`} />
        <View style={s.block}>
          <Stepper value={pick} min={1} max={MAX_LEVEL} format={(v) => `Level ${v}`} onChange={setPick} label="level to jump to" />
          <VividButton compact label={`Go to level ${pick}`} disabled={pick === level} onPress={() => onChange(setDevLevel(state, pick))} />
          <View style={s.chips}>
            {LEVEL_JUMPS.map((n) => (
              <Chip key={n} label={`Level ${n}`} active={level === n} onPress={() => onChange(setDevLevel(state, n))} />
            ))}
          </View>
          <View style={s.chips}>
            {XP_STEPS.map((n) => (
              <Chip key={n} label={`+${num(n)} XP`} active={false} onPress={() => onChange(addDevXp(state, n))} />
            ))}
          </View>
        </View>
      </MenuGroup>

      <MenuGroup label="XP multiplier">
        <MenuRow first label="On every finished task" sub="Shows as “Test” next to the streak bonus." />
        <View style={[s.block, s.chips]}>
          {DEV_MULTIPLIERS.map((x) => (
            <Chip key={x} label={`×${x}`} active={multiplier === x} onPress={() => onChange(setDevMultiplier(state, x))} />
          ))}
        </View>
      </MenuGroup>

      <MenuGroup label="Unlocks">
        <MenuRow
          first
          label="Unlock everything"
          sub="Every theme, frame, title, flame and celebration."
          right={<VividSwitch value={!!state.dev?.unlockAll} onValueChange={(v) => onChange(setUnlockAll(state, v))} accessibilityLabel="Unlock everything" />}
        />
      </MenuGroup>

      <MenuGroup label="Streak">
        <MenuRow first label={`${streak}-day streak`} sub={`Counts that many days before today as done (${madeUp} made-up days now).`} />
        <View style={[s.block, s.chips]}>
          {STREAK_DAYS.map((n) => (
            <Chip key={n} label={n ? `${n} days` : 'None'} active={false} onPress={() => onChange(setDevStreak(state, n, today))} />
          ))}
        </View>
      </MenuGroup>

      <MenuGroup label="Bag">
        {TOKENS.map((tk, i) => (
          <MenuRow
            key={tk.kind}
            first={i === 0}
            label={tk.label}
            sub={`${tokens[tk.kind]} in the bag`}
            right={<Chip label="+3" active={false} onPress={() => onChange(addDevTokens(state, tk.kind, 3))} />}
          />
        ))}
        <MenuRow label="Wheel tickets" right={<Chip label="+5" active={false} onPress={() => onChange(addDevTickets(state, 5))} />} />
      </MenuGroup>

      <VividButton
        kind="secondary"
        label="Undo all test changes"
        disabled={!hasDevChanges(state)}
        onPress={() => onChange(clearDev(state))}
        style={{ marginTop: 24 }}
      />
      <Text style={s.note}>
        Takes away the test XP, multiplier, unlocks, extra tokens and tickets and the made-up days. Awards claimed and prizes won while testing stay; Settings → Reset all progress starts from zero.
      </Text>
    </ScrollView>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 0, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  intro: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  block: { gap: 10, paddingBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { color: c.muted, fontSize: 12, lineHeight: 17, marginTop: 10, textAlign: 'center' },
}));
