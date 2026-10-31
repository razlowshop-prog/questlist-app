import { N } from './i18n.ts';

// The first-time tour (asked 2026-10-29): after setup Bizzy shows every part
// of the app, pointing at it, one step at a time. Skippable at any point, and
// it can be replayed from Settings.

export type TourTab = 'today' | 'challenges' | 'spin' | 'menu';

export interface TourStep {
  id: string;
  /** What it points at (useTourTarget names); none = Bizzy in the middle. */
  target?: string;
  /** The tab it opens first, so he presents that page. */
  tab?: TourTab;
  title: string;
  body: string;
  /** A little picture in the card: this week's fire tier bar, or how to add the widget. */
  extra?: 'tiers' | 'widget';
}

export function tourSteps({ widget }: { widget: boolean }): TourStep[] {
  const steps: TourStep[] = [
    { id: 'hello', tab: 'today', title: N('Hi, I’m Bizzy!'), body: N('I’ll show you around. It takes a minute, and you can skip any time.') },
    { id: 'tasks', target: 'tasks', tab: 'today', title: N('Your tasks for today'), body: N('Tap the circle on a task when it’s done. Every task earns XP.') },
    { id: 'xp', target: 'xp', tab: 'today', title: N('Your level'), body: N('XP fills this bar. Each new level brings a reward: tokens, looks, themes. Tap it to see what’s next.') },
    { id: 'streak', target: 'streak', tab: 'today', title: N('Your streak'), body: N('Do one task a day to keep it going; longer streaks give more XP on every task. I live here: tap me any time.') },
    {
      id: 'tiers',
      target: 'streak',
      tab: 'today',
      title: N('Fire tiers'),
      body: N('Your fire grows with the XP you earn each week: Flame, Blaze, Inferno. Tap the streak card to see this week’s progress.'),
      extra: 'tiers',
    },
    { id: 'add', target: 'add', tab: 'today', title: N('Add tasks'), body: N('Write your own, or pick from a big library of ideas.') },
    { id: 'challenges', target: 'tab-challenges', tab: 'challenges', title: N('Challenges'), body: N('Daily and weekly challenges for bonus XP. Claim the reward once one is done.') },
    { id: 'spin', target: 'tab-spin', tab: 'spin', title: N('The lucky wheel'), body: N('Every 100 XP gives you a ticket. Spin for tokens, outfits for me, and the rare Fortuna theme.') },
    { id: 'bag', target: 'bag', tab: 'today', title: N('Your bag'), body: N('Tokens, themes and my outfits live here. Dress me up!') },
    { id: 'profile', target: 'profile', tab: 'today', title: N('Your profile'), body: N('Trophies, achievements, your frame and title, and me. The ring shows how close the next level is.') },
    { id: 'menu', target: 'tab-menu', tab: 'menu', title: N('Menu'), body: N('Settings, friends, your activity and help. You can replay this tour from Settings.') },
  ];
  if (widget) steps.push({ id: 'widget', title: N('Put me on your home screen'), body: N('Press and hold an empty spot on your home screen, tap Widgets, find Succedo and drag me onto it.'), extra: 'widget' });
  steps.push({ id: 'done', tab: 'today', title: N('You’re all set!'), body: N('Tick off your first task and let’s fill that XP bar.') });
  return steps;
}
