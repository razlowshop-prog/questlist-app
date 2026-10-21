import { loadAsync } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { XpHeader } from './src/components/XpHeader';
import {
  addTask,
  claimChallenge,
  currentStreak,
  dayKey,
  deleteTask,
  emptyState,
  finishSetup,
  isDoneToday,
  levelInfo,
  limitMessage,
  profileStats,
  setName,
  streakBonus,
  toggleTask,
  totalXp,
  updateSettings,
  visibleTasks,
  withDefaults,
  weeklyChallenges,
  type GameState,
  type Task,
} from './src/game';
import { achievementStatuses, claimableCount, claimAchievement, TIER_NAMES, unlockedRewards } from './src/achievements';
import { AchievementsScreen } from './src/screens/AchievementsScreen';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { LibraryModal } from './src/screens/LibraryModal';
import { SetupScreen, type SetupPick } from './src/screens/SetupScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import type { LibraryTask } from './src/library';
import { fontFilesFor } from './src/fonts';
import { loadState, saveState } from './src/storage';
import { eyebrow, nativeDriver, themeById, themed, ThemeProvider, THEMES, withFonts } from './src/theme';

/** Browser previews are built with this on so every theme can be tried without unlocking it. */
const PREVIEW_ALL_THEMES = process.env.EXPO_PUBLIC_UNLOCK_THEMES === '1';

type Tab = 'today' | 'challenges' | 'awards' | 'profile';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'awards', label: 'Awards' },
  { key: 'profile', label: 'Profile' },
];

