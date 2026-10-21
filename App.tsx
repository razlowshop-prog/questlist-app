import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
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
import { loadState, saveState } from './src/storage';
import { C, nativeDriver } from './src/theme';

type Tab = 'today' | 'challenges' | 'awards' | 'profile';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'today', icon: '📝', label: 'Today' },
  { key: 'challenges', icon: '🎯', label: 'Challenges' },
  { key: 'awards', icon: '🏆', label: 'Awards' },
  { key: 'profile', icon: '👤', label: 'Profile' },
];

export default function App() {
  const [state, setState] = useState<GameState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [redoSetup, setRedoSetup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

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
    if (picks.length) setTimeout(() => showToast(`⚔️ ${picks.length} quests added. Let's go!`), 300);
  }

  function showToast(message: string) {
    setToast(message);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: nativeDriver, friction: 6 }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: nativeDriver }),
    ]).start(() => setToast(null));
  }

  /** Applies a change and celebrates a level-up. Returns the XP gained. */
  function apply(next: GameState): number {
    const gained = totalXp(next) - xp;
    const before = levelInfo(xp);
    const after = levelInfo(totalXp(next));
    setState(next);
    if (after.level > before.level) {
      setTimeout(() => showToast(`🎉 Level ${after.level}!${after.rank !== before.rank ? ` You are now ${after.rank}` : ''}`), 500);
    }
    return gained;
  }

  function onToggle(task: Task): number {
    const wasDone = isDoneToday(state, task, today);
    const gained = apply(toggleTask(state, task.id, today));
    return wasDone ? 0 : gained;
  }

  function onClaim(id: string) {
    const gained = apply(claimChallenge(state, id, today));
    if (gained > 0) showToast(`🎯 Challenge complete! +${gained} XP`);
  }

  function onClaimAchievement(id: string) {
    const { state: next, tier } = claimAchievement(state, id, today);
    if (!tier) return;
    const tierName = TIER_NAMES[next.achievementClaims[next.achievementClaims.length - 1].tier];
    apply(next);
    showToast(`🏆 ${tierName} trophy! +${tier.xp} XP${tier.reward ? ` · ${tier.reward.label} unlocked` : ''}`);
  }

  const toastStyle = {
    opacity: toastAnim,
    transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  if (loaded && (!state.onboarded || redoSetup)) {
    return (
      <>
        <StatusBar style="light" />
        <SetupScreen
          initialName={state.profile.name}
          initialGoals={state.goals}
          onFinish={onSetupDone}
          onSkip={() => {
            setState({ ...state, onboarded: true });
            setRedoSetup(false);
          }}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
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
            rewards={unlockedRewards(state)}
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
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && { color: C.text }]}>{t.label}</Text>
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingVertical: 6,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 20 },
  tabLabel: { color: C.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  dot: {
    position: 'absolute',
    top: 0,
    right: '30%',
    backgroundColor: C.gold,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: '#2A1E00', fontSize: 11, fontWeight: '800' },
  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: '90%',
  },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' },
});
