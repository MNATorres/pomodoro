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

  it('exposes the phase end timestamp while running', () => {
    const { result } = renderHook(() => useTimer(MODE));
    expect(result.current.endsAt).toBeNull();
    act(() => result.current.start());
    expect(result.current.endsAt).toBe(Date.now() + 25 * 60 * 1000);
    act(() => result.current.pause());
    expect(result.current.endsAt).toBeNull();
  });

  it('resyncs after the clock jumps while suspended (locked phone)', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    // Simulate the OS suspending JS for 10 minutes: the clock moves forward
    // but no interval ticks fire, then a tick runs on resume.
    act(() => {
      jest.setSystemTime(Date.now() + 10 * 60 * 1000);
      jest.advanceTimersByTime(250);
    });
    expect(result.current.phase).toBe('work');
    // 25:00 minus the ~10 minutes that really elapsed.
    expect(result.current.secondsLeft).toBe(15 * 60);
  });

  it('rolls into the break with real-time alignment after waking past the end', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    // Suspended through the end of the work phase: wake up 26 minutes later.
    act(() => {
      jest.setSystemTime(Date.now() + 26 * 60 * 1000);
      jest.advanceTimersByTime(250);
    });
    // The break started when the work phase really ended (minute 25), so one
    // of its five minutes is already gone.
    expect(result.current.phase).toBe('break');
    expect(result.current.completedSessions).toBe(1);
    expect(result.current.secondsLeft).toBe(4 * 60);
  });
});
