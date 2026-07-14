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
npm test         # run the jest suite
npm run test:coverage # suite + coverage report
npx tsc --noEmit # type-check
```

Run the app with [Expo Go](https://expo.dev/go) or an emulator.

## Structure

```
App.tsx                                 # session-load gate + Pomodoro screen (UI + controls)
index.ts                                # Expo entry point
src/constants/modes.ts                  # Pomodoro presets (25/5, 40/5, 50/10, 1/1 test)
src/constants/tracks.ts                 # work/break track catalog
src/constants/track-urls.ts             # private streaming URLs (GITIGNORED)
src/constants/track-urls.example.ts     # template for track-urls.ts
src/hooks/useTimer.ts                    # countdown + work/break phase logic
src/hooks/useBackgroundMusic.ts          # loops music per phase + media/foreground session
src/hooks/usePhaseNotifications.ts       # schedules cycle-end notifications
src/hooks/useCountdownBeeps.ts           # beeps in the last seconds of a phase
src/hooks/useCachedTrackUri.ts           # resolves a track to local/remote uri
src/lib/track-cache.ts                   # downloads tracks to local storage
src/lib/session-store.ts                 # persists/restores the session (AsyncStorage)
src/test/mocks/expo-file-system.ts       # fake for the SDK 54 File API
assets/sounds/beep.wav                   # generated 880Hz tone (ffmpeg sine)
__mocks__/expo-audio.ts                  # jest manual mock (auto-applied)
__mocks__/expo-notifications.ts          # jest manual mock (auto-applied)
__mocks__/@react-native-async-storage/   # in-memory AsyncStorage mock (auto-applied)
```

`App.tsx` default-exports a small gate that loads the persisted session before
mounting the real screen, exported as `Pomodoro` (tests render `Pomodoro` with
an explicit `initial` to stay synchronous).

Music files are NOT stored in the repo or the working tree: tracks are
streamed from private URLs (see `track-urls.ts`). The `audio/` and
`assets/audio/` gitignore entries stay as a safety net in case local source
files ever reappear.

## Domain notes

- **Android-only app.** No iOS-specific configuration is maintained.
- A **mode** is a work/break preset in minutes (`src/constants/modes.ts`).
  `DEFAULT_MODE` is 25/5.
- `useTimer(mode)` derives the remaining time from a wall-clock `endsAt`
  timestamp (NOT interval decrements) so it survives OS suspension while the
  phone is locked; it resyncs via interval ticks and AppState. Phase rollovers
  stay aligned to real time. Exposes `start`/`pause`/`reset` and `endsAt`.
- `usePhaseNotifications(phase, endsAt)` schedules a local notification for
  the exact phase end (works in Expo Go on Android; the channel must be
  created before requesting permission on Android 13+).
- **Music:** played with `expo-audio` while the timer runs. The work phase
  plays the user-selected work track; breaks play `BREAK_TRACK`.
  `useAudioPlayer` does not react to source changes — `useBackgroundMusic`
  calls `player.replace()` when the uri changes. Real URLs live only in the
  gitignored `src/constants/track-urls.ts` (repo is public; links are private).
- **Background survival (critical):** `useBackgroundMusic` calls
  `player.setActiveForLockScreen(true, …)`, which starts expo-audio's Android
  **media-playback foreground service**. That service is what keeps the app
  process — and therefore the JS timer that flips phases — alive while the
  screen is locked. WITHOUT it, Doze suspends JS and the music never switches
  work→break and eventually stops. `setAudioModeAsync` uses
  `interruptionMode: 'mixWithOthers'` so nothing can steal audio focus and
  pause playback. Do not remove the lock-screen registration thinking it is
  only cosmetic — it is load-bearing.
- **Session persistence:** `src/lib/session-store.ts` snapshots the session
  (mode, work track, phase, `endsAt`, completed sessions) to AsyncStorage; the
  `App` gate restores it on launch so a background process-kill doesn't reset
  everything. A running timer resyncs from `endsAt`; only the paused remaining
  is stored explicitly, so saves don't fire on every one-second tick.
- **Track cache:** tracks are downloaded once to `Paths.document/tracks/`
  (atomic .part + rename) and played from disk; streaming is only the
  first-launch fallback. Never rely on the network mid-session: Android Doze
  cuts background network and playback dies when the buffer drains.
- **Testing expo-file-system:** jest-expo registers a legacy-API factory mock
  that overrides root `__mocks__`. Tests touching the cache must override it:
  `jest.mock('expo-file-system', () => require('<rel>/src/test/mocks/expo-file-system'))`.

## Conventions

- **Commits:** atomic (one logical change each) and written in **English**.
- Keep UI strings in Spanish (the app's language).
