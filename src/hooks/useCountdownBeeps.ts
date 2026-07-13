import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

// Tiny generated 880 Hz tone (~0.12 s), mixed over the background music.
const BEEP = require('../../assets/sounds/beep.wav');

/**
 * Plays one short beep per second during the last `from` seconds of a phase
 * while `active` is true, warning that the transition is coming.
 */
export function useCountdownBeeps(
  active: boolean,
  secondsLeft: number,
  from = 5,
) {
  const player = useAudioPlayer(BEEP);
  const lastBeeped = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      lastBeeped.current = null;
      return;
    }
    if (
      secondsLeft >= 1 &&
      secondsLeft <= from &&
      lastBeeped.current !== secondsLeft
    ) {
      lastBeeped.current = secondsLeft;
      player.seekTo(0);
      player.play();
    }
  }, [active, secondsLeft, from, player]);
}