export default function App() {
  const [state, setState] = useState<GameState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [redoSetup, setRedoSetup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  // Theme whose fonts are loaded and which is on screen; a newly picked theme
  // shows once its fonts are ready, so text never flashes in a missing font.
  const [shownThemeId, setShownThemeId] = useState<string | null>(null);

  // Recomputed on each render so the list rolls over after midnight.
  const today = dayKey();

  useEffect(() => {
    loadState().then((s) => {
      setState(withDefaults(s, dayKey()));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const xp = totalXp(state);
  const streak = currentStreak(state.completions, today);
  const tasks = useMemo(() => visibleTasks(state, today), [state, today]);
  const challenges = useMemo(() => weeklyChallenges(state, today), [state, today]);
  const readyToClaim = challenges.filter((c) => c.complete && !c.claimed).length;
  const achievements = useMemo(() => achievementStatuses(state, today), [state, today]);
  const awardsToClaim = claimableCount(state, today);
  const addedTitles = useMemo(() => new Set(state.tasks.map((t) => t.title)), [state.tasks]);
  const rewards = useMemo(() => unlockedRewards(state), [state.achievementClaims]);
  const unlockedThemes = useMemo(() => {
    const labels = new Set(rewards.map((r) => r.label));
    return new Set(THEMES.filter((t) => !t.reward || labels.has(t.reward) || PREVIEW_ALL_THEMES).map((t) => t.id));
  }, [rewards]);
  const wantedTheme = themeById(unlockedThemes.has(state.settings.theme) ? state.settings.theme : 'classic');
  const theme = themeById(shownThemeId ?? wantedTheme.id);
  const c = theme.palette;

  useEffect(() => {
    if (!loaded) return;
    let current = true;
    // A font that fails to load falls back to the system font; the theme still applies.
    loadAsync(fontFilesFor(wantedTheme.palette.fonts))
      .catch((e) => console.warn('Fonts failed to load', e))
      .finally(() => current && setShownThemeId(wantedTheme.id));
    return () => {
      current = false;
    };
  }, [loaded, wantedTheme.id]);
  const styles = useMemo(() => StyleSheet.create(withFonts(makeStyles(c), c.fonts)), [c]);
  const statusBar = c.dark ? 'light' : 'dark';

  function addFromLibrary(s: GameState, t: LibraryTask, perWeek = t.perWeek): GameState {
    return addTask(s, t.title, t.difficulty, perWeek === 0 ? false : perWeek, undefined, t.minutes);
  }

  function onSetupDone(name: string, goals: string[], picks: SetupPick[]) {
    let next = finishSetup(state, name, goals);
    for (const p of picks) {
      if (!next.tasks.some((t) => t.title === p.task.title)) next = addFromLibrary(next, p.task, p.perWeek);
    }
    setState(next);
    setRedoSetup(false);
    setTab('today');
    if (picks.length) setTimeout(() => showToast(`${picks.length} ${picks.length === 1 ? 'task' : 'tasks'} added. Let's begin.`), 300);
  }

  function showToast(message: string) {
    setToast(message);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: nativeDriver }),
    ]).start(() => setToast(null));
  }

  /** Applies a change and celebrates a level-up. Returns the XP gained. */
  function apply(next: GameState): number {
    const gained = totalXp(next) - xp;
    const before = levelInfo(xp);
    const after = levelInfo(totalXp(next));
    setState(next);
    if (after.level > before.level) {
      setTimeout(() => showToast(`Level ${after.level}.${after.rank !== before.rank ? ` You are now ${after.rank}.` : ''}`), 500);
    }
    return gained;
  }

  function onToggle(task: Task): { xp: number; note?: string } {
    const wasDone = isDoneToday(state, task, today);
    const next = toggleTask(state, task.id, today, Date.now());
    if (next === state) return { xp: 0 };
    const gained = apply(next);
    if (wasDone) return { xp: 0 };
    const limited = next.completions[next.completions.length - 1].limited;
    return { xp: gained, note: limited ? limitMessage(limited) : undefined };
  }

  function onClaim(id: string) {
    const gained = apply(claimChallenge(state, id, today));
    if (gained > 0) showToast(`Challenge complete · +${gained} XP`);
  }

  function onClaimAchievement(id: string) {
    const { state: next, tier } = claimAchievement(state, id, today);
    if (!tier) return;
    const tierName = TIER_NAMES[next.achievementClaims[next.achievementClaims.length - 1].tier];
    apply(next);
    showToast(`${tierName} trophy · +${tier.xp} XP${tier.reward ? ` · ${tier.reward.label} unlocked` : ''}`);
  }

  const toastStyle = {
    opacity: toastAnim,
    transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  // Plain background until saved data and the theme's fonts are ready.
  if (!shownThemeId) return <View style={styles.safe} />;

  if (loaded && (!state.onboarded || redoSetup)) {
    return (
      <ThemeProvider palette={c}>
        <StatusBar style={statusBar} />
        <SetupScreen
          initialName={state.profile.name}
          initialGoals={state.goals}
          onFinish={onSetupDone}
          onSkip={() => {
            setState({ ...state, onboarded: true });
            setRedoSetup(false);
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider palette={c}>
      <SafeAreaView style={styles.safe}>
        <StatusBar style={statusBar} />
        <XpHeader totalXp={xp} streak={streak} bonus={streakBonus(streak)} />

        <View style={{ flex: 1 }}>
          {tab === 'today' && (
            <TodayScreen
              state={state}
              tasks={tasks}
              today={today}
              loaded={loaded}
              addedTitles={addedTitles}
              onAdd={(title, difficulty, repeat, minutes) =>
                setState(addTask(state, title, difficulty, repeat, undefined, minutes))
              }
              onAddFromLibrary={(t) => setState(addFromLibrary(state, t))}
              onOpenLibrary={() => setLibraryOpen(true)}
              onToggle={onToggle}
              onDelete={(task) => setState(deleteTask(state, task.id))}
            />
          )}
          {tab === 'challenges' && <ChallengesScreen challenges={challenges} today={today} onClaim={onClaim} />}
          {tab === 'awards' && (
            <AchievementsScreen
              achievements={achievements}
              rewards={rewards}
              onClaim={onClaimAchievement}
            />
          )}
          {tab === 'profile' && (
            <ProfileScreen
              name={state.profile.name}
              stats={profileStats(state, today)}
              achievements={achievements}
              joinedAt={state.joinedAt}
              settings={state.settings}
              unlockedThemes={unlockedThemes}
              onRename={(name) => setState(setName(state, name))}
              onSettings={(changes) => setState(updateSettings(state, changes))}
              onRedoSetup={() => setRedoSetup(true)}
            />
          )}
        </View>

        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              <View style={[styles.tabMark, tab === t.key && styles.tabMarkActive]} />
              {(t.key === 'challenges' ? readyToClaim : t.key === 'awards' ? awardsToClaim : 0) > 0 && (
                <View style={styles.dot}>
                  <Text style={styles.dotText}>{t.key === 'challenges' ? readyToClaim : awardsToClaim}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <LibraryModal
          visible={libraryOpen}
          addedTitles={addedTitles}
          onAdd={(t) => setState((s) => addFromLibrary(s, t))}
          onClose={() => setLibraryOpen(false)}
        />

        {toast && (
          <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemeProvider>
  );
}

const makeStyles = themed((c) => ({
  safe: { flex: 1, backgroundColor: c.bg },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.bg,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 6 },
  tabLabel: { ...eyebrow(c, 11), color: c.muted },
  tabLabelActive: { color: c.dark ? c.accent : c.text },
  tabMark: { width: 6, height: 6, transform: [{ rotate: '45deg' }], backgroundColor: 'transparent' },
  tabMarkActive: { backgroundColor: c.accent },
  dot: {
    position: 'absolute',
    top: -2,
    right: '14%',
    backgroundColor: c.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: c.onAccent, fontSize: 11, fontWeight: '700' },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: c.radius,
    maxWidth: '90%',
  },
  toastText: { color: c.text, fontWeight: '600', fontSize: 15, textAlign: 'center' },
}));
