# QuestList

A gamified todo app for iOS and Android: finish tasks, earn XP, level up and keep your streak alive.

Built with [Expo](https://expo.dev) (React Native + TypeScript). One codebase runs on iOS, Android and the web.

## What works today (v0.1)

- Add tasks as **one-time** or **every day**, with a difficulty (Easy 10 XP, Medium 20 XP, Hard 40 XP)
- Tick a task to earn XP, untick to undo
- **Levels**: each level needs 50 XP more than the last (100, 150, 200 …)
- **Ranks** every 5 levels: Rookie, Apprentice, Achiever, Go-Getter, Pro, Expert, Master, Grandmaster, Legend
- **Streaks**: days in a row with at least one finished task. Missing a whole day resets it.
- **Streak bonus**: +10 % XP from 3 days, +25 % from 7, +35 % from 14, +50 % from 30
- Everything is saved on the device

## Planned

Cloud sync and accounts (Supabase, EU region), level rewards, AI photo proof, screen-time challenges, ads and an optional subscription, Yazio and running app integrations.

## For developers

```bash
npm install
npm run web        # open in the browser
npm start          # scan the QR code with the Expo Go app on a phone
npm test           # game rule tests
npm run typecheck
```

The game rules live in `src/game.ts` and have no UI code, so they are easy to test (`src/game.test.ts`).
