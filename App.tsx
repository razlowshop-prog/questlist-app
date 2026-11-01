import { loadAsync } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { FerrisWheel, ListChecks, Menu, Plus, Trophy, type LucideIcon } from 'lucide-react-native';
import type { GlyphName } from './src/glyphs';
import { brandFill, brandInk, CountBadge, Glyph, tapHaptic, VIVID_HEAVY } from './src/components/Vivid';
import { BRAND, brandGlow, brandLine } from './src/vivid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, Platform, Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { activitySummary } from './src/activity';
import { BackBar, TopBar } from './src/components/TopBar';
import { XpProgress } from './src/components/XpProgress';
import { FirstDayGuide } from './src/components/FirstDayGuide';
import { MomentCelebration, type Moment } from './src/components/Moments';
import { PERFECT_DAY_XP, reachStreakMilestone, syncPerfectDay } from './src/moments';
import {
  addTask,
  claimChallenge,
  streakStatus,
  restDaysOf,
  dayKey,
  deleteTask,
  restoreTask,
  emptyState,
  resetProgress,
  finishSetup,
  isDoneToday,
  levelInfo,
  limitMessage,
  profileStats,
  secondsUntilTickable,
  setName,
  shownName,
  toggleTask,
  evolveBizzy,
  tapBizzy,
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
  rewardLabel,
  TIER_NAMES,
  unlockedRewards,
  type LevelMilestone,
} from './src/achievements';
import { shownTitle } from './src/library';
import { Celebration, type CelebrationEvent } from './src/components/Celebration';
import { EvolveScene } from './src/components/Evolve';
import { BizzyFormContext, BizzyOutfitContext } from './src/components/Bizzy';
import { dayTurn } from './src/flight';
import { TourTargetProvider, useTourTargets } from './src/components/TourTargets';
import { AppTour } from './src/components/AppTour';
import { TOUR_SWIPE_TASK, TOUR_SWIPE_TITLE, TOUR_TASK, TOUR_TASK_MINUTES, TOUR_TASK_TITLE, tourSteps } from './src/tour';
import { quoteDue, quoteOfTheDay } from './src/quotes';
import { QuoteSplash } from './src/components/QuoteSplash';
import { outfitById, outfitDrawing, outfitName, toggleOutfit, wornOutfits } from './src/outfits';
import { bizzyFormOf } from './src/bizzy';
import { LevelDetails } from './src/components/LevelDetails';
import { LevelRewards } from './src/components/LevelRewards';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { ConnectedAppsScreen, HelpScreen, LegalScreen } from './src/screens/InfoScreens';
import { makeBackup } from './src/backup';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { MenuScreen, type MenuPage } from './src/screens/MenuScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DevScreen } from './src/screens/DevScreen';
import { devAllowed } from './src/devTools';
import { LibraryModal } from './src/screens/LibraryModal';
import { SetupScreen } from './src/screens/SetupScreen';
import { pickToTask, type LibraryPick } from './src/components/PickSheet';
import { coveredBy, ownedLibraryIds } from './src/covers';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SpinScreen } from './src/screens/SpinScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { ownsWheelTheme, spinsToPity, spinWheel, ticketStatus, XP_PER_TICKET } from './src/wheel';
import { tickStep } from './src/steps';
import { claimDaily, dailyChallenges } from './src/daily';
import { fontFilesFor, VIVID_FONTS, WHEEL_FONTS } from './src/fonts';
import { trophyStatuses } from './src/trophies';
import { withEstimatedTimes } from './src/estimate';
import { answerRecovery, recoveryOffer, spendAdFree, spendDoubleXp, spendRestDay, swapChallenge, tokenCounts } from './src/tokens';
import { TokenStrip } from './src/components/TokenStrip';
import { GoldDust } from './src/components/Fortuna';
import { Ambient, ThemeFxContext } from './src/components/ThemeFx';
import { themeFx } from './src/themeFx';
import { RecoveryModal } from './src/components/RecoveryModal';
import { FlameStyleContext } from './src/components/Fire';
import { AvatarDiscContext, AvatarPhotoContext } from './src/components/ProfileFrame';
import { FocusBar, FocusTimer } from './src/components/FocusTimer';
import { focusBonus, msUntilFocusDone, pauseFocus, resumeFocus, setFocusGoal, startFocus } from './src/focus';
import { CelebrationContext } from './src/components/TaskRow';
import { equippedLooks, isProfileLook, lookKeys, markLooksSeen, newLooks, ownedLooks, seedProfileLooks } from './src/inventory';
import { bagChanged, bagSnapshot, newInBag, type BagItem } from './src/bag';
import { claimSeason, seasonStatus } from './src/seasons';
import { frameName } from './src/cosmetics';
import { askReminderPermission, REMINDERS_SUPPORTED, syncReminders } from './src/reminders';
import { HAS_WIDGET, updateWidget } from './src/widget';
import { CrashGuard } from './src/components/CrashScreen';
import { widgetData } from './src/widgetData';
import { reviewDue } from './src/review';
import { askStoreReview } from './src/storeReview';
import { buzz, setHapticsEnabled } from './src/haptics';
import { comboCue, DEFAULT_SOUND_STYLE, filesFor, setSounds, sound } from './src/sounds';
import { startSounds } from './src/soundPlayer';
import { recapToShow } from './src/recap';
import { WeeklyRecap } from './src/components/WeeklyRecap';
import { loadPhoto, loadState, savePhoto, saveState } from './src/storage';
import { launchCheck } from './src/launchCheck';
import { nativeDriver, themeById, themed, ThemeProvider, THEMES, withFonts } from './src/theme';
import { N, quoted, setLang, systemLang, t, tn } from './src/i18n';

/** Browser previews are built with this on so every theme and look can be tried without unlocking it. */
const PREVIEW_ALL_THEMES = process.env.EXPO_PUBLIC_UNLOCK_THEMES === '1';
/** Ticks closer together than this build a combo. */
const COMBO_MS = 45_000;

