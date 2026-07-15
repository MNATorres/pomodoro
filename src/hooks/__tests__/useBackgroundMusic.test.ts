import { renderHook } from '@testing-library/react-native';
import { useAudioPlayer } from 'expo-audio';
import { useBackgroundMusic } from '../useBackgroundMusic';

// The expo-audio manual mock returns a shared player instance.
const player = (useAudioPlayer as unknown as jest.Mock)();

beforeEach(() => {
  jest.clearAllMocks();
  player.loop = false;
});

const WORK_URI = 'https://example.com/work.m4a';
const BREAK_URI = 'https://example.com/break.m4a';
const META = { title: 'Trabajo', artist: 'Pomodoro' };

function setup(uri: string, playing: boolean) {
  return renderHook(
    (props: { uri: string; playing: boolean }) =>
      useBackgroundMusic(props.uri, props.playing, META),
    { initialProps: { uri, playing } },
  );
}

describe('useBackgroundMusic', () => {
  it('loops the track', () => {
    setup(WORK_URI, false);
    expect(player.loop).toBe(true);
  });

  it('plays while the timer runs', () => {
    setup(WORK_URI, true);
    expect(player.play).toHaveBeenCalled();
    expect(player.pause).not.toHaveBeenCalled();
  });

  it('stays paused while the timer is stopped', () => {
    setup(WORK_URI, false);
    expect(player.pause).toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  it('pauses when the timer stops', () => {
    const { rerender } = setup(WORK_URI, true);
    rerender({ uri: WORK_URI, playing: false });
    expect(player.pause).toHaveBeenCalled();
  });

  it('switches the source and keeps playing when the uri changes', () => {
    const { rerender } = setup(WORK_URI, true);
    rerender({ uri: BREAK_URI, playing: true });
    expect(player.replace).toHaveBeenCalledWith({ uri: BREAK_URI });
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('switches the source without playing while stopped', () => {
    const { rerender } = setup(WORK_URI, false);
    rerender({ uri: BREAK_URI, playing: false });
    expect(player.replace).toHaveBeenCalledWith({ uri: BREAK_URI });
    expect(player.play).not.toHaveBeenCalled();
  });

  it('does not replace the source on unrelated re-renders', () => {
    const { rerender } = setup(WORK_URI, true);
    rerender({ uri: WORK_URI, playing: false });
    rerender({ uri: WORK_URI, playing: true });
    expect(player.replace).not.toHaveBeenCalled();
  });

  it('registers the media session (starts the foreground service)', () => {
    setup(WORK_URI, true);
    expect(player.setActiveForLockScreen).toHaveBeenCalledWith(true, META, {
      showSeekForward: false,
      showSeekBackward: false,
    });
  });

  it('tears the media session down on unmount', () => {
    const { unmount } = setup(WORK_URI, true);
    unmount();
    expect(player.setActiveForLockScreen).toHaveBeenCalledWith(false);
  });
});

describe('remote media controls', () => {
  function setupWithToggle(playing: boolean, onRemoteToggle: jest.Mock) {
    return renderHook(
      (props: { uri: string; playing: boolean }) =>
        useBackgroundMusic(props.uri, props.playing, META, onRemoteToggle),
      { initialProps: { uri: WORK_URI, playing } },
    );
  }

  /** Emit a playbackStatusUpdate to the hook's registered listener. */
  function emitStatus(playing: boolean, extra: object = {}) {
    const listener = (player.addListener as jest.Mock).mock.calls.at(-1)![1];
    listener({ isLoaded: true, isBuffering: false, playing, ...extra });
  }

  it('reports a pause coming from the media session', () => {
    const onRemoteToggle = jest.fn();
    setupWithToggle(true, onRemoteToggle);
    emitStatus(true);
    emitStatus(false);
    expect(onRemoteToggle).toHaveBeenCalledWith(false);
  });

  it('reports a resume coming from the media session', () => {
    const onRemoteToggle = jest.fn();
    setupWithToggle(false, onRemoteToggle);
    emitStatus(false);
    emitStatus(true);
    expect(onRemoteToggle).toHaveBeenCalledWith(true);
  });

  it('does not report transitions caused by the app itself', () => {
    const onRemoteToggle = jest.fn();
    const { rerender } = setupWithToggle(true, onRemoteToggle);
    emitStatus(true);
    rerender({ uri: WORK_URI, playing: false }); // in-app pause
    emitStatus(false); // player echoes it
    expect(onRemoteToggle).not.toHaveBeenCalled();
  });

  it('ignores transient buffering states', () => {
    const onRemoteToggle = jest.fn();
    setupWithToggle(true, onRemoteToggle);
    emitStatus(true);
    emitStatus(false, { isBuffering: true });
    emitStatus(false, { isLoaded: false });
    expect(onRemoteToggle).not.toHaveBeenCalled();
  });

  it('ignores the pause blip caused by switching tracks', () => {
    const onRemoteToggle = jest.fn();
    const { rerender } = setupWithToggle(true, onRemoteToggle);
    emitStatus(true);
    rerender({ uri: BREAK_URI, playing: true }); // phase change replaces the source
    emitStatus(false); // transient blip from the swap
    expect(onRemoteToggle).not.toHaveBeenCalled();
  });
});
