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
function advance(seconds: number) {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

describe('useTimer', () => {
  it('starts paused at the full work duration', () => {
    const { result } = renderHook(() => useTimer(MODE));
    expect(result.current.phase).toBe('work');
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(result.current.running).toBe(false);
    expect(result.current.completedSessions).toBe(0);
  });

  it('counts down while running', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    advance(3);
    expect(result.current.running).toBe(true);
    expect(result.current.secondsLeft).toBe(25 * 60 - 3);
  });

  it('does not tick while paused', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    advance(2);
    act(() => result.current.pause());
    advance(5);
    expect(result.current.secondsLeft).toBe(25 * 60 - 2);
  });

  it('switches to break and counts a session when work ends', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    advance(25 * 60);
    expect(result.current.phase).toBe('break');
    expect(result.current.secondsLeft).toBe(5 * 60);
    expect(result.current.completedSessions).toBe(1);
  });

  it('returns to work after the break without counting a new session', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    advance(25 * 60); // finish work -> break
    advance(5 * 60); // finish break -> work
    expect(result.current.phase).toBe('work');
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(result.current.completedSessions).toBe(1);
  });

  it('reset returns to the initial paused work phase', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    advance(10);
    act(() => result.current.reset());
    expect(result.current.phase).toBe('work');
    expect(result.current.secondsLeft).toBe(25 * 60);
    expect(result.current.running).toBe(false);
  });
});
