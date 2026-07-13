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
App.tsx                                 # main timer screen (UI + controls)
index.ts                                # Expo entry point
src/constants/modes.ts                  # Pomodoro presets (25/5, 40/5, 50/10)
src/constants/tracks.ts                 # work/break track catalog
src/constants/track-urls.ts             # private streaming URLs (GITIGNORED)
src/constants/track-urls.example.ts     # template for track-urls.ts
src/hooks/useTimer.ts                    # countdown + work/break phase logic
src/hooks/useBackgroundMusic.ts          # streams looping music per phase
__mocks__/expo-audio.ts                  # jest manual mock (auto-applied)
audio/                                  # local source tracks (GITIGNORED)
```

## Domain notes

- A **mode** is a work/break preset in minutes (`src/constants/modes.ts`).
  `DEFAULT_MODE` is 25/5.
- `useTimer(mode)` counts down and auto-switches between `work` and `break`
  phases, keeps a `completedSessions` count, and exposes `start`/`pause`/`reset`.
- **Music:** streamed remotely with `expo-audio` while the timer runs. The
  work phase plays the user-selected work track; breaks play `BREAK_TRACK`.
  `useAudioPlayer` does not react to source changes — `useBackgroundMusic`
  calls `player.replace()` when the uri changes. Real URLs live only in the
  gitignored `src/constants/track-urls.ts` (repo is public; links are private).
- Installed but not wired up yet: `expo-notifications` (cycle-end alerts),
  `@react-native-async-storage/async-storage` (persist settings/stats).

## Conventions

- **Commits:** atomic (one logical change each) and written in **English**.
- Keep UI strings in Spanish (the app's language).
