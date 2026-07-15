import { useEffect, useRef } from 'react';
import {
  useAudioPlayer,
  type AudioMetadata,
  type AudioStatus,
} from 'expo-audio';

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
 * `onRemoteToggle` is invoked when playback is toggled from OUTSIDE the app —
 * the lock-screen media controls, a smartwatch or a headset button — so the
 * caller can keep the pomodoro timer in sync with the music. It is detected
 * by watching player status transitions that contradict the `playing` prop.
 *
 * `useAudioPlayer` does not react to source changes on its own, so when the
 * uri changes (a work -> break phase transition, or the user picks another
 * work track) the source is switched explicitly via `replace`.
 */
export function useBackgroundMusic(
  uri: string,
  playing: boolean,
  metadata: AudioMetadata,
  onRemoteToggle?: (shouldPlay: boolean) => void,
) {
  const player = useAudioPlayer({ uri });
  const currentUri = useRef(uri);

  // Latest values for the status listener without re-subscribing.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const onRemoteToggleRef = useRef(onRemoteToggle);
  onRemoteToggleRef.current = onRemoteToggle;

  // Replacing the source can emit a transient paused status that must not be
  // mistaken for the user pausing from the lock screen.
  const suppressRemoteUntil = useRef(0);

  // Loop the track and register the media session so the foreground service
  // runs; tear it down on unmount. Seek buttons are hidden: seeking makes no
  // sense for looping background music.
  useEffect(() => {
    player.loop = true;
    player.setActiveForLockScreen(true, metadata, {
      showSeekForward: false,
      showSeekBackward: false,
    });
    return () => {
      player.setActiveForLockScreen(false);
    };
    // Register only on mount/unmount — metadata is kept in sync separately so a
    // label change does not restart the whole session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // Detect play/pause coming from the media session (lock screen, watch,
  // headset): a real edge in the player's playing state that contradicts the
  // timer means the user toggled it remotely.
  useEffect(() => {
    let lastPlayerPlaying: boolean | null = null;
    const subscription = player.addListener(
      'playbackStatusUpdate',
      (status: AudioStatus) => {
        if (!status.isLoaded || status.isBuffering) return; // transient
        const was = lastPlayerPlaying;
        lastPlayerPlaying = status.playing;
        if (was === null || was === status.playing) return; // not an edge
        if (Date.now() < suppressRemoteUntil.current) return; // our own swap
        if (status.playing !== playingRef.current) {
          onRemoteToggleRef.current?.(status.playing);
        }
      },
    );
    return () => subscription.remove();
  }, [player]);

  // Switch tracks when the uri changes.
  useEffect(() => {
    if (currentUri.current === uri) return;
    currentUri.current = uri;
    suppressRemoteUntil.current = Date.now() + 1000;
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
