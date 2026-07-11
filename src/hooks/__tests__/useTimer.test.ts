import { act, renderHook } from '@testing-library/react-native';
import { MODES } from '../../constants/modes';
import { useTimer } from '../useTimer';

const MODE = MODES[0]; // 25 / 5

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Advance `seconds` of ticks, flushing React updates and effects. */
async function advance(seconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

describe('useTimer', () => {
  it('starts paused at the full work duration', async () => {
    const { result } = await renderHook(() => useTimer(MODE));
    expect(result.current.phase).toBe('work');
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(result.current.running).toBe(false);
    expect(result.current.completedSessions).toBe(0);
  });

  it('counts down while running', async () => {
    const { result } = await renderHook(() => useTimer(MODE));
    await act(async () => result.current.start());
    await advance(3);
    expect(result.current.running).toBe(true);
    expect(result.current.secondsLeft).toBe(25 * 60 - 3);
  });

  it('does not tick while paused', async () => {
    const { result } = await renderHook(() => useTimer(MODE));
    await act(async () => result.current.start());
    await advance(2);
    await act(async () => result.current.pause());
    await advance(5);
    expect(result.current.secondsLeft).toBe(25 * 60 - 2);
  });

  it('switches to break and counts a session when work ends', async () => {
    const { result } = await renderHook(() => useTimer(MODE));
    await act(async () => result.current.start());
    await advance(25 * 60);
    expect(result.current.phase).toBe('break');
    expect(result.current.secondsLeft).toBe(5 * 60);
    expect(result.current.completedSessions).toBe(1);
  });

  it('returns to work after the break without counting a new session', async () => {
    const { result } = await renderHook(() => useTimer(MODE));
    await act(async () => result.current.start());
    await advance(25 * 60); // finish work -> break
    await advance(5 * 60); // finish break -> work
    expect(result.current.phase).toBe('work');
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(result.current.completedSessions).toBe(1);
  });

  it('reset returns to the initial paused work phase', async () => {
    const { result } = await renderHook(() => useTimer(MODE));
    await act(async () => result.current.start());
    await advance(10);
    await act(async () => result.current.reset());
    expect(result.current.phase).toBe('work');
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(result.current.running).toBe(false);
  });
});
