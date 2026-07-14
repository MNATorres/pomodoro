import { useEffect, useRef } from 'react';
import { useAudioPlayer, type AudioMetadata } from 'expo-audio';

/**
 * Plays the given track in a loop while `playing` is true, and registers the
 * player as the device's lock-screen / media-notification session.
 *
 * Registering the lock-screen session (`setActiveForLockScreen`) is what
 * starts expo-audio's Android *media-playback foreground service*. That
 * service keeps the app process — and therefore the JS timer that drives the
 * work/break phase changes — alive while the screen is locked. Without it,
 * Android's Doze mode suspends JavaScript in the background, so the phase never
 * flips (the music never switches from work to break) and playback eventually
 * dies. It also shows a media notification with the current phase / track.
 *
 * `useAudioPlayer` does not react to source changes on its own, so when the
 * uri changes (a work -> break phase transition, or the user picks another
 * work track) the source is switched explicitly via `replace`.
 */
export function useBackgroundMusic(
  uri: string,
  playing: boolean,
  metadata: AudioMetadata,
) {
  const player = useAudioPlayer({ uri });
  const currentUri = useRef(uri);

  // Loop the track and register the media session so the foreground service
  // runs; tear it down on unmount.
  useEffect(() => {
    player.loop = true;
    player.setActiveForLockScreen(true, metadata);
    return () => {
      player.setActiveForLockScreen(false);
    };
    // Register only on mount/unmount — metadata is kept in sync separately so a
    // label change does not restart the whole session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // Switch tracks when the uri changes.
  useEffect(() => {
    if (currentUri.current === uri) return;
    currentUri.current = uri;
    player.replace({ uri });
    if (playing) player.play();
  }, [uri, playing, player]);

  // Keep the lock-screen notification label in sync with the phase / track.
  useEffect(() => {
    player.updateLockScreenMetadata(metadata);
  }, [player, metadata.title, metadata.artist]);

  // Follow the timer's running state.
  useEffect(() => {
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [playing, player]);
}
