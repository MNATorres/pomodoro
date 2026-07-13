import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { PomodoroMode } from '../constants/modes';

export type Phase = 'work' | 'break';

export type UseTimer = {
  phase: Phase;
  secondsLeft: number;
  running: boolean;
  /** Epoch ms when the current phase ends; null while paused. */
  endsAt: number | null;
  /** Number of completed work sessions. */
  completedSessions: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
};

/**
 * Countdown timer that alternates between work and break phases for the given
 * mode.
 *
 * The remaining time is derived from a wall-clock end timestamp instead of
 * counting interval ticks, so the timer stays correct when the OS suspends
 * JavaScript (screen locked / app backgrounded) and resyncs on resume.
 */
export function useTimer(mode: PomodoroMode): UseTimer {
  const [phase, setPhase] = useState<Phase>('work');
  const [secondsLeft, setSecondsLeft] = useState(mode.work * 60);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [completedSessions, setCompletedSessions] = useState(0);

  const running = endsAt !== null;

  // Reset everything whenever the selected mode changes. Done during render
  // (the React "adjusting state when props change" pattern) instead of in an
  // effect: an effect would run after the tick effect below had already fired
  // with the previous mode's endsAt, overwriting the reset values.
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    setEndsAt(null);
    setPhase('work');
    setSecondsLeft(mode.work * 60);
    setCompletedSessions(0);
  }

  // While running, derive the remaining time from the end timestamp. When the
  // end is reached — even long after, e.g. while the phone was locked — roll
  // into the next phase keeping real-time alignment: the new phase starts at
  // the previous phase's end, not at the moment the app woke up. If several
  // phases went by, the effect re-runs (endsAt changed) and catches up.
  // Guards the phase rollover so it runs exactly once per phase end: several
  // ticks can observe the same expired endsAt before React re-renders (e.g.
  // an interval tick and an AppState resync in the same task), and the
  // functional completedSessions update would otherwise count twice.
  const rolledOverAt = useRef<number | null>(null);

  useEffect(() => {
    if (endsAt === null) return;

    const tick = () => {
      const now = Date.now();
      if (now < endsAt) {
        setSecondsLeft(Math.ceil((endsAt - now) / 1000));
        return;
      }
      if (rolledOverAt.current === endsAt) return;
      rolledOverAt.current = endsAt;
      const nextPhase: Phase = phase === 'work' ? 'break' : 'work';
      const nextDurationMs =
        (nextPhase === 'work' ? mode.work : mode.break) * 60_000;
      if (phase === 'work') setCompletedSessions((c) => c + 1);
      setPhase(nextPhase);
      setEndsAt(endsAt + nextDurationMs);
      setSecondsLeft(
        Math.max(0, Math.ceil((endsAt + nextDurationMs - now) / 1000)),
      );
    };

    tick(); // sync immediately (covers start, rollover and app resume)
    const id = setInterval(tick, 250);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      subscription.remove();
    };
  }, [endsAt, phase, mode]);

  const start = useCallback(() => {
    if (running) return;
    rolledOverAt.current = null;
    setEndsAt(Date.now() + secondsLeft * 1000);
  }, [running, secondsLeft]);

  const pause = useCallback(() => {
    if (endsAt === null) return;
    setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    setEndsAt(null);
  }, [endsAt]);

  const reset = useCallback(() => {
    setEndsAt(null);
    setPhase('work');
    setSecondsLeft(mode.work * 60);
  }, [mode]);

  return {
    phase,
    secondsLeft,
    running,
    endsAt,
    completedSessions,
    start,
    pause,
    reset,
  };
}
