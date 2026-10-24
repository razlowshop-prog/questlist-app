import { levelInfo, type GameState } from './game.ts';
import { XP_PER_TICKET } from './wheel.ts';

/** The three first steps, each done once the player has actually done it. */
export function guideSteps(state: Pick<GameState, 'completions' | 'wheelSpins'>, totalXp: number, ticketXp: number) {
  return [
    { label: 'Tick off your first task', done: state.completions.length > 0 },
    { label: 'Fill the XP bar to level 2', done: levelInfo(totalXp).level >= 2 },
    {
      label: 'Spin the wheel with your first ticket',
      done: (state.wheelSpins?.length ?? 0) > 0,
      // Earning the first ticket takes a few tasks, so this step shows how far along it is.
      note: ticketXp >= XP_PER_TICKET ? 'Your ticket is ready' : `${ticketXp} / ${XP_PER_TICKET} XP to your first ticket`,
      ready: ticketXp >= XP_PER_TICKET,
    },
  ];
}
