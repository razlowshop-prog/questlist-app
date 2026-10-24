import { loadAsync } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { FerrisWheel, ListChecks, Menu, Trophy, type LucideIcon } from 'lucide-react-native';
import type { GlyphName } from './src/glyphs';
import { CountBadge, Glyph, VIVID_HEAVY } from './src/components/Vivid';
import { BRAND, brandGlow, brandLine } from './src/vivid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { activitySummary } from './src/activity';
import { BackBar, TopBar } from './src/components/TopBar';
import { XpProgress } from './src/components/XpProgress';
import {
  addTask,
  claimChallenge,
  streakStatus,
  restDaysOf,
  dayKey,
  deleteTask,
  emptyState,
  finishSetup,
  isDoneToday,
  levelInfo,
  limitMessage,
  profileStats,
  setName,
  toggleTask,
  totalXp,
  updateSettings,
  upcomingTasks,
  visibleTasks,
  withDefaults,
  weeklyChallenges,
  xpMultiplier,
  type GameState,
  type Task,
} from './src/game';
import {
  achievementStatuses,
  claimableCount,
  claimAchievement,
  grantLevelRewards,
  LEVEL_MILESTONES,
  TIER_NAMES,
  unlockedRewards,
  type LevelMilestone,
} from './src/achievements';
import { Celebration, type CelebrationEvent } from './src/components/Celebration';
import { LevelDetails } from './src/components/LevelDetails';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { ConnectedAppsScreen, HelpScreen, LegalScreen } from './src/screens/InfoScreens';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { MenuScreen, type MenuPage } from './src/screens/MenuScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LibraryModal } from './src/screens/LibraryModal';
import { SetupScreen, type SetupPick } from './src/screens/SetupScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SpinScreen } from './src/screens/SpinScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { ownsWheelTheme, spinsToPity, spinWheel, ticketStatus } from './src/wheel';
import { tickStep } from './src/steps';
import type { LibraryTask } from './src/library';
import { fontFilesFor, VIVID_FONTS, WHEEL_FONTS } from './src/fonts';
import { trophyStatuses } from './src/trophies';
import { withEstimatedTimes } from './src/estimate';
import { answerRecovery, recoveryOffer, spendAdFree, spendDoubleXp, spendRestDay, swapChallenge, tokenCounts } from './src/tokens';
import { TokenStrip } from './src/components/TokenStrip';
import { GoldDust } from './src/components/Fortuna';
import { RecoveryModal } from './src/components/RecoveryModal';
import { FlameStyleContext } from './src/components/Fire';
import { AvatarDiscContext, AvatarPhotoContext } from './src/components/ProfileFrame';
import { CelebrationContext } from './src/components/TaskRow';
import { emblemStatuses } from './src/emblems';
import { equippedLooks, ownedLooks } from './src/inventory';
import { claimSeason, seasonStatus } from './src/seasons';
import { frameName } from './src/cosmetics';
import { askReminderPermission, REMINDERS_SUPPORTED, syncReminders } from './src/reminders';
import { loadPhoto, loadState, savePhoto, saveState } from './src/storage';
import { nativeDriver, themeById, themed, ThemeProvider, THEMES, withFonts } from './src/theme';

/** The Spin tab always wears the Fortuna look. */
const FORTUNA = themeById('fortune').palette;

/** Browser previews are built with this on so every theme and look can be tried without unlocking it. */
const PREVIEW_ALL_THEMES = process.env.EXPO_PUBLIC_UNLOCK_THEMES === '1';

type Tab = 'today' | 'challenges' | 'spin' | 'menu';
/** Pages opened from the header or the Menu. They sit above the tab they were opened from, which stays lit in the tab bar. */
type Page = 'inventory' | 'profile' | MenuPage;

/**
 * Inactive tabs: the theme's muted line icon. Active: a filled glyph in the
 * brand gradient with a soft glow; Menu's three lines have no filled glyph, so
 * they are drawn bolder in the brand colour instead.
 */
const TABS: { key: Tab; label: string; Icon: LucideIcon; glyph?: GlyphName }[] = [
  { key: 'today', label: 'Today', Icon: ListChecks, glyph: 'ListChecks' },
  { key: 'challenges', label: 'Challenges', Icon: Trophy, glyph: 'Trophy' },
  { key: 'spin', label: 'Spin', Icon: FerrisWheel, glyph: 'Pinwheel' },
  { key: 'menu', label: 'Menu', Icon: Menu },
];

