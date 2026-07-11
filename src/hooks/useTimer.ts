import { useCallback, useEffect, useState } from 'react';
import { PomodoroMode } from '../constants/modes';

export type Phase = 'work' | 'break';

export type UseTimer = {
  phase: Phase;
  secondsLeft: number;
  running: boolean;
  /** Number of completed work sessions. */
  completedSessions: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
};

/**
 * Countdown timer that alternates between work and break phases for the given
 * mode. When a phase reaches zero it automatically switches to the other phase
 * and keeps running.
 */
export function useTimer(mode: PomodoroMode): UseTimer {
  const [phase, setPhase] = useState<Phase>('work');
  const [secondsLeft, setSecondsLeft] = useState(mode.work * 60);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Reset everything whenever the selected mode changes.
  useEffect(() => {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(mode.work * 60);
    setCompletedSessions(0);
  }, [mode]);

  // Tick once per second while running.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Handle phase transition when the countdown reaches zero.
  useEffect(() => {
    if (secondsLeft > 0) return;
    const nextPhase: Phase = phase === 'work' ? 'break' : 'work';
    if (phase === 'work') setCompletedSessions((c) => c + 1);
    setPhase(nextPhase);
    setSecondsLeft((nextPhase === 'work' ? mode.work : mode.break) * 60);
  }, [secondsLeft, phase, mode]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(mode.work * 60);
  }, [mode]);

  return { phase, secondsLeft, running, completedSessions, start, pause, reset };
}
