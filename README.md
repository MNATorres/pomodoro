# Pomodoro

A Pomodoro timer app for Android built with React Native and Expo.

## Stack

- [Expo](https://expo.dev/) SDK 54 (pinned: the published Expo Go supports up to SDK 54)
- React Native 0.81 · React 19.1
- TypeScript

## Features

- Work / break countdown cycles with 25/5, 40/5 and 50/10 presets,
  plus a short 1/1 mode to try transitions quickly
- Background music per phase (`expo-audio`): pick a work track, breaks play
  their own track. Tracks are downloaded to local storage on first launch
  (streaming is only the initial fallback), so sessions never depend on the
  network
- Countdown beeps during the last 5 seconds of each phase
- Works with the phone locked: a media-playback **foreground service** (via
  `expo-audio`'s lock-screen session) keeps the app alive in the background, so
  the wall-clock timer keeps running, the music switches from work to break on
  time, and playback isn't paused by other sounds (`mixWithOthers`). A local
  notification also fires when each phase ends (`expo-notifications`)
- The media card (lock screen / smartwatch) shows the **live countdown** as its
  title, and its play/pause button pauses/resumes the **pomodoro itself**, not
  just the music
- Survives being killed: the session (mode, track, phase, remaining time,
  completed count) is persisted to `@react-native-async-storage/async-storage`
  and restored on relaunch, so an OS process-kill in the background doesn't
  reset everything

> Note: the background foreground service needs a **development build**
> (`npm run android`), not Expo Go — Expo Go can't host it.

### Planned

- Per-user settings screen (default mode, custom durations)

## Getting started

```bash
npm install
npm start
```

Then scan the QR with [Expo Go](https://expo.dev/go) on your phone
(same Wi-Fi network), or press `a` to open an Android emulator.

### Music setup

Streaming URLs are private and not committed. Copy
`src/constants/track-urls.example.ts` to `src/constants/track-urls.ts` and
fill in your own direct-download audio links (e.g. Dropbox links with `dl=1`).

## Tests

```bash
npm test               # run the suite
npm run test:coverage  # suite + coverage report
npx tsc --noEmit       # type-check
```

## Building a standalone APK

Requires the Android SDK and a JDK (17+), with the phone connected over USB
(USB debugging enabled).

```bash
npm run deploy       # JS/TS-only changes: build the release APK + install it
npm run deploy:full  # after app.json / native dep / patches changes: prebuild first
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`
(you can also copy it to the phone and open it directly).

Notes:

- The release build is signed with the debug keystore: fine for personal
  testing, not for Play Store distribution.
- The first Gradle build downloads dependencies and can take 10-25 minutes;
  later builds take a minute or two.
- Expo Go (`npm start`) is still useful for quick UI iteration, but it cannot
  host the media foreground service — test lock-screen behavior with the APK.
