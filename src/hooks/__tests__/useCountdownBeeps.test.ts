import { renderHook } from '@testing-library/react-native';
import { useAudioPlayer } from 'expo-audio';
import { useCountdownBeeps } from '../useCountdownBeeps';

// The expo-audio manual mock returns a shared player instance.
const player = (useAudioPlayer as unknown as jest.Mock)();

beforeEach(() => {
  jest.clearAllMocks();
});

function setup(active: boolean, secondsLeft: number) {
  return renderHook(
    (props: { active: boolean; secondsLeft: number }) =>
      useCountdownBeeps(props.active, props.secondsLeft),
    { initialProps: { active, secondsLeft } },
  );
}

describe('useCountdownBeeps', () => {
  it('does not beep above the countdown window', () => {
    const { rerender } = setup(true, 60);
    rerender({ active: true, secondsLeft: 6 });
    expect(player.play).not.toHaveBeenCalled();
  });

  it('beeps once per second during the last five seconds', () => {
    const { rerender } = setup(true, 6);
    for (const s of [5, 4, 3, 2, 1]) {
      rerender({ active: true, secondsLeft: s });
    }
    expect(player.play).toHaveBeenCalledTimes(5);
  });

  it('does not repeat the beep for the same second', () => {
    const { rerender } = setup(true, 5);
    rerender({ active: true, secondsLeft: 5 });
    rerender({ active: true, secondsLeft: 5 });
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('stays silent while inactive', () => {
    const { rerender } = setup(false, 5);
    rerender({ active: false, secondsLeft: 3 });
    expect(player.play).not.toHaveBeenCalled();
  });

  it('restarts the clip from the beginning on each beep', () => {
    const { rerender } = setup(true, 6);
    rerender({ active: true, secondsLeft: 5 });
    expect(player.seekTo).toHaveBeenCalledWith(0);
  });
});