const PAGE_TITLES: Record<Page, string> = {
  inventory: 'Inventory',
  profile: 'Profile',
  activity: 'Activity',
  friends: 'Friends',
  leaderboard: 'Leaderboard',
  settings: 'Settings',
  apps: 'Connected apps',
  help: 'Contact & help',
  legal: 'Legal',
};

export default function App() {
  const [state, setState] = useState<GameState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [page, setPage] = useState<Page | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [redoSetup, setRedoSetup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [levelOpen, setLevelOpen] = useState(false);
  const [draft, setDraft] = useState<LibraryTask | undefined>();
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const bestLevel = useRef<number | null>(null);
  // Theme whose fonts are loaded and which is on screen; a newly picked theme
  // shows once its fonts are ready, so text never flashes in a missing font.
  const [shownThemeId, setShownThemeId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string>();

  // Recomputed on each render so the list rolls over after midnight.
  const today = dayKey();

  useEffect(() => {
    loadState().then((s) => {
      const loadedState = withEstimatedTimes(withDefaults(s, dayKey()));
      // Level rewards for levels reached before the reward ladder existed.
      setState(grantLevelRewards(loadedState, levelInfo(totalXp(loadedState)).level));
      setLoaded(true);
    });
    loadPhoto().then(setPhoto);
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  // Phone reminders follow the tasks: rebuilt after every change and each new day.
  useEffect(() => {
    if (!loaded || !REMINDERS_SUPPORTED) return;
    syncReminders(state).catch((e) => console.warn('Reminders failed to update', e));
  }, [state.tasks, state.completions, loaded, today]);

  const xp = totalXp(state);
  const streakInfo = useMemo(() => streakStatus(state.completions, today, restDaysOf(state)), [state.completions, state.restDays, state.recovery, today]);
  const multiplier = useMemo(() => xpMultiplier(state, today), [state, today]);
  const tasks = useMemo(() => visibleTasks(state, today), [state, today]);
  const upcoming = useMemo(() => upcomingTasks(state, today), [state.tasks, today]);
  const challenges = useMemo(() => weeklyChallenges(state, today), [state, today]);
  const readyToClaim = challenges.filter((c) => c.complete && !c.claimed).length;
  const achievements = useMemo(() => achievementStatuses(state, today), [state, today]);
  const trophies = useMemo(() => trophyStatuses(state, today), [state, today]);
  const tokens = tokenCounts(state);
  const awardsToClaim = claimableCount(state, today);
  const addedTitles = useMemo(() => new Set(state.tasks.map((t) => t.title)), [state.tasks]);
  const week = useMemo(() => activitySummary(state, today), [state, today]);
  const rewards = useMemo(() => unlockedRewards(state), [state.achievementClaims, state.levelRewards, state.wheelSpins]);
  const unlockedThemes = useMemo(() => {
    const labels = new Set(rewards.map((r) => r.label));
    return new Set(THEMES.filter((t) => !t.reward || labels.has(t.reward) || PREVIEW_ALL_THEMES).map((t) => t.id));
  }, [rewards]);
  // Trophies won, as a key that only changes when one is won: each gives a title and maybe a frame.
  const trophiesWon = trophies
    .filter((t) => t.earned)
    .map((t) => t.def.id)
    .join(',');
  const owned = useMemo(
    () => ownedLooks(state, PREVIEW_ALL_THEMES, trophiesWon ? trophiesWon.split(',') : []),
    [state.achievementClaims, state.levelRewards, state.seasonClaims, state.wheelSpins, trophiesWon],
  );
  const tickets = ticketStatus(state, xp);
  const looks = equippedLooks(state.settings, owned);
  const season = useMemo(() => seasonStatus(state, today), [state.completions, state.tasks, state.seasonClaims, today]);
  const emblems = useMemo(() => emblemStatuses(state), [state.completions, state.tasks]);
  const recovery = loaded ? recoveryOffer(state, today) : undefined;
  const bagCount = Object.values(tokens).reduce((sum, n) => sum + Math.max(0, n), 0);
  const level = levelInfo(xp);
  const initials = state.profile.name.trim().slice(0, 2).toUpperCase() || '?';
  const wantedTheme = themeById(unlockedThemes.has(state.settings.theme) ? state.settings.theme : 'classic');
  const theme = themeById(shownThemeId ?? wantedTheme.id);
  const c = theme.palette;

  useEffect(() => {
    if (!loaded) return;
    let current = true;
    // A font that fails to load falls back to the system font; the theme still applies.
    loadAsync({ ...fontFilesFor(wantedTheme.palette.fonts), ...WHEEL_FONTS, ...VIVID_FONTS })
      .catch((e) => console.warn('Fonts failed to load', e))
      .finally(() => current && setShownThemeId(wantedTheme.id));
    return () => {
      current = false;
    };
  }, [loaded, wantedTheme.id]);
  const styles = useMemo(() => StyleSheet.create(withFonts(makeStyles(c), c.fonts)), [c]);

  // Android's back button closes an open page before it leaves the app.
  useEffect(() => {
    if (!page) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage(null);
      return true;
    });
    return () => sub.remove();
  }, [page]);

  function openTab(next: Tab) {
    setPage(null);
    setTab(next);
  }
  const statusBar = c.dark ? 'light' : 'dark';

  function addFromLibrary(s: GameState, t: LibraryTask, perWeek = t.perWeek): GameState {
    return addTask(s, t.title, perWeek === 0 ? false : perWeek, undefined, t.minutes);
  }

  function onSetupDone(name: string, goals: string[], picks: SetupPick[]) {
    let next = finishSetup(state, name, goals);
    for (const p of picks) {
      if (!next.tasks.some((t) => t.title === p.task.title)) next = addFromLibrary(next, p.task, p.perWeek);
    }
    setState(next);
    setRedoSetup(false);
    openTab('today');
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
  function apply(change: GameState): number {
    const gained = totalXp(change) - xp;
    const before = levelInfo(xp);
    const after = levelInfo(totalXp(change));
    // Level rewards (tokens, titles) arrive the moment a level is reached.
    const next = grantLevelRewards(change, after.level);
    setState(next);
    // Each level is celebrated once, even if a task is unticked and ticked again.
    bestLevel.current = Math.max(bestLevel.current ?? before.level, before.level);
    if (after.level > bestLevel.current) {
      const from = bestLevel.current;
      bestLevel.current = after.level;
      const milestone = LEVEL_MILESTONES.filter((m) => m.level > from && m.level <= after.level).at(-1);
      // After the XP bar has run to the end.
      setTimeout(
        () => setCelebration({ level: after.level, rank: after.rank, newRank: after.rank !== before.rank, milestone }),
        900,
      );
    }
    return gained;
  }

  /** Collect on the reward pop-up: claims the Climber bonus XP up to that level (other rewards are already given). */
  function collectLevelReward(milestone: LevelMilestone) {
    const tier = milestone.climberTier;
    if (tier === undefined) return;
    let next = state;
    for (let i = 0; i <= tier; i++) {
      const done = next.achievementClaims.some((a) => a.achievementId === 'level' && a.tier === tier);
      if (done) break;
      const result = claimAchievement(next, 'level', today);
      if (!result.tier) break;
      next = result.state;
    }
    if (next !== state) apply(next);
  }

  function takeRestDay(day: string) {
    setState(spendRestDay(state, day, today));
    showToast(day === today ? 'Rest day: your streak is safe today' : 'Streak saved with a rest day');
  }

  function onToggle(task: Task): { xp: number; note?: string } {
    const wasDone = isDoneToday(state, task, today);
    let next = toggleTask(state, task.id, today, Date.now());
    if (next === state) return { xp: 0 };
    // On the phone, the first finished task asks once whether streak reminders may notify.
    if (!wasDone && REMINDERS_SUPPORTED && !next.settings.askedNotifications && next.settings.streakReminders !== false) {
      next = updateSettings(next, { askedNotifications: true });
      askReminderPermission().catch(() => {});
    }
    const gained = apply(next);
    if (wasDone) return { xp: 0 };
    const limited = next.completions[next.completions.length - 1].limited;
    return { xp: gained, note: limited ? limitMessage(limited) : undefined };
  }

  /**
   * Spends a ticket on the wheel. The spin is saved straight away, so closing
   * the app mid-spin can't undo it; the prize is handed out (and the XP bar
   * moves) only when the wheel stops and shows it.
   */
  function onSpin() {
    const { state: next, prize } = spinWheel(state, xp, today, Math.random());
    if (!prize) return undefined;
    saveState(next);
    return { prize, finish: () => apply(next) };
  }

  function onStep(task: Task, step: number): { xp: number; finished: boolean; note?: string } {
    const { state: next, finished } = tickStep(state, task.id, step, today, Date.now());
    if (next === state) return { xp: 0, finished: false };
    const gained = apply(next);
    const limited = finished ? next.completions[next.completions.length - 1].limited : undefined;
    return { xp: gained, finished, note: limited ? limitMessage(limited) : undefined };
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

  const badges: Record<Tab, number> = { today: 0, challenges: readyToClaim, spin: tickets.tickets, menu: 0 };

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
      <FlameStyleContext.Provider value={looks.flameStyle}>
        <CelebrationContext.Provider value={looks.celebration}>
          <AvatarDiscContext.Provider value={state.settings.avatar}>
          <AvatarPhotoContext.Provider value={photo}>
          <SafeAreaView style={styles.safe}>
            <StatusBar style={statusBar} />
            {c.backdrop === 'dust' && (tab !== 'spin' || page) && <GoldDust />}
            {page ? (
              <BackBar backTo={TABS.find((t) => t.key === tab)!.label} title={PAGE_TITLES[page]} onBack={() => setPage(null)} />
            ) : (
              <TopBar
                level={level.level}
                progress={level.progress}
                initials={initials}
                bagCount={bagCount}
                toClaim={awardsToClaim}
                onHome={() => openTab('today')}
                onInventory={() => setPage('inventory')}
                onProfile={() => setPage('profile')}
              />
            )}

            <View style={{ flex: 1 }}>
              {page === 'activity' && <ActivityScreen state={state} today={today} />}
              {page === 'inventory' && (
                <InventoryScreen
                  state={state}
                  today={today}
                  level={level.level}
                  tickets={tickets.tickets}
                  onOpenSpin={() => openTab('spin')}
                  onRest={takeRestDay}
                  onDouble={() => {
                    setState(spendDoubleXp(state, today));
                    showToast('Double XP is on for the rest of today');
                  }}
                  onAdFree={() => {
                    setState(spendAdFree(state, today));
                    showToast('No ads for the rest of today');
                  }}
                  onOpenChallenges={() => openTab('challenges')}
                  onOpenProfile={() => setPage('profile')}
                />
              )}
              {page === 'profile' && (
                <ProfileScreen
                  name={state.profile.name}
                  stats={profileStats(state, today)}
                  trophies={trophies}
                  joinedAt={state.joinedAt}
                  settings={state.settings}
                  owned={owned}
                  unlockedThemes={unlockedThemes}
                  eventFrame={season.frame}
                  fireTier={streakInfo.tier}
                  photo={photo}
                  emblems={emblems}
                  multiplier={multiplier}
                  achievements={achievements}
                  rewards={rewards}
                  toClaim={awardsToClaim}
                  week={week}
                  today={today}
                  onClaimAchievement={onClaimAchievement}
                  onRename={(name) => setState(setName(state, name))}
                  onSettings={(changes) => setState(updateSettings(state, changes))}
                  onPhoto={(next) => {
                    setPhoto(next);
                    savePhoto(next);
                  }}
                />
              )}
              {(page === 'friends' || page === 'leaderboard') && (
                <FriendsScreen
                  view={page}
                  name={state.profile.name}
                  level={level.level}
                  streak={streakInfo.days}
                  totalXp={xp}
                  shareActivity={state.settings.shareActivity === true}
                  onShareActivity={(share) => setState(updateSettings(state, { shareActivity: share }))}
                />
              )}
              {page === 'settings' && (
                <SettingsScreen settings={state.settings} onSettings={(changes) => setState(updateSettings(state, changes))} onRedoSetup={() => setRedoSetup(true)} />
              )}
              {page === 'apps' && <ConnectedAppsScreen />}
              {page === 'help' && <HelpScreen />}
              {page === 'legal' && <LegalScreen />}
              {!page && tab === 'today' && (
                <TodayScreen
                  state={state}
                  tasks={tasks}
                  upcoming={upcoming}
                  streak={streakInfo}
                  multiplier={multiplier}
                  xpProgress={<XpProgress totalXp={xp} onPress={() => setLevelOpen(true)} />}
                  onOpenStreak={() => setLevelOpen(true)}
                  tokenStrip={
                    <TokenStrip
                      state={state}
                      today={today}
                      onRest={takeRestDay}
                    />
                  }
                  today={today}
                  loaded={loaded}
                  addedTitles={addedTitles}
                  onAdd={(title, repeat, minutes, plan) => {
                    setState(addTask(state, title, repeat, undefined, minutes, plan));
                    if (plan.reminder && REMINDERS_SUPPORTED) {
                      askReminderPermission().then((ok) => {
                        if (!ok) showToast('Notifications are off. Allow them in your phone settings to get reminders.');
                      });
                    }
                  }}
                  draft={draft}
                  onDraftUsed={() => setDraft(undefined)}
                  onOpenLibrary={() => setLibraryOpen(true)}
                  onToggle={onToggle}
                  onStep={onStep}
                  onDelete={(task) => setState(deleteTask(state, task.id))}
                />
              )}
              {!page && tab === 'challenges' && (
                <ChallengesScreen
                  challenges={challenges}
                  today={today}
                  onClaim={onClaim}
                  swapsLeft={tokens.reroll}
                  onSwap={(id) => {
                    const next = swapChallenge(state, id, today);
                    if (next !== state) {
                      setState(next);
                      showToast('Challenge swapped');
                    }
                  }}
                  season={season}
                  onClaimSeason={() => {
                    setState(claimSeason(state, today));
                    showToast(`${frameName(season.frame)} frame won`);
                  }}
                />
              )}
              {!page && tab === 'spin' && (
                <ThemeProvider palette={FORTUNA}>
                  <SpinScreen
                    tickets={tickets}
                    pity={spinsToPity(state)}
                    ownsTheme={ownsWheelTheme(state)}
                    spins={state.wheelSpins ?? []}
                    onSpin={onSpin}
                    onWearTheme={() => {
                      setState(updateSettings(state, { theme: 'fortune' }));
                      showToast('Fortuna is on. Good luck!');
                    }}
                  />
                </ThemeProvider>
              )}
              {!page && tab === 'menu' && <MenuScreen onOpen={setPage} />}
            </View>

            <View style={styles.tabBar}>
              {TABS.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => openTab(t.key)}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t.key }}
                >
                  {tab === t.key ? (
                    <View style={[styles.tabGlyph, styles.tabGlow]}>
                      {t.glyph ? <Glyph name={t.glyph} size={24} grad={BRAND} /> : <t.Icon size={24} color={brandLine(c.dark)} strokeWidth={2.5} aria-hidden />}
                    </View>
                  ) : (
                    <View style={styles.tabGlyph}>
                      <t.Icon size={22} color={c.muted} strokeWidth={1.5} aria-hidden />
                    </View>
                  )}
                  <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]} numberOfLines={1}>
                    {t.label}
                  </Text>
                  <CountBadge count={badges[t.key]} style={styles.dot} />
                </Pressable>
              ))}
            </View>

            <LibraryModal
              visible={libraryOpen}
              addedTitles={addedTitles}
              onAdd={(t) => {
                // Picked tasks open in the add form, so days and frequency can be set first.
                setDraft(t);
                setLibraryOpen(false);
                openTab('today');
              }}
              onClose={() => setLibraryOpen(false)}
            />

            {toast && (
              <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
                <Text style={styles.toastText}>{toast}</Text>
              </Animated.View>
            )}

            <LevelDetails visible={levelOpen} totalXp={xp} streak={streakInfo} onClose={() => setLevelOpen(false)} />

            {recovery && !celebration && (
              <RecoveryModal
                offer={recovery}
                onAnswer={(take) => {
                  setState(answerRecovery(state, today, take));
                  if (take) showToast(recovery.streakLost ? `Your ${recovery.keeps}-day streak is safe. Welcome back!` : 'Your fire is safe. Welcome back!');
                }}
              />
            )}

            {celebration && (
              <Celebration
                key={celebration.level}
                event={celebration}
                onClose={() => setCelebration(null)}
                onCollect={() => {
                  const m = celebration.milestone;
                  setCelebration(null);
                  if (m) collectLevelReward(m);
                }}
              />
            )}
          </SafeAreaView>
          </AvatarPhotoContext.Provider>
          </AvatarDiscContext.Provider>
        </CelebrationContext.Provider>
      </FlameStyleContext.Provider>
    </ThemeProvider>
  );
}

const makeStyles = themed((c) => ({
  safe: { flex: 1, backgroundColor: c.bg, ...(c.bgImage && { backgroundImage: c.bgImage }) },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.tabBar,
    ...(c.tabBar !== c.bg && Platform.OS === 'web' && ({ backdropFilter: 'blur(12px)' } as object)),
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: c.muted },
  tabLabelActive: { color: brandLine(c.dark), fontFamily: VIVID_HEAVY },
  tabGlyph: { width: 28, height: 26, alignItems: 'center', justifyContent: 'center' },
  tabGlow: { filter: `drop-shadow(0px 0px 6px ${brandGlow(0.7)})` },
  dot: { position: 'absolute', top: -4, right: '18%' },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: brandLine(c.dark),
    boxShadow: `0px 6px 20px ${brandGlow(0.3)}`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: c.radius,
    maxWidth: '90%',
  },
  toastText: { color: c.text, fontWeight: '600', fontSize: 15, textAlign: 'center' },
}));
