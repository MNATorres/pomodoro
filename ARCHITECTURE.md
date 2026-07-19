# Architecture

This document describes how the Pomodoro app is put together: its modules, how
state flows, and — most importantly — how it keeps the timer and music alive
while the phone is locked, and how the timer and the media card stay in sync.

For setup and features see [`README.md`](./README.md).

## Overview

The app is a single screen with no navigation. `index.ts` registers `App.tsx`,
whose default export is a small **gate** that restores the persisted session
before mounting the real UI component, `Pomodoro`. `Pomodoro` owns the
list-level state (selected mode and work track) and composes a handful of
focused hooks; there is no state-management library and no shared store.

```mermaid
flowchart TD
  index["index.ts"] --> Gate["App.tsx (session-load gate)"]

  Gate -->|"loadSession()"| SS["session-store"]
  Gate --> Pom["Pomodoro (screen)"]

  Pom -->|"saveSession()"| SS
  Pom --> UT["useTimer"]
  Pom --> UBM["useBackgroundMusic"]
  Pom --> UCT["useCachedTrackUri"]
  Pom --> UPN["usePhaseNotifications"]
  Pom --> UCB["useCountdownBeeps"]

  UCT --> TC["track-cache"]
  SS --> AS[("AsyncStorage")]
  TC --> FSt[("expo-file-system (documents dir)")]

  UBM -->|"play / replace / metadata"| EA[["expo-audio: player + media foreground service (patched)"]]
  EA -.->|"onRemoteToggle → start/pause"| Pom
  UCB --> EA
  UPN --> EN[["expo-notifications"]]

  classDef native fill:#eef,stroke:#66a;
  classDef store fill:#efe,stroke:#6a6;
  class EA,EN native
  class AS,FSt store
```

| Module | Responsibility |
| --- | --- |
| `App.tsx` | Gate that loads the session, then renders `Pomodoro`; wires the hooks and persists the session |
| `src/hooks/useTimer.ts` | Wall-clock countdown; auto-switches work ↔ break; `start`/`pause`/`reset` |
| `src/hooks/useBackgroundMusic.ts` | Loops the phase's track; runs the lock-screen/foreground session; reports remote play/pause back to the timer |
| `src/hooks/useCachedTrackUri.ts` | Resolves a track to a local (preferred) or remote uri |
| `src/lib/track-cache.ts` | Downloads tracks once to local storage (atomic `.part` + rename) |
| `src/hooks/usePhaseNotifications.ts` | Schedules a local notification at each phase end |
| `src/hooks/useCountdownBeeps.ts` | Beeps in the last 5 seconds of a phase |
| `src/lib/session-store.ts` | Persists/restores the session snapshot in AsyncStorage |
| `patches/expo-audio+1.1.1.patch` | Native patch so the media-card progress bar tracks the pomodoro phase, not the audio file |
| `src/constants/*` | Mode presets, track catalog, private streaming URLs |

## Timer model

The timer never counts interval ticks. It stores `endsAt` — the epoch
millisecond at which the current phase ends — and derives the remaining seconds
from the wall clock. This is what makes it correct after the OS suspends
JavaScript: on resume (an interval tick or an `AppState` "active" event) it
recomputes from `endsAt`, and if the end already passed it rolls the phase over,
staying aligned to real time.

```mermaid
stateDiagram-v2
  [*] --> Work
  Work --> Break: endsAt reached — completedSessions + 1
  Break --> Work: endsAt reached
  note right of Work
    running  = endsAt is not null
    paused   = endsAt is null (secondsLeft frozen)
  end note
```

## How music follows the phase

The active track is pure derived state: the phase (plus the selected work
track) picks a `Track`, `useCachedTrackUri` turns it into a playable uri, and
`useBackgroundMusic` drives one reused `expo-audio` player. Because
`useAudioPlayer` does not react to source changes, the hook swaps the source
explicitly with `player.replace()` on every uri change.

```mermaid
flowchart LR
  phase["phase (work/break)"] --> track["activeTrack"]
  workSel["selected work track"] --> track
  track --> UCT["useCachedTrackUri"]
  UCT -->|"local file if cached, else stream"| uri["activeUri"]
  uri --> UBM["useBackgroundMusic"]
  UBM -->|"player.replace(uri)"| player["expo-audio player (loop)"]
```

## Background survival (the important part)

The single most important design decision: **the media-playback foreground
service is what keeps the app process — and therefore the JS timer — alive
while the screen is locked.**