type Tab = 'today' | 'challenges' | 'spin' | 'menu';
/** Pages opened from the header or the Menu. They sit above the tab they were opened from, which stays lit in the tab bar. */
type Page = 'inventory' | 'profile' | MenuPage;

/**
 * Inactive tabs: the theme's muted line icon. Active: a filled glyph in the
 * brand gradient with a soft glow; Menu's three lines have no filled glyph, so
 * they are drawn bolder in the brand colour instead.
 */
const TABS: { key: Tab; label: string; Icon: LucideIcon; glyph?: GlyphName }[] = [
  { key: 'today', label: N('Today'), Icon: ListChecks, glyph: 'ListChecks' },
  { key: 'challenges', label: N('Challenges'), Icon: Trophy, glyph: 'Trophy' },
  { key: 'spin', label: N('Spin'), Icon: FerrisWheel, glyph: 'Pinwheel' },
  { key: 'menu', label: N('Menu'), Icon: Menu },
];

const PAGE_TITLES: Record<Page, string> = {
  inventory: N('Inventory'),
  profile: N('Profile'),
  activity: N('Activity'),
  friends: N('Friends'),
  leaderboard: N('Leaderboard'),
  settings: N('Settings'),
  dev: N('Developer'),
  apps: N('Connected apps'),
  help: N('Contact & help'),
  legal: N('Legal'),
};

export default function App() {
  return (
    <SafeAreaProvider>
      <CrashGuard>
        <Succedo />
      </CrashGuard>
    </SafeAreaProvider>
  );
}

