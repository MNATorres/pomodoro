# Pomodoro

A Pomodoro timer app built with React Native and Expo.

## Stack

- [Expo](https://expo.dev/) SDK 57
- React Native 0.86 · React 19.2
- TypeScript

## Features

- Work / break countdown cycles with 25/5, 40/5 and 50/10 presets
- Background music streamed per phase (`expo-audio`): pick a work track,
  breaks play their own track

### Planned

- Local notifications when a cycle ends (`expo-notifications`)
- Persisted settings and session stats (`@react-native-async-storage/async-storage`)

## Getting started

```bash
npm install
npm start
```

Then open the project in [Expo Go](https://expo.dev/go) or an emulator.

### Music setup

Streaming URLs are private and not committed. Copy
`src/constants/track-urls.example.ts` to `src/constants/track-urls.ts` and
fill in your own direct-download audio links (e.g. Dropbox links with `dl=1`).
