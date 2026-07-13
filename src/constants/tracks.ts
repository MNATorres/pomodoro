import { TRACK_URLS } from './track-urls';

export type Track = {
  /** Stable identifier used as a key. */
  id: string;
  /** Human-readable label shown in the selector. */
  label: string;
  /** Remote streaming URL. */
  uri: string;
};

/** Work-phase tracks the user can pick from. */
export const WORK_TRACKS: Track[] = [
  { id: 'inception', label: 'Inception', uri: TRACK_URLS.workInception },
  { id: 'vikings', label: 'Vikings', uri: TRACK_URLS.workVikings },
];

/** Track played during every break phase. */
export const BREAK_TRACK: Track = {
  id: 'break',
  label: 'Break',
  uri: TRACK_URLS.break,
};

export const DEFAULT_WORK_TRACK = WORK_TRACKS[0];
