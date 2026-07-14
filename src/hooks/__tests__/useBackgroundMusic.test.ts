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
    expect(player.setActiveForLockScreen).toHaveBeenCalledWith(true, META);
  });

  it('tears the media session down on unmount', () => {
    const { unmount } = setup(WORK_URI, true);
    unmount();
    expect(player.setActiveForLockScreen).toHaveBeenCalledWith(false);
  });
});
