import { N } from './i18n.ts';

// The first-time tour (asked 2026-10-29): after setup Bizzy shows every part
// of the app, pointing at it, one step at a time. Skippable at any point, and
// it can be replayed from Settings.

export type TourTab = 'today' | 'challenges' | 'spin' | 'menu';
export type TourPage = 'inventory' | 'profile';
export type TourTry = 'tick' | 'remove';

export interface TourStep {
  id: string;
  /** What it points at (useTourTarget names); none = Bizzy in the middle. */
  target?: string;
  /** More parts lit up together with the target, in one window round all of them. */
  also?: string[];
  /** The step waits for the player to try it: ticking off one test task, or removing the other. */
  wait?: TourTry;
  /** The tab it opens first, so he presents that page. */
  tab?: TourTab;
  /** A page it opens a moment after lighting up its button, to show what's inside (asked 2026-11-01). */
  page?: TourPage;
  title: string;
  body: string;
  /** A little picture in the card: this week's fire tier bar, or how to add the widget. */
  extra?: 'tiers' | 'widget';
}

/**
 * The test tasks the tour adds (asked 2026-11-01): the player ticks off the
 * first and swipes the second away, with Bizzy watching.
 */
export const TOUR_TASK = 'tour-test-task';
export const TOUR_TASK_TITLE = N('Test task: tick me off');
export const TOUR_SWIPE_TASK = 'tour-swipe-task';
export const TOUR_SWIPE_TITLE = N('Test task: swipe me away');
export const TOUR_TASK_MINUTES = 5;

/**
 * The steps, in order. `widget`: the phone can show the home screen widget.
 * `tried`: the test task was ticked off before (a replayed tour skips both
 * test steps, so the tick can't be farmed for XP).
 */
export function tourSteps({ widget, tried = false }: { widget: boolean; tried?: boolean }): TourStep[] {
  const steps: TourStep[] = [
    { id: 'hello', tab: 'today', title: N('Hi, I’m Bizzy!'), body: N('I’ll show you around. It takes a minute, and you can skip any time.') },
    { id: 'tasks', target: 'tasks', also: ['tour-task', 'tour-swipe'], tab: 'today', title: N('Your tasks for today'), body: N('Tap the circle on a task when it’s done. Every task earns XP. Swipe a task to the left to remove it.') },
    { id: 'tick', target: 'tour-task', tab: 'today', title: N('Your turn!'), body: N('Tap the circle to tick off this test task, and watch the XP fly into your bar.'), wait: 'tick' },
    { id: 'remove', target: 'tour-swipe', tab: 'today', title: N('Changed your mind?'), body: N('Swipe this one to the left and tap Remove. On a computer, press and hold it.'), wait: 'remove' },
    { id: 'xp', target: 'xp', tab: 'today', title: N('Your level'), body: N('XP fills this bar. Each new level brings a reward: tokens, looks, themes. Tap it to see what’s next.') },
    { id: 'streak', target: 'streak', tab: 'today', title: N('Your streak'), body: N('Do one task a day to keep it going; longer streaks give more XP on every task. I live here: tap me any time.') },
    {
      id: 'tiers',
      target: 'streak',
      tab: 'today',
      title: N('Fire tiers'),
      body: N('Your fire grows with your streak, and every tier adds XP to each task. Tap the streak card any time to see it.'),
      extra: 'tiers',
    },
    { id: 'add', target: 'add', also: ['add-fab'], tab: 'today', title: N('Add tasks'), body: N('Write your own, or pick from a big library of ideas.') },
    { id: 'challenges', target: 'tab-challenges', tab: 'challenges', title: N('Challenges'), body: N('Daily and weekly challenges for bonus XP. Claim the reward once one is done.') },
    { id: 'spin', target: 'tab-spin', tab: 'spin', title: N('The lucky wheel'), body: N('Every 100 XP gives you a ticket. Spin for tokens, outfits for me, and the rare Fortuna theme.') },
    { id: 'bag', target: 'bag', tab: 'today', page: 'inventory', title: N('Your bag'), body: N('Tokens, themes and my outfits live here. Dress me up!') },
    { id: 'profile', target: 'profile', tab: 'today', page: 'profile', title: N('Your profile'), body: N('Trophies, achievements, your frame and title, and me. The ring shows how close the next level is.') },
    { id: 'menu', target: 'tab-menu', tab: 'menu', title: N('Menu'), body: N('Settings, friends, your activity and help. You can replay this tour from Settings.') },
  ];
  // Early on (asked 2026-10-31), right after hello: the widget keeps the app in sight every day.
  if (widget) steps.splice(1, 0, { id: 'widget', title: N('Put me on your home screen'), body: N('Press and hold an empty spot on your home screen, tap Widgets, find Succedo and drag me onto it.'), extra: 'widget' });
  steps.push({ id: 'done', tab: 'today', title: N('You’re all set!'), body: N('Add your own tasks and let’s fill that XP bar.') });
  return tried ? steps.filter((s) => !s.wait).map((s) => (s.also ? { ...s, also: undefined } : s)) : steps;
}
