import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

/**
 * Streams the given track in a loop while `playing` is true.
 *
 * `useAudioPlayer` does not react to source changes on its own, so when the
 * uri changes (e.g. a work -> break phase transition, or the user picks
 * another work track) the source is switched explicitly via `replace`.
 */
export function useBackgroundMusic(uri: string, playing: boolean) {
  const player = useAudioPlayer({ uri });
  const currentUri = useRef(uri);

  useEffect(() => {
    player.loop = true;
  }, [player]);

  // Switch tracks when the uri changes.
  useEffect(() => {
    if (currentUri.current === uri) return;
    currentUri.current = uri;
    player.replace({ uri });
    if (playing) player.play();
  }, [uri, playing, player]);

  // Follow the timer's running state.
  useEffect(() => {
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [playing, player]);
}
