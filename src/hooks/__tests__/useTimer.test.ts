import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import { MODES } from '../../constants/modes';
import { PomodoroMode } from '../../constants/modes';
import { useTimer } from '../useTimer';

const MODE = MODES[0]; // 25 / 5

// Fake AppState for the whole file: capture the hook's foreground listeners
// so tests can simulate the app waking up. Installed once (beforeAll) so
// every subscription in every test gets a consistent fake.
let appStateListeners: Array<(state: AppStateStatus) => void> = [];
let appStateSpy: jest.SpyInstance;

beforeAll(() => {
  appStateSpy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler) => {
      appStateListeners.push(handler);
      return { remove: jest.fn() } as unknown as ReturnType<
        typeof AppState.addEventListener
      >;
    });
});

afterAll(() => {
  appStateSpy.mockRestore();
});

beforeEach(() => {
  appStateListeners = [];
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

  it('resyncs immediately when the app returns to the foreground', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    // The clock jumps but no interval tick fires: only the AppState
    // listener runs, as when the app wakes from the background.
    act(() => {
      jest.setSystemTime(Date.now() + 5 * 60 * 1000);
      appStateListeners.forEach((listener) => listener('active'));
    });
    expect(result.current.secondsLeft).toBe(20 * 60);
  });

  it('resets when the mode changes', () => {
    const { result, rerender } = renderHook(
      (mode: PomodoroMode) => useTimer(mode),
      { initialProps: MODES[0] },
    );
    act(() => result.current.start());
    advance(10);
    rerender(MODES[2]); // 50 / 10
    expect(result.current.running).toBe(false);
    expect(result.current.phase).toBe('work');
    expect(result.current.secondsLeft).toBe(50 * 60);
    expect(result.current.completedSessions).toBe(0);
  });

  it('ignores start while already running', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    advance(3);
    act(() => result.current.start());
    advance(1);
    expect(result.current.secondsLeft).toBe(25 * 60 - 4);
  });

  it('ignores pause while idle', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.pause());
    expect(result.current.running).toBe(false);
    expect(result.current.secondsLeft).toBe(25 * 60);
  });

  it('does not double-count a session when several ticks cross the boundary together', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    // Advance past the phase end in a single act: multiple interval ticks
    // observe the same expired end before React re-renders.
    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000 + 500);
    });
    expect(result.current.phase).toBe('break');
    expect(result.current.completedSessions).toBe(1);
  });

  it('counts every completed work session across cycles', () => {
    const { result } = renderHook(() => useTimer(MODE));
    act(() => result.current.start());
    // work (25) + break (5) + work (25), landing in the second break.
    advance(25 * 60);
    advance(5 * 60);
    advance(25 * 60);
    expect(result.current.phase).toBe('break');
    expect(result.current.completedSessions).toBe(2);
  });
});
