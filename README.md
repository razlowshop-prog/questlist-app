# QuestList

A gamified todo app for iOS and Android: finish tasks, earn XP, level up and keep your streak alive.

Built with [Expo](https://expo.dev) (React Native + TypeScript). One codebase runs on iOS, Android and the web.

## What works today (v0.2)

- **Setup on first launch**: your name, the areas you want to work on, then pick suggested tasks and how often per week. Picked tasks are added automatically.
- **Task library** with 200+ ready-made tasks in 17 areas (chores, fitness, health, money, digital detox …), a search bar, categories and team-recommended picks
- **Live suggestions** while typing a new task
- **XP based on time and effort**: a 15-minute easy task gives 10 XP, a 1-hour walk 35 XP, hard effort gives 1.5x
- Tasks can be one-time, every day or **N times per week** (hidden once the weekly target is reached)
- **100 levels**: the first take a couple of tasks, later ones get steadily harder (~197,000 XP to reach level 100). New rank every 10 levels, from Rookie to Immortal.
- **Animated XP bar** pinned at the top and a **"+XP" pop** when a task is completed
- **Streaks** with bonus XP (+10 % from 3 days up to +50 % from 30)
- **Weekly challenges** (3 per week, rotating) with claimable bonus XP
- **Profile** with points, streaks, challenges won and **13 badges**
- **Daily quote** on the Today screen, plus an opt-in for daily quote emails (sending starts once accounts are live)
- Everything is saved on the device

## Planned

Accounts and cloud sync (Supabase, EU region), friends, public profiles, search for people, global leaderboard, quote emails, team-pushed tasks, sleep and walking challenges (phone sensors / Apple Health / Health Connect), level rewards, AI photo proof, screen-time challenges, ads and an optional subscription, Yazio and running app integrations.

## For developers

```bash
npm install
npm run web        # open in the browser
npm start          # scan the QR code with the Expo Go app on a phone
npm test           # game rule tests
npm run typecheck
```

The game rules live in `src/game.ts` and have no UI code, so they are easy to test (`src/game.test.ts`).
