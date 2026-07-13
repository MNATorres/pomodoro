export type PomodoroMode = {
  /** Stable identifier used as a key. */
  id: string;
  /** Human-readable label, e.g. "25 / 5". */
  label: string;
  /** Work phase duration, in minutes. */
  work: number;
  /** Break phase duration, in minutes. */
  break: number;
};

/** Default Pomodoro presets: work / break minutes. */
export const MODES: PomodoroMode[] = [
  { id: '25-5', label: '25 / 5', work: 25, break: 5 },
  { id: '40-5', label: '40 / 5', work: 40, break: 5 },
  { id: '50-10', label: '50 / 10', work: 50, break: 10 },
  // Short mode to quickly try out phase transitions, music and alerts.
  { id: '1-1', label: '1 / 1', work: 1, break: 1 },
];

export const DEFAULT_MODE = MODES[0];
