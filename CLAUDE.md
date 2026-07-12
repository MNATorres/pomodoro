# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Pomodoro timer app built with React Native + Expo.

- **Expo** SDK 54 · **React Native** 0.81 · **React** 19.1 · **TypeScript**
- Entry point: `index.ts` registers the root component `App.tsx`.
- Pinned to SDK 54 because the published Expo Go app supports up to SDK 54.

> Expo changes often. Before writing Expo code, read the versioned docs at
> https://docs.expo.dev/versions/v54.0.0/ (see `AGENTS.md`).

## Commands

```bash
npm start        # start the Expo dev server
npm run android  # open on Android
npm run ios       # open on iOS
npm run web       # open in the browser (needs react-native-web + react-dom)
npx tsc --noEmit # type-check
```

Run the app with [Expo Go](https://expo.dev/go) or an emulator.

## Structure

```
App.tsx                  # main timer screen (UI + controls)
index.ts                 # Expo entry point
src/constants/modes.ts   # Pomodoro presets (25/5, 40/5, 50/10)
src/hooks/useTimer.ts     # countdown + work/break phase logic
```

## Domain notes

- A **mode** is a work/break preset in minutes (`src/constants/modes.ts`).
  `DEFAULT_MODE` is 25/5.
- `useTimer(mode)` counts down and auto-switches between `work` and `break`
  phases, keeps a `completedSessions` count, and exposes `start`/`pause`/`reset`.
- Installed but not wired up yet: `expo-notifications` (cycle-end alerts),
  `expo-audio` (alarm sound), `@react-native-async-storage/async-storage`
  (persist settings/stats).

## Conventions

- **Commits:** atomic (one logical change each) and written in **English**.
- Keep UI strings in Spanish (the app's language).