function Succedo() {
  // Android draws edge to edge: the top bar keeps clear of the status bar and
  // camera, the tab bar and toast clear of the system navigation bar.
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<GameState>(emptyState);
  // What the first-time tour points at (AppTour); parts of the app register themselves.
  const tourTargets = useTourTargets();
  const tourRef = useMemo(() => {
    const cache: Record<string, (r: HostInstance | null) => void> = {};
    return (key: string) =>
      (cache[key] ??= (r) => {
        if (r) tourTargets.set(key, r);
        else tourTargets.delete(key);
      });
  }, []);
  /** The inventory tab to open on next (the profile's showcase card opens Outfits). */
  const [inventoryTab, setInventoryTab] = useState<'outfits' | undefined>();
  // The language for everything drawn below; switching it redraws the whole app (the key on ThemeProvider).
  const language = state.settings.lang ?? systemLang();
  setLang(language);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [page, setPage] = useState<Page | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  /** The add-task sheet on Today. */
  const [adding, setAdding] = useState(false);
  const [redoSetup, setRedoSetup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ label: string; onPress: () => void } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [levelOpen, setLevelOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  /** Bizzy evolving full screen: the form he leaves and the one he becomes. */
  const [evolving, setEvolving] = useState<{ from: number; to: number } | null>(null);
  /** Perfect days and streak milestones waiting to be celebrated, after any level-up. */
  const [moments, setMoments] = useState<Moment[]>([]);
  /** Days whose perfect day was celebrated this session, so an untick and tick again doesn't repeat it. */
  const perfectShown = useRef(new Set<string>());
  /** Quick ticks in a row: how many, and when the last one was. */
  const combo = useRef({ count: 0, at: 0 });
  const [comboShown, setComboShown] = useState({ count: 0, play: 0 });
  /** A level-up or moment pop-up is open or waiting; the review pop-up never shows on top of one. */
  const celebrationOpen = useRef(false);
  celebrationOpen.current = !!celebration || moments.length > 0;
  const bestLevel = useRef<number | null>(null);
  // Theme whose fonts are loaded and which is on screen; a newly picked theme
  // shows once its fonts are ready, so text never flashes in a missing font.
  const [shownThemeId, setShownThemeId] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [photo, setPhoto] = useState<string>();
  /** The wheel is turning: the header and tabs hold still until it lands. */
  const [spinBusy, setSpinBusy] = useState(false);

  // Recomputed on each render so the list rolls over after midnight.
  const today = dayKey();

  /** Saved progress made ready to play: missing fields filled, old tasks timed, level rewards handed out. */
  function prepared(s: GameState): GameState {
    // Store builds drop changes made on the developer page (devTools.ts).
    const ready = withEstimatedTimes(withDefaults(devAllowed(s), dayKey()));
    // Level rewards for levels reached before the reward ladder existed.
    return grantLevelRewards(ready, levelInfo(totalXp(ready)).level);
  }

  useEffect(() => {
    loadState().then((s) => {
      const ready = prepared(s);
      launchCheck.step('save read');
      setState(ready);
      setLoaded(true);
      startSounds(filesFor(ready.settings.soundStyle ?? DEFAULT_SOUND_STYLE));
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
  }, [state.tasks, state.completions, state.settings.lang, loaded, today]);

  // The home screen widget (tasks left, streak, level, Bizzy's mood) is redrawn
  // whenever what it shows changes; the phone also refreshes it every 30 minutes.
  const widgetShown = useRef('');
  useEffect(() => {
    if (!loaded) return;
    const shows = JSON.stringify(widgetData(state, new Date()));
    if (shows === widgetShown.current) return;
    widgetShown.current = shows;
    updateWidget(state).catch((e) => console.warn('Widget failed to update', e));
  }, [state, loaded, today]);

  setHapticsEnabled(state.settings.haptics);
  setSounds(state.settings.sounds, state.settings.soundStyle);
  const xp = totalXp(state);
  const streakInfo = useMemo(() => streakStatus(state.completions, today, restDaysOf(state)), [state.completions, state.restDays, state.recovery, today]);
  const multiplier = useMemo(() => xpMultiplier(state, today), [state, today]);
  const tasks = useMemo(() => visibleTasks(state, today), [state, today]);
  const upcoming = useMemo(() => upcomingTasks(state, today), [state.tasks, today]);
  // What Bizzy wears everywhere; the same drawing until the outfit itself changes.
  const worn = wornOutfits(state);
  const wornKey = JSON.stringify(worn);
  const outfit = useMemo(() => outfitDrawing(worn), [wornKey]);
  const challenges = useMemo(() => weeklyChallenges(state, today), [state, today]);
  const hour = new Date().getHours();
  const daily = useMemo(() => dailyChallenges(state, today, hour), [state, today, hour]);
  const season = useMemo(() => seasonStatus(state, today), [state.completions, state.tasks, state.seasonClaims, today]);
  // Challenges and a finished monthly event waiting to be claimed.
  const readyToClaim = [...challenges, ...daily].filter((c) => c.complete && !c.claimed).length + (season.complete && !season.claimed ? 1 : 0);
  const achievements = useMemo(() => achievementStatuses(state, today), [state, today]);
  const trophies = useMemo(() => trophyStatuses(state, today), [state, today]);
  const tokens = tokenCounts(state);
  const awardsToClaim = claimableCount(state, today);
  /** Library tasks already on the list, left out of the library and suggestions. */
  const ownedTasks = useMemo(() => ownedLibraryIds(state, today), [state.tasks, state.completions, today]);
  const week = useMemo(() => activitySummary(state, today), [state, today]);
  // The tour's test task (asked 2026-11-01): the first tick happens with Bizzy watching. Only on
  // the first tour; a replay skips that step. Put back if removed before it was ticked.
  const touring = loaded && state.settings.tour === 'pending';
  // Worked out as the tour starts (state is loaded by then), and kept while it runs.
  const tourTried = useMemo(() => state.completions.some((x) => x.taskId === TOUR_TASK), [touring]);
  const tourTicked = state.completions.some((x) => x.taskId === TOUR_TASK);
  // The swipe task counts as removed once it was added and is gone again.
  const swipeAdded = useRef(false);
  const swipeThere = state.tasks.some((x) => x.id === TOUR_SWIPE_TASK);
  if (swipeThere) swipeAdded.current = true;
  const tourRemoved = swipeAdded.current && !swipeThere;
  useEffect(() => {
    if (!touring || tourTried) return;
    setState((s) => {
      let next = s;
      if (!tourTicked && !next.tasks.some((x) => x.id === TOUR_TASK)) next = addTask(next, t(TOUR_TASK_TITLE), false, TOUR_TASK, TOUR_TASK_MINUTES);
      if (!swipeAdded.current && !next.tasks.some((x) => x.id === TOUR_SWIPE_TASK)) next = addTask(next, t(TOUR_SWIPE_TITLE), false, TOUR_SWIPE_TASK, TOUR_TASK_MINUTES);
      // Ready to tick at once: the few seconds' wait for new tasks doesn't apply to these.
      const ready = new Date(Date.now() - 60_000).toISOString();
      return next === s ? s : { ...next, tasks: next.tasks.map((x) => (x.id === TOUR_TASK || x.id === TOUR_SWIPE_TASK ? { ...x, createdAt: ready } : x)) };
    });
  }, [touring, tourTried, tourTicked, state.tasks]);

  // The quote of the day greets the player on the first open of each day, once setup and the tour are behind them.
  const quoteShown = loaded && state.onboarded && state.settings.tour !== 'pending' && quoteDue(state.settings, today);
  const rewards = useMemo(() => unlockedRewards(state), [state.achievementClaims, state.levelRewards, state.wheelSpins]);
  // Everything owned: browser previews, or "Unlock everything" on the developer page.
  const allUnlocked = PREVIEW_ALL_THEMES || !!state.dev?.unlockAll;
  const unlockedThemes = useMemo(() => {
    const labels = new Set(rewards.map((r) => r.label));
    return new Set(THEMES.filter((t) => !t.reward || labels.has(t.reward) || allUnlocked).map((t) => t.id));
  }, [rewards, allUnlocked]);
  // Trophies won, as a key that only changes when one is won: each gives a title and maybe a frame.
  const trophiesWon = trophies
    .filter((t) => t.earned)
    .map((t) => t.def.id)
    .join(',');
  const owned = useMemo(
    () => ownedLooks(state, allUnlocked, trophiesWon ? trophiesWon.split(',') : []),
    [state.achievementClaims, state.levelRewards, state.seasonClaims, state.wheelSpins, trophiesWon, allUnlocked],
  );
  const tickets = ticketStatus(state, xp);
  const looks = equippedLooks(state.settings, owned);
  const recovery = loaded ? recoveryOffer(state, today) : undefined;
  // Badges show only what is new: items added since the bag was opened, looks won but not seen yet.
  const bagCounts: Record<BagItem, number> = { ticket: tickets.tickets, ...tokens };
  const bagNew = newInBag(bagCounts, state.settings.bagSeen);
  const allLookKeys = useMemo(
    () => lookKeys(THEMES.filter((t) => t.reward && unlockedThemes.has(t.id)).map((t) => t.id), owned),
    [unlockedThemes, owned],
  );
  const freshLooks = useMemo(() => newLooks(allLookKeys, state.settings.seenLooks), [allLookKeys, state.settings.seenLooks]);
  // Frames and titles are worn on the Profile, every other look is picked in the bag (Theme tab).
  const freshOnProfile = [...freshLooks].filter(isProfileLook).length;
  const freshInBag = freshLooks.size - freshOnProfile;
  const seeLook = (key: string) => setState((s) => updateSettings(s, { seenLooks: markLooksSeen(s.settings.seenLooks, [key]) }));
  const bagKey = JSON.stringify(bagSnapshot(bagCounts));
  // Players from before the badges start with everything seen, so only what comes next is new.
  useEffect(() => {
    if (!loaded || (state.settings.seenLooks && state.settings.bagSeen && state.settings.profileLooksSeeded)) return;
    setState((s) =>
      updateSettings(s, {
        seenLooks: s.settings.seenLooks ? (s.settings.profileLooksSeeded ? s.settings.seenLooks : seedProfileLooks(s.settings.seenLooks, allLookKeys)) : allLookKeys,
        profileLooksSeeded: true,
        bagSeen: s.settings.bagSeen ?? bagSnapshot(bagCounts),
      }),
    );
  }, [loaded, state.settings.seenLooks, state.settings.bagSeen, state.settings.profileLooksSeeded]);
  // Looking in the bag clears its badge, and keeps it clear while items are used there.
  useEffect(() => {
    if (loaded && page === 'inventory' && bagChanged(bagCounts, state.settings.bagSeen)) {
      setState((s) => updateSettings(s, { bagSeen: bagSnapshot(bagCounts) }));
    }
  }, [loaded, page, bagKey, state.settings.bagSeen]);
  const level = levelInfo(xp);
  const playerName = shownName(state.profile.name);
  const initials = playerName.trim().slice(0, 2).toUpperCase() || '?';
  const recap = loaded ? recapToShow(state, today, new Date().getHours()) : undefined;
  // A timer for a task that is gone or already done today no longer shows.
  const focusTask = state.focus ? state.tasks.find((t) => t.id === state.focus!.taskId && !isDoneToday(state, t, today)) : undefined;
  // A soft chord when the focus timer reaches the full time, open or hidden, while the app is open.
  const focusLeft = focusTask && state.focus ? msUntilFocusDone(focusTask, state.focus, Date.now()) : undefined;
  useEffect(() => {
    if (focusLeft === undefined) return;
    const timer = setTimeout(() => sound('focus'), focusLeft);
    return () => clearTimeout(timer);
  }, [focusTask?.id, state.focus?.startedAt, state.focus?.pausedAt, state.focus?.pausedMs, state.focus?.goalMinutes]);
  const wantedTheme = themeById(unlockedThemes.has(state.settings.theme) ? state.settings.theme : 'classic');
  const theme = themeById(shownThemeId ?? wantedTheme.id);
  const c = theme.palette;
  const fx = themeFx(theme.id);

  useEffect(() => {
    if (!loaded) return;
    let current = true;
    // A font that fails to load falls back to the system font; the theme still applies.
    loadAsync({ ...fontFilesFor(wantedTheme.palette.fonts), ...WHEEL_FONTS, ...VIVID_FONTS })
      .catch((e) => console.warn('Fonts failed to load', e))
      .finally(() => {
        if (!current) return;
        launchCheck.step('look ready');
        setShownThemeId(wantedTheme.id);
      });
    return () => {
      current = false;
    };
  }, [loaded, wantedTheme.id]);

  // Launch check: the first screen is up; a few seconds later (or once the
  // app is left) this start counts as running fine.
  const drawn = !!shownThemeId;
  useEffect(() => {
    if (!drawn) return;
    launchCheck.step('drawn');
    const timer = setTimeout(() => launchCheck.ok(), 5000);
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && launchCheck.ok());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [drawn]);
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

  /** The + in the middle of the tab bar: the add sheet opens over Today, so the new task shows up there. */
  function openAdd() {
    tapHaptic();
    openTab('today');
    setAdding(true);
  }
  const statusBar = c.dark ? 'light' : 'dark';

  /** Adds library picks (setup, the library) with their days, reminder and amount. */
  function addPicks(s: GameState, picks: LibraryPick[]): GameState {
    let next = s;
    for (const p of picks) {
      const { title, repeat, minutes, plan } = pickToTask(p, today);
      next = addTask(next, title, repeat, undefined, minutes, plan);
    }
    return next;
  }

  function askForReminders(picks: LibraryPick[]) {
    if (!REMINDERS_SUPPORTED || !picks.some((p) => p.schedule.remind)) return;
    askReminderPermission().then((ok) => {
      if (!ok) showToast(t('Notifications are off. Allow them in your phone settings to get reminders.'));
    });
  }

  function onSetupDone(name: string, goals: string[], picks: LibraryPick[]) {
    const next = addPicks(finishSetup(state, name, goals), picks.filter((p) => !ownedTasks.has(p.task.id)));
    askForReminders(picks);
    setState(next);
    setRedoSetup(false);
    openTab('today');
    // Bizzy shows them round the app once they've seen their list (AppTour).
    setState((s) => updateSettings(s, { tour: 'pending' }));
    if (picks.length) setTimeout(() => showToast(tn(picks.length, '{n} task added. Let’s begin.', '{n} tasks added. Let’s begin.')), 300);
  }

  /** A short note above the tab bar; with an action (Undo) it stays a little longer and can be tapped. */
  function showToast(message: string, action?: { label: string; onPress: () => void }) {
    setToast(message);
    setToastAction(action ?? null);
    toastAnim.stopAnimation();
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.delay(action ? 5000 : 2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: nativeDriver }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setToast(null);
      setToastAction(null);
    });
  }

  /** Applies a change and celebrates a level-up. Returns the XP gained. */
  function apply(change: GameState): number {
    // A perfect day and streak milestones follow from the change itself.
    const perfect = syncPerfectDay(change, today);
    const milestone = reachStreakMilestone(state, perfect.state, today);
    change = milestone.state;
    const found: Moment[] = [];
    if (perfect.earned && !perfectShown.current.has(today)) {
      perfectShown.current.add(today);
      found.push({ kind: 'perfect' });
    }
    if (milestone.days) found.push({ kind: 'streak', days: milestone.days });
    // A perfect day waits for Bizzy's honey check mark on Today (TodayMoments) to finish.
    if (found.length) setTimeout(() => setMoments((m) => [...m, ...found]), perfect.earned ? 3600 : 900);
    // The perfect day bonus is celebrated on its own, so it's left out of the task's "+XP".
    const gained = totalXp(change) - xp - (perfect.earned ? PERFECT_DAY_XP : 0);
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
        () => {
          setCelebration({ level: after.level, rank: after.rank, newRank: after.rank !== before.rank, milestone });
          buzz('levelUp');
          sound('levelUp');
        },
        900,
      );
    }
    return gained;
  }

  /** After a level-up or perfect-day pop-up closes: maybe the store's review pop-up (rarely, never for a reward). */
  function maybeAskReview(level: number) {
    if (!reviewDue(state, level, today)) return;
    // Long enough for a level-up from collected bonus XP to open first; then it waits for the next one.
    setTimeout(() => {
      if (celebrationOpen.current) return;
      askStoreReview().then((asked) => {
        if (asked) setState((s) => ({ ...s, settings: { ...s.settings, reviewAsks: [...(s.settings.reviewAsks ?? []), today] } }));
      });
    }, 1500);
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
    if (next === state) return;
    apply(next);
    buzz('claim');
    sound('coin');
  }

  function takeRestDay(day: string) {
    const next = spendRestDay(state, day, today);
    if (next === state) return;
    setState(next);
    buzz('token');
    showToast(day === today ? t('Rest day: Bizzy keeps watch, your streak is safe today') : t('Bizzy saved your streak with a rest day'));
  }

  function onToggle(task: Task, focusXp = 0): { xp: number; note?: string } {
    const wasDone = isDoneToday(state, task, today);
    // Already part of a bigger task that is done (covers.ts).
    if (!wasDone && coveredBy(state, task, today)) return { xp: 0 };
    let next = toggleTask(state, task.id, today, Date.now(), focusXp);
    if (next === state) return { xp: 0 };
    // On the phone, the first finished task asks once whether streak reminders may notify.
    if (!wasDone && REMINDERS_SUPPORTED && !next.settings.askedNotifications && next.settings.streakReminders !== false) {
      next = updateSettings(next, { askedNotifications: true });
      askReminderPermission().catch(() => {});
    }
    const gained = apply(next);
    if (wasDone) return { xp: 0 };
    if (gained > 0) buzz('tick');
    // Ticks within COMBO_MS of each other build a combo; it's only for show.
    const now = Date.now();
    combo.current = { count: now - combo.current.at <= COMBO_MS ? combo.current.count + 1 : 1, at: now };
    if (combo.current.count >= 2) setComboShown({ count: combo.current.count, play: now });
    // A combo's own sound takes the tick's place, climbing with ×2, ×3, ×4.
    if (gained > 0) sound(combo.current.count >= 2 ? comboCue(combo.current.count) : 'tick');
    const limited = next.completions[next.completions.length - 1].limited;
    return { xp: gained, note: limited ? limitMessage(limited) : undefined };
  }

  function onFocus(task: Task) {
    if (state.focus?.taskId !== task.id) setState({ ...state, focus: startFocus(task.id, Date.now()) });
    setFocusOpen(true);
  }

  function finishFocus(task: Task) {
    const bonus = focusBonus(state.focus, task, Date.now());
    if (secondsUntilTickable(task, Date.now()) > 0) {
      buzz('blocked');
      showToast(t('New tasks can be ticked a few seconds after adding'));
      setFocusOpen(false);
      return;
    }
    const cover = coveredBy(state, task, today);
    if (cover) {
      buzz('blocked');
      showToast(t('Already part of {task}', { task: quoted(shownTitle(cover.title)) }));
      setFocusOpen(false);
      return;
    }
    const { xp: gained, note } = onToggle(task, bonus);
    setFocusOpen(false);
    const name = shownTitle(task.title);
    showToast(
      gained > 0
        ? bonus
          ? t('{task} done · +{xp} XP, with a +{bonus} focus bonus', { task: name, xp: gained, bonus })
          : t('{task} done · +{xp} XP', { task: name, xp: gained })
        : (note ?? t('{task} done', { task: name })),
    );
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
    const spin = next.wheelSpins![next.wheelSpins!.length - 1];
    return {
      prize,
      // An outfit slice: the outfit won, or XP once every outfit of its rarity is owned.
      outfit: spin.outfit,
      xp: prize.outfit && !spin.outfit ? spin.xp : undefined,
      finish: () => {
        buzz('prize');
        sound(prize.rarity === 'legendary' ? 'jackpot' : 'win');
        return apply(next);
      },
    };
  }

  function onStep(task: Task, step: number): { xp: number; finished: boolean; note?: string } {
    if (coveredBy(state, task, today)) return { xp: 0, finished: false };
    const { state: next, finished } = tickStep(state, task.id, step, today, Date.now());
    if (next === state) return { xp: 0, finished: false };
    const gained = apply(next);
    if (gained > 0) {
      buzz(finished ? 'tick' : 'step');
      sound(finished ? 'tick' : 'step');
    }
    const limited = finished ? next.completions[next.completions.length - 1].limited : undefined;
    return { xp: gained, finished, note: limited ? limitMessage(limited) : undefined };
  }

  /** Collecting something: a success buzz and the reward sound, or the new-look sound when a look comes with it. */
  function claimed(cue: 'coin' | 'unlock' = 'coin') {
    buzz('claim');
    sound(cue);
  }

  function onClaim(id: string) {
    const gained = apply(claimChallenge(state, id, today));
    if (gained <= 0) return;
    claimed();
    showToast(t('Challenge complete · +{xp} XP', { xp: gained }));
  }

  function onClaimDaily(id: string) {
    const gained = apply(claimDaily(state, id, today, new Date().getHours()));
    if (gained <= 0) return;
    claimed();
    showToast(t('Daily challenge complete · +{xp} XP', { xp: gained }));
  }

  function onClaimAchievement(id: string) {
    const { state: next, tier } = claimAchievement(state, id, today);
    if (!tier) return;
    const tierName = t(TIER_NAMES[next.achievementClaims[next.achievementClaims.length - 1].tier]);
    apply(next);
    claimed(tier.reward ? 'unlock' : 'coin');
    showToast(
      tier.reward
        ? t('{tier} award · +{xp} XP · {reward} unlocked', { tier: tierName, xp: tier.xp, reward: rewardLabel(tier.reward) })
        : t('{tier} award · +{xp} XP', { tier: tierName, xp: tier.xp }),
    );
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
          owned={ownedTasks}
          today={today}
          language={language}
          onLanguage={(l) => setState((s) => updateSettings(s, { lang: l }))}
          onFinish={onSetupDone}
          onSkip={() => {
            // Skipping the questions still gets the tour, the first time.
            setState({ ...state, onboarded: true, ...(!state.onboarded && { settings: { ...state.settings, tour: 'pending' as const } }) });
            setRedoSetup(false);
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider key={language} palette={c}>
      <ThemeFxContext.Provider value={fx}>
      <FlameStyleContext.Provider value={looks.flameStyle}>
        <CelebrationContext.Provider value={looks.celebration}>
          <AvatarDiscContext.Provider value={state.settings.avatar}>
          <BizzyFormContext.Provider value={bizzyFormOf(state.bizzyForm).n}>
          <BizzyOutfitContext.Provider value={outfit}>
          <AvatarPhotoContext.Provider value={photo}>
          <TourTargetProvider targets={tourTargets}>
          <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
            <StatusBar style={statusBar} />
            {c.backdrop === 'dust' && (tab !== 'spin' || page) && <GoldDust />}
            {fx.ambient && (tab !== 'spin' || page) && <Ambient kind={fx.ambient} />}
            {page ? (
              <BackBar backTo={t(TABS.find((x) => x.key === tab)!.label)} title={t(PAGE_TITLES[page])} onBack={() => setPage(null)} />
            ) : (
              <View pointerEvents={spinBusy ? 'none' : 'auto'} style={{ zIndex: 5 }}>
                <TopBar
                  level={level.level}
                  progress={level.progress}
                  initials={initials}
                  bagCount={bagNew + freshInBag}
                  toClaim={awardsToClaim}
                  newLooks={freshOnProfile}
                  onHome={() => openTab('today')}
                  onInventory={() => {
                    setInventoryTab(undefined);
                    setPage('inventory');
                  }}
                  onProfile={() => setPage('profile')}
                />
                <View ref={tourRef('xp')}>
                  <XpProgress totalXp={xp} onPress={() => setRewardsOpen(true)} />
                </View>
              </View>
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
                    buzz('token');
                    showToast(t('Double XP is on for the rest of today'));
                  }}
                  onAdFree={() => {
                    setState(spendAdFree(state, today));
                    buzz('token');
                    showToast(t('No ads for the rest of today'));
                  }}
                  onOpenChallenges={() => openTab('challenges')}
                  onOpenProfile={() => setPage('profile')}
                  settings={state.settings}
                  owned={owned}
                  unlockedThemes={unlockedThemes}
                  fireTier={streakInfo.tier}
                  freshLooks={freshLooks}
                  onSeenLook={seeLook}
                  onSettings={(changes) => setState((s) => updateSettings(s, changes))}
                  bizzyForm={bizzyFormOf(state.bizzyForm).n}
                  startTab={inventoryTab}
                  onToggleOutfit={(id) => setState((now) => toggleOutfit(now, id))}
                />
              )}
              {page === 'profile' && (
                <ProfileScreen
                  name={playerName}
                  stats={profileStats(state, today)}
                  trophies={trophies}
                  joinedAt={state.joinedAt}
                  settings={state.settings}
                  owned={owned}
                  eventFrame={season.frame}
                  season={season}
                  fireTier={streakInfo.tier}
                  photo={photo}
                  bizzy={{
                    state,
                    form: bizzyFormOf(state.bizzyForm).n,
                    onOpen: () => {
                      setInventoryTab('outfits');
                      setPage('inventory');
                    },
                  }}
                  multiplier={multiplier}
                  achievements={achievements}
                  toClaim={awardsToClaim}
                  freshLooks={freshLooks}
                  onSeenLook={seeLook}
                  week={week}
                  today={today}
                  onClaimAchievement={onClaimAchievement}
                  onRename={(name) => setState(setName(state, name))}
                  onSettings={(changes) => setState((s) => updateSettings(s, changes))}
                  onPhoto={(next) => {
                    setPhoto(next);
                    savePhoto(next);
                  }}
                />
              )}
              {(page === 'friends' || page === 'leaderboard') && (
                <FriendsScreen
                  view={page}
                  name={playerName}
                  level={level.level}
                  streak={streakInfo.days}
                  totalXp={xp}
                  shareActivity={state.settings.shareActivity === true}
                  onShareActivity={(share) => setState(updateSettings(state, { shareActivity: share }))}
                />
              )}
              {page === 'settings' && (
                <SettingsScreen
                  settings={state.settings}
                  today={today}
                  onSettings={(changes) => setState((s) => updateSettings(s, changes))}
                  onRedoSetup={() => setRedoSetup(true)}
                  onReplayTour={() => {
                    setState((s) => updateSettings(s, { tour: 'pending' }));
                    openTab('today');
                  }}
                  backupText={(savedAt) => makeBackup(state, photo, savedAt, today)}
                  onRestore={(backup) => {
                    setState(prepared(backup.state));
                    setPhoto(backup.photo);
                    savePhoto(backup.photo);
                    showToast(t('Backup restored'));
                  }}
                  onReset={() => {
                    setState((s) => resetProgress(s));
                    setPhoto(undefined);
                    savePhoto(undefined);
                    setRedoSetup(false);
                    setPage(null);
                    setTab('today');
                  }}
                />
              )}
              {page === 'dev' && (
                <DevScreen
                  state={state}
                  today={today}
                  onChange={(next) => {
                    // A picked level celebrates again, even one reached before.
                    bestLevel.current = null;
                    apply(next);
                  }}
                />
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
                  onOpenStreak={() => setLevelOpen(true)}
                  onEvolve={() => {
                    const next = evolveBizzy(state);
                    if (next === state) return;
                    // Saved at once, so closing the app mid-animation keeps the new form.
                    setState(next);
                    setEvolving({ from: bizzyFormOf(state.bizzyForm).n, to: bizzyFormOf(next.bizzyForm).n });
                  }}
                  onTapBizzy={() => setState((s) => tapBizzy(s))}
                  tokenStrip={
                    <TokenStrip
                      state={state}
                      today={today}
                      onRest={takeRestDay}
                    />
                  }
                  guide={
                    <FirstDayGuide
                      state={state}
                      totalXp={xp}
                      ticketXp={tickets.earned > 0 ? XP_PER_TICKET : tickets.progress}
                      onOpenSpin={() => openTab('spin')}
                      onHide={() => setState(updateSettings(state, { guideHidden: true }))}
                    />
                  }
                  today={today}
                  loaded={loaded}
                  owned={ownedTasks}
                  onAdd={(title, repeat, minutes, plan) => {
                    setState(addTask(state, title, repeat, undefined, minutes, plan));
                    if (plan.reminder && REMINDERS_SUPPORTED) {
                      askReminderPermission().then((ok) => {
                        if (!ok) showToast(t('Notifications are off. Allow them in your phone settings to get reminders.'));
                      });
                    }
                  }}
                  onOpenLibrary={() => setLibraryOpen(true)}
                  onToggle={onToggle}
                  onStep={onStep}
                  onDelete={(task) => {
                    const at = state.tasks.findIndex((x) => x.id === task.id);
                    setState((s) => deleteTask(s, task.id));
                    // Removing takes a swipe and a tap; Undo puts it back where it was.
                    showToast(t('{task} removed', { task: quoted(shownTitle(task.title)) }), {
                      label: t('Undo'),
                      onPress: () => setState((s) => restoreTask(s, task, at)),
                    });
                  }}
                  recap={recap && <WeeklyRecap recap={recap} onSeen={() => setState(updateSettings(state, { recapSeen: recap.week }))} />}
                  focusingId={focusTask?.id}
                  onFocus={onFocus}
                  combo={comboShown}
                  adding={adding}
                  onCloseAdd={() => setAdding(false)}
                  hello={
                    // Once a day, from the second day on (the first is the welcome); hatch and hive take turns.
                    loaded && !quoteShown && state.settings.helloDay !== today && state.joinedAt && state.joinedAt < today
                      ? { kind: dayTurn(today, 2) ? 'hive' : 'hatch', onStart: () => setState((s) => updateSettings(s, { helloDay: today })) }
                      : undefined
                  }
                  focusBar={focusTask && state.focus && !focusOpen ? <FocusBar task={focusTask} session={state.focus} onOpen={() => setFocusOpen(true)} /> : undefined}
                />
              )}
              {!page && tab === 'challenges' && (
                <ChallengesScreen
                  challenges={challenges}
                  daily={daily}
                  onClaimDaily={onClaimDaily}
                  today={today}
                  onClaim={onClaim}
                  swapsLeft={tokens.reroll}
                  onSwap={(id) => {
                    const next = swapChallenge(state, id, today);
                    if (next !== state) {
                      setState(next);
                      buzz('token');
                      showToast(t('Challenge swapped'));
                    }
                  }}
                  season={season}
                  onClaimSeason={() => {
                    setState(claimSeason(state, today));
                    claimed('unlock');
                    showToast(t('{frame} frame won. Wear it from your profile.', { frame: frameName(season.frame) }));
                  }}
                />
              )}
              {/* The Spin tab wears the player's theme; only its wheel is Fortuna (design "look L4"). */}
              {!page && tab === 'spin' && (
                <SpinScreen
                  tickets={tickets}
                  pity={spinsToPity(state)}
                  ownsTheme={ownsWheelTheme(state)}
                  spins={state.wheelSpins ?? []}
                  onSpin={onSpin}
                  onBusy={setSpinBusy}
                  onWearTheme={() => {
                    setState(updateSettings(state, { theme: 'fortune' }));
                    showToast(t('Fortuna is on. Good luck!'));
                  }}
                  onWearOutfit={(id) => {
                    const o = outfitById(id);
                    if (!o) return;
                    setState((now) => (wornOutfits(now)[o.slot] === id ? now : toggleOutfit(now, id)));
                    showToast(t('Bizzy is wearing it: {outfit}', { outfit: outfitName(o) }));
                  }}
                />
              )}
              {!page && tab === 'menu' && <MenuScreen onOpen={setPage} />}
            </View>

            <View style={[styles.tabBar, { paddingBottom: 10 + insets.bottom }]} pointerEvents={spinBusy ? 'none' : 'auto'}>
              {TABS.flatMap((tb, i) => [
                // Today · Challenges · Add Task · Spin · Menu
                i === 2 && (
                  <Pressable key="add" ref={tourRef('add')} onPress={openAdd} style={styles.tab} accessibilityRole="button" accessibilityLabel={t('Add Task')}>
                    <View ref={tourRef('add-fab')} style={styles.addButton}>
                      <Plus size={24} color={brandInk(c)} strokeWidth={2.75} aria-hidden />
                    </View>
                    <Text style={[styles.tabLabel, styles.addLabel]} numberOfLines={1}>
                      {t('Add Task')}
                    </Text>
                  </Pressable>
                ),
                <Pressable
                  key={tb.key}
                  ref={tourRef(`tab-${tb.key}`)}
                  onPress={() => openTab(tb.key)}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === tb.key }}
                >
                  {tab === tb.key ? (
                    <View style={[styles.tabGlyph, styles.tabGlow]}>
                      {tb.glyph ? <Glyph name={tb.glyph} size={24} grad={c.brand?.text ?? BRAND} /> : <tb.Icon size={24} color={brandLine(c)} strokeWidth={2.5} aria-hidden />}
                    </View>
                  ) : (
                    <View style={styles.tabGlyph}>
                      <tb.Icon size={22} color={c.muted} strokeWidth={1.5} aria-hidden />
                    </View>
                  )}
                  <Text style={[styles.tabLabel, tab === tb.key && styles.tabLabelActive]} numberOfLines={1}>
                    {t(tb.label)}
                  </Text>
                  <CountBadge count={badges[tb.key]} style={styles.dot} />
                </Pressable>,
              ])}
            </View>

            <LibraryModal
              visible={libraryOpen}
              owned={ownedTasks}
              today={today}
              onAddMany={(picks) => {
                setState(addPicks(state, picks));
                setLibraryOpen(false);
                openTab('today');
                askForReminders(picks);
                setTimeout(() => showToast(tn(picks.length, '{n} task added', '{n} tasks added')), 300);
              }}
              onClose={() => setLibraryOpen(false)}
            />

            {toast && (
              <Animated.View style={[styles.toast, toastAction && styles.toastRow, { bottom: 96 + insets.bottom }, toastStyle]} pointerEvents={toastAction ? 'box-none' : 'none'}>
                <Text style={styles.toastText}>{toast}</Text>
                {toastAction && (
                  <Pressable
                    onPress={() => {
                      toastAction.onPress();
                      toastAnim.stopAnimation();
                      toastAnim.setValue(0);
                      setToast(null);
                      setToastAction(null);
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                  >
                    <Text style={styles.toastAction}>{toastAction.label}</Text>
                  </Pressable>
                )}
              </Animated.View>
            )}

            {focusTask && state.focus && (
              <FocusTimer
                task={focusTask}
                session={state.focus}
                visible={focusOpen}
                onPause={() => setState({ ...state, focus: pauseFocus(state.focus!, Date.now()) })}
                onResume={() => setState({ ...state, focus: resumeFocus(state.focus!, Date.now()) })}
                onGoal={(minutes) => setState((s) => (s.focus ? { ...s, focus: setFocusGoal(s.focus, minutes) } : s))}
                onFinish={() => finishFocus(focusTask)}
                onStop={() => {
                  const { focus: _stopped, ...rest } = state;
                  setState(rest);
                  setFocusOpen(false);
                }}
                onHide={() => setFocusOpen(false)}
              />
            )}

            <LevelDetails visible={levelOpen} totalXp={xp} streak={streakInfo} onClose={() => setLevelOpen(false)} />
            <LevelRewards visible={rewardsOpen} totalXp={xp} onClose={() => setRewardsOpen(false)} />

            {recovery && !celebration && (
              <RecoveryModal
                offer={recovery}
                onAnswer={(take) => {
                  setState(answerRecovery(state, today, take));
                  if (take) showToast(recovery.streakLost ? t('Your {days}-day streak is safe. Welcome back!', { days: recovery.keeps }) : t('Your fire is safe. Welcome back!'));
                }}
              />
            )}

            {!celebration && moments.length > 0 && (
              <MomentCelebration
                key={JSON.stringify(moments[0])}
                moment={moments[0]}
                onClose={() => {
                  if (moments[0].kind === 'perfect') maybeAskReview(levelInfo(xp).level);
                  setMoments((m) => m.slice(1));
                }}
              />
            )}

            {evolving && <EvolveScene key={evolving.to} from={evolving.from} to={evolving.to} onClose={() => setEvolving(null)} />}

            {celebration && (
              <Celebration
                key={celebration.level}
                event={celebration}
                onClose={() => {
                  setCelebration(null);
                  maybeAskReview(celebration.level);
                }}
                onCollect={() => {
                  const m = celebration.milestone;
                  setCelebration(null);
                  if (m) collectLevelReward(m);
                  maybeAskReview(celebration.level);
                }}
              />
            )}
            {touring && !celebration && (
              <AppTour
                steps={tourSteps({ widget: HAS_WIDGET, tried: tourTried })}
                targets={tourTargets}
                streak={streakInfo}
                onTab={openTab}
                onPage={setPage}
                tried={{ tick: tourTicked, remove: tourRemoved }}
                onTry={(target) => {
                  if (target === 'xp') setRewardsOpen(true);
                  else if (target === 'streak') setLevelOpen(true);
                  else return false;
                  return true;
                }}
                onDone={() => {
                  // Test tasks left over go with the tour; a ticked one stays in "Done today".
                  setState((s) => {
                    let next = deleteTask(s, TOUR_SWIPE_TASK);
                    if (!next.completions.some((x) => x.taskId === TOUR_TASK)) next = deleteTask(next, TOUR_TASK);
                    return updateSettings(next, { tour: 'done' });
                  });
                  openTab('today');
                }}
              />
            )}
            {quoteShown && <QuoteSplash quote={quoteOfTheDay(today)} onDone={() => setState((s) => updateSettings(s, { quoteDay: today }))} />}
          </SafeAreaView>
          </TourTargetProvider>
          </AvatarPhotoContext.Provider>
          </BizzyOutfitContext.Provider>
          </BizzyFormContext.Provider>
          </AvatarDiscContext.Provider>
        </CelebrationContext.Provider>
      </FlameStyleContext.Provider>
      </ThemeFxContext.Provider>
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
  tabLabelActive: { color: brandLine(c), fontFamily: VIVID_HEAVY },
  tabGlyph: { width: 28, height: 26, alignItems: 'center', justifyContent: 'center' },
  tabGlow: { filter: `drop-shadow(0px 0px 6px ${brandGlow(0.7)})` },
  dot: { position: 'absolute', top: -4, right: '18%' },
  // Round and raised a little above the bar, like the old floating +.
  addButton: {
    ...brandFill(c),
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: -18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: c.bg,
    boxShadow: c.brand ? '0px 6px 16px rgba(232,198,108,0.3)' : '0px 6px 16px rgba(90,80,255,0.45)',
  },
  addLabel: { color: c.text },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: brandLine(c),
    boxShadow: `0px 6px 20px ${brandGlow(0.3)}`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: c.radius,
    maxWidth: '90%',
  },
  toastText: { color: c.text, fontWeight: '600', fontSize: 15, textAlign: 'center', flexShrink: 1 },
  toastRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  toastAction: { color: brandLine(c), fontWeight: '800', fontSize: 15 },
}));
