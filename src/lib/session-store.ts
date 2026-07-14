import AsyncStorage from '@react-native-async-storage/async-storage';
import { Phase } from '../hooks/useTimer';

/**
 * A snapshot of everything needed to resume exactly where the user left off
 * after the OS kills the app process in the background (which resets all
 * in-memory React state). Because the timer is anchored to a wall-clock end
 * timestamp (`endsAt`), restoring it after a kill "just works": the timer
 * resyncs to real time and rolls over any phases that elapsed while dead.
 */
export type SessionSnapshot = {
  modeId: string;
  workTrackId: string;
  phase: Phase;
  /** Epoch ms when the current phase ends; null while paused. */
  endsAt: number | null;
  /** Remaining seconds — only meaningful while paused (`endsAt` null). */
  secondsLeft: number;
  completedSessions: number;
};

const KEY = 'pomodoro:session:v1';

/** Loads the saved session, or null if there is none / it is unreadable. */
export async function loadSession(): Promise<SessionSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch {
    return null;
  }
}

/** Persists the session (best effort — storage failures are ignored). */
export async function saveSession(snapshot: SessionSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Best effort: losing a save just means a restore falls back to defaults.
  }
}