`useBackgroundMusic` calls `player.setActiveForLockScreen(true, …)`. That
starts expo-audio's Android `mediaPlayback` foreground service and shows a
media notification. With the process kept alive, the JS timer keeps ticking in
the background, so the phase flips on time and the music switches from work to
break. Without it, Android Doze suspends JavaScript: the phase never changes,
the work track keeps looping into the break, and playback eventually dies.

```mermaid
sequenceDiagram
  participant Pom as Pomodoro
  participant EA as expo-audio
  participant FGS as Android foreground service
  participant JS as JS timer (useTimer)

  Pom->>EA: setActiveForLockScreen(true, metadata)
  EA->>FGS: start mediaPlayback service + show media notification
  FGS-->>JS: process stays alive (exempt from Doze)
  Note over JS: screen locked
  JS->>JS: setInterval keeps ticking
  JS->>EA: phase work→break ⇒ player.replace(breakUri)
  EA-->>Pom: music switches, keeps looping
```

Supporting choice — **`interruptionMode: 'mixWithOthers'`**: the player never
requests exclusive audio focus, so a notification, another app, or a system
sound can't steal focus and pause the music (the common cause of playback
"just stopping"). Trade-off: the music also won't pause for a phone call;
switch to `'doNotMix'` if that's preferred.

## The media card IS the pomodoro

The lock-screen media card is repurposed as the timer's remote face. Its text
is refreshed every second (the foreground service keeps JS alive to do it) via
`updateLockScreenMetadata`, and its progress bar is driven by the pomodoro, not
the audio file:

- **Title** — `mm:ss · <phase>` (e.g. `12:34 · Trabajo`).
- **Artist** — `Pomodoro · <work track>` (or just `Pomodoro` on a break).
- **`albumTitle`** — not shown; it smuggles a progress payload
  `pomodoro:<phaseDurationMs>:<endsAt|-1>:<pausedRemainingMs|-1>` to the native
  side.

A `patch-package` patch (`patches/expo-audio+1.1.1.patch`, applied on
`postinstall`) wraps the media session's player in a `ForwardingPlayer` that
parses that payload and reports the pomodoro's duration/position as the track's
duration/position — so the card's progress bar tracks the phase countdown. The
patch also hides the seek bar (seeking looping music is meaningless) and keeps
the payload out of the visible UI. If `expo-audio` is upgraded, the patch must
be regenerated or dropped consciously.

## Remote controls drive the timer

Play/pause from the lock screen, a smartwatch, or a headset button controls the
**timer**, not just the music — so the two never drift apart.
`useBackgroundMusic` watches `playbackStatusUpdate` for a real edge in the
player's playing state that contradicts the current `playing` prop, and calls
`onRemoteToggle`, which the screen wires to `start`/`pause`. Transient states
(buffering, and the brief pause emitted while a track is swapped on a phase
change) are filtered out so they aren't mistaken for a user action.

```mermaid
flowchart LR
  subgraph Device
    card["lock screen / watch / headset"]
  end
  card -->|"play/pause"| EA["expo-audio player"]
  EA -->|"playbackStatusUpdate edge"| UBM["useBackgroundMusic"]
  UBM -->|"onRemoteToggle(shouldPlay)"| TIM["useTimer.start / pause"]
  TIM -->|"running"| UBM
  UBM -->|"player.play / pause"| EA
```

## Surviving a process kill

A foreground service makes a background kill rare, not impossible. As defense
in depth, the session is persisted and restored so an OS kill doesn't reset
everything (mode, phase, remaining time, completed count).

```mermaid
flowchart LR
  change["mode / phase / endsAt / completed change"] -->|"saveSession()"| AS[("AsyncStorage")]
  AS -->|"loadSession() on launch"| Gate["App gate"]
  Gate -->|"seed useTimer(init)"| UT["useTimer"]
  UT -->|"endsAt in the past ⇒ roll over missed phases"| resume["resume aligned to real time"]
```

Because the timer is anchored to `endsAt`, restoring a running session "just
works": the wall-clock resync treats a process kill exactly like a long
suspension. Writes are throttled to phase/transition changes (only the paused
remaining is stored explicitly), so persistence does not write on every
one-second tick.

## Testing notes

There is no device in CI, so native behavior (the foreground service, the
patched media session, real audio, notifications) is verified manually on a
development build (`npm run deploy`). The Jest suite covers the JS logic with
manual mocks for `expo-audio`, `expo-notifications`, `expo-file-system` and
AsyncStorage — including the remote play/pause edge detection and the media-card
metadata payload. `App.test.tsx` renders the inner `Pomodoro` with an explicit
`initial` prop to stay synchronous, and separately exercises the async gate.
