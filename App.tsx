import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { DEFAULT_MODE, MODES, PomodoroMode } from './src/constants/modes';
import {
  BREAK_TRACK,
  DEFAULT_WORK_TRACK,
  Track,
  WORK_TRACKS,
} from './src/constants/tracks';
import { useBackgroundMusic } from './src/hooks/useBackgroundMusic';
import { useCachedTrackUri } from './src/hooks/useCachedTrackUri';
import { useCountdownBeeps } from './src/hooks/useCountdownBeeps';
import { usePhaseNotifications } from './src/hooks/usePhaseNotifications';
import { useTimer } from './src/hooks/useTimer';
import { ensureTrackCached } from './src/lib/track-cache';
import {
  loadSession,
  saveSession,
  type SessionSnapshot,
} from './src/lib/session-store';

function formatTime(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Loads the persisted session before mounting the timer so a session that was
 * running survives the OS killing the app in the background. `undefined` means
 * the load is still in flight (show a blank splash); `null` means there is no
 * saved session (start fresh).
 */
export default function App() {
  const [initial, setInitial] = useState<SessionSnapshot | null | undefined>(
    undefined,
  );

  useEffect(() => {
    loadSession().then((snapshot) => setInitial(snapshot ?? null));
  }, []);

  if (initial === undefined) {
    return <View style={styles.splash} />;
  }
  return <Pomodoro initial={initial} />;
}

export function Pomodoro({ initial }: { initial: SessionSnapshot | null }) {
  const [mode, setMode] = useState<PomodoroMode>(
    () => MODES.find((m) => m.id === initial?.modeId) ?? DEFAULT_MODE,
  );
  const [workTrack, setWorkTrack] = useState<Track>(
    () =>
      WORK_TRACKS.find((t) => t.id === initial?.workTrackId) ??
      DEFAULT_WORK_TRACK,
  );
  const {
    phase,
    secondsLeft,
    running,
    endsAt,
    completedSessions,
    start,
    pause,
    reset,
  } = useTimer(
    mode,
    initial
      ? {
          phase: initial.phase,
          endsAt: initial.endsAt,
          // A running timer derives its remaining time from `endsAt`; only a
          // paused one needs the stored seconds.
          secondsLeft:
            initial.endsAt !== null
              ? Math.max(0, Math.ceil((initial.endsAt - Date.now()) / 1000))
              : initial.secondsLeft,
          completedSessions: initial.completedSessions,
        }
      : undefined,
  );

  const isWork = phase === 'work';
  const accent = useMemo(() => (isWork ? '#e2584d' : '#3aa675'), [isWork]);

  // Work phase plays the selected work track; breaks have their own track.
  // Tracks play from local storage once downloaded (streaming is only the
  // first-time fallback): Doze cuts background network and kills streams.
  const activeTrack = isWork ? workTrack : BREAK_TRACK;
  const activeUri = useCachedTrackUri(activeTrack);
  const musicMetadata = useMemo(
    () => ({
      title: isWork ? `Trabajo · ${workTrack.label}` : 'Descanso',
      artist: 'Pomodoro',
    }),
    [isWork, workTrack.label],
  );
  useBackgroundMusic(activeUri, running, musicMetadata);

  useEffect(() => {
    // Pre-download every track sequentially so future sessions are offline.
    [...WORK_TRACKS, BREAK_TRACK]
      .reduce(
        (chain, track) => chain.then(() => ensureTrackCached(track)).then(() => {}),
        Promise.resolve(),
      )
      .catch(() => {});
  }, []);

  // Alert at the exact end of the phase, even if the phone is locked.
  usePhaseNotifications(phase, endsAt);

  // Beep once per second during the last 5 seconds of each phase, warning
  // that the transition (to break or back to work) is coming.
  useCountdownBeeps(running, secondsLeft);

  useEffect(() => {
    // Keep playing with the screen locked / app backgrounded, play even when
    // the iOS hardware silent switch is on, and — `doNotMix` — hold the audio
    // focus so a system sound or notification cannot pause our music.
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }, []);

  // Persist the session so it survives the OS killing the app in the
  // background. `pausedRemaining` is the effect's proxy for `secondsLeft`: it
  // only changes when paused (while running the time is derived from
  // `endsAt`), so this does not write on every one-second tick.
  const pausedRemaining = endsAt === null ? secondsLeft : null;
  useEffect(() => {
    void saveSession({
      modeId: mode.id,
      workTrackId: workTrack.id,
      phase,
      endsAt,
      secondsLeft: pausedRemaining ?? 0,
      completedSessions,
    });
  }, [mode.id, workTrack.id, phase, endsAt, completedSessions, pausedRemaining]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: accent }]}>
      <StatusBar style="light" />

      <View style={styles.top}>
        <View style={styles.modeRow}>
          {MODES.map((m) => {
            const selected = m.id === mode.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMode(m)}
                style={[styles.modeChip, selected && styles.modeChipSelected]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    selected && styles.modeChipTextSelected,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.trackLabel}>Música de trabajo</Text>
        <View style={styles.modeRow}>
          {WORK_TRACKS.map((t) => {
            const selected = t.id === workTrack.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setWorkTrack(t)}
                style={[styles.modeChip, selected && styles.modeChipSelected]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    selected && styles.modeChipTextSelected,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.timerBlock}>
        <Text style={styles.phaseLabel}>
          {isWork ? 'Trabajo' : 'Descanso'}
        </Text>
        <Text style={styles.time}>{formatTime(secondsLeft)}</Text>
        <Text style={styles.sessions}>
          Sesiones completadas: {completedSessions}
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={running ? pause : start}
          style={[styles.button, styles.primaryButton]}
        >
          <Text style={[styles.buttonText, { color: accent }]}>
            {running ? 'Pausar' : 'Iniciar'}
          </Text>
        </Pressable>
        <Pressable onPress={reset} style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.buttonText}>Reiniciar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#e2584d',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 72,
    paddingHorizontal: 24,
  },
  top: {
    alignItems: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  trackLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.8,
    marginTop: 24,
    marginBottom: 8,
  },
  modeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  modeChipSelected: {
    backgroundColor: '#fff',
  },
  modeChipText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modeChipTextSelected: {
    color: '#222',
  },
  timerBlock: {
    alignItems: 'center',
  },
  phaseLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  time: {
    color: '#fff',
    fontSize: 96,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    marginVertical: 8,
  },
  sessions: {
    color: '#fff',
    fontSize: 15,
    opacity: 0.85,
  },
  controls: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#fff',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
