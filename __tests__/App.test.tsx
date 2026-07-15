jest.mock('expo-file-system', () =>
  require('../src/test/mocks/expo-file-system'),
);

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import App, { Pomodoro } from '../App';
import { saveSession } from '../src/lib/session-store';

// The expo-audio manual mock returns a shared player instance.
const player = (useAudioPlayer as unknown as jest.Mock)();

/** Emit a playbackStatusUpdate as if it came from the media session. */
function emitPlaybackStatus(playing: boolean) {
  const listener = (player.addListener as jest.Mock).mock.calls.at(-1)![1];
  act(() => {
    listener({ isLoaded: true, isBuffering: false, playing });
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// The tests below drive the inner Pomodoro component directly with an explicit
// initial state, which keeps them synchronous (the default App export gates
// rendering on an async session load — covered separately in "App gate").
describe('Pomodoro', () => {
  it('renders the default 25/5 work timer', () => {
    render(<Pomodoro initial={null} />);
    expect(screen.getByText('25:00')).toBeTruthy();
    expect(screen.getByText('Trabajo')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });

  it('shows all mode presets', () => {
    render(<Pomodoro initial={null} />);
    expect(screen.getByText('25 / 5')).toBeTruthy();
    expect(screen.getByText('40 / 5')).toBeTruthy();
    expect(screen.getByText('50 / 10')).toBeTruthy();
    expect(screen.getByText('1 / 1')).toBeTruthy();
  });

  it('changes the countdown when another mode is selected', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('50 / 10'));
    expect(screen.getByText('50:00')).toBeTruthy();
  });

  it('toggles the start control to pause when pressed', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    expect(screen.getByText('Pausar')).toBeTruthy();
  });

  it('shows the work track selector with both tracks', () => {
    render(<Pomodoro initial={null} />);
    expect(screen.getByText('Música de trabajo')).toBeTruthy();
    expect(screen.getByText('Inception')).toBeTruthy();
    expect(screen.getByText('Vikings')).toBeTruthy();
  });

  it('keeps the timer intact when another work track is selected', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Vikings'));
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('starts with no completed sessions', () => {
    render(<Pomodoro initial={null} />);
    expect(screen.getByText('Sesiones completadas: 0')).toBeTruthy();
  });

  it('counts down while running', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(screen.getByText('24:55')).toBeTruthy();
  });

  it('pauses keeping the remaining time', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    fireEvent.press(screen.getByText('Pausar'));
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('24:55')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });

  it('resets to the new mode when changed mid-session', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    fireEvent.press(screen.getByText('40 / 5'));
    expect(screen.getByText('40:00')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });

  it('runs a full 1/1 work phase into the break', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('1 / 1'));
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(60_250);
    });
    expect(screen.getByText('Descanso')).toBeTruthy();
    expect(screen.getByText('Sesiones completadas: 1')).toBeTruthy();
  });

  it('resets back to a paused work phase', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(8_000);
    });
    fireEvent.press(screen.getByText('Reiniciar'));
    expect(screen.getByText('25:00')).toBeTruthy();
    expect(screen.getByText('Trabajo')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });

  it('titles the media card with the countdown and phase', () => {
    render(<Pomodoro initial={null} />);
    expect(player.updateLockScreenMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '25:00 · Trabajo',
        artist: 'Pomodoro · Inception',
        // Progress payload for the patched native session: 25 min phase,
        // not running (endsAt -1), 25 min still remaining while paused.
        albumTitle: 'pomodoro:1500000:-1:1500000',
      }),
    );
  });

  it('sends the running progress payload to the media session', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    const endsAt = Date.now() + 25 * 60 * 1000;
    expect(player.updateLockScreenMetadata).toHaveBeenLastCalledWith(
      expect.objectContaining({
        albumTitle: `pomodoro:1500000:${endsAt}:-1`,
      }),
    );
  });

  it('pauses the timer when playback is paused from the media session', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    emitPlaybackStatus(true);
    emitPlaybackStatus(false); // pause pressed on the lock screen / watch
    expect(screen.getByText('Iniciar')).toBeTruthy();
    // The countdown is frozen too.
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('24:55')).toBeTruthy();
  });

  it('resumes the timer when playback is resumed from the media session', () => {
    render(<Pomodoro initial={null} />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    fireEvent.press(screen.getByText('Pausar'));
    emitPlaybackStatus(false);
    emitPlaybackStatus(true); // play pressed on the lock screen / watch
    expect(screen.getByText('Pausar')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(screen.getByText('24:50')).toBeTruthy();
  });

  it('restores a paused session from its snapshot', () => {
    render(
      <Pomodoro
        initial={{
          modeId: '40-5',
          workTrackId: 'vikings',
          phase: 'work',
          endsAt: null,
          secondsLeft: 12 * 60 + 34,
          completedSessions: 5,
        }}
      />,
    );
    expect(screen.getByText('12:34')).toBeTruthy();
    expect(screen.getByText('Sesiones completadas: 5')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });
});

describe('App gate', () => {
  it('gates on the async session load, then restores the saved session', async () => {
    await AsyncStorage.clear();
    await saveSession({
      modeId: '40-5',
      workTrackId: 'vikings',
      phase: 'work',
      endsAt: null,
      secondsLeft: 40 * 60,
      completedSessions: 2,
    });

    render(<App />);
    // The splash renders first — the timer is not mounted yet.
    expect(screen.queryByText('40:00')).toBeNull();

    // Flush the loadSession() promise.
    await act(async () => {});

    expect(screen.getByText('40:00')).toBeTruthy();
    expect(screen.getByText('Sesiones completadas: 2')).toBeTruthy();
  });
});
