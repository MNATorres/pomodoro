import { act, fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('App', () => {
  it('renders the default 25/5 work timer', () => {
    render(<App />);
    expect(screen.getByText('25:00')).toBeTruthy();
    expect(screen.getByText('Trabajo')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });

  it('shows all mode presets', () => {
    render(<App />);
    expect(screen.getByText('25 / 5')).toBeTruthy();
    expect(screen.getByText('40 / 5')).toBeTruthy();
    expect(screen.getByText('50 / 10')).toBeTruthy();
    expect(screen.getByText('1 / 1')).toBeTruthy();
  });

  it('changes the countdown when another mode is selected', () => {
    render(<App />);
    fireEvent.press(screen.getByText('50 / 10'));
    expect(screen.getByText('50:00')).toBeTruthy();
  });

  it('toggles the start control to pause when pressed', () => {
    render(<App />);
    fireEvent.press(screen.getByText('Iniciar'));
    expect(screen.getByText('Pausar')).toBeTruthy();
  });

  it('shows the work track selector with both tracks', () => {
    render(<App />);
    expect(screen.getByText('Música de trabajo')).toBeTruthy();
    expect(screen.getByText('Inception')).toBeTruthy();
    expect(screen.getByText('Vikings')).toBeTruthy();
  });

  it('keeps the timer intact when another work track is selected', () => {
    render(<App />);
    fireEvent.press(screen.getByText('Vikings'));
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('starts with no completed sessions', () => {
    render(<App />);
    expect(screen.getByText('Sesiones completadas: 0')).toBeTruthy();
  });

  it('counts down while running', () => {
    render(<App />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(screen.getByText('24:55')).toBeTruthy();
  });

  it('pauses keeping the remaining time', () => {
    render(<App />);
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
    render(<App />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    fireEvent.press(screen.getByText('40 / 5'));
    expect(screen.getByText('40:00')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });

  it('runs a full 1/1 work phase into the break', () => {
    render(<App />);
    fireEvent.press(screen.getByText('1 / 1'));
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(60_250);
    });
    expect(screen.getByText('Descanso')).toBeTruthy();
    expect(screen.getByText('Sesiones completadas: 1')).toBeTruthy();
  });

  it('resets back to a paused work phase', () => {
    render(<App />);
    fireEvent.press(screen.getByText('Iniciar'));
    act(() => {
      jest.advanceTimersByTime(8_000);
    });
    fireEvent.press(screen.getByText('Reiniciar'));
    expect(screen.getByText('25:00')).toBeTruthy();
    expect(screen.getByText('Trabajo')).toBeTruthy();
    expect(screen.getByText('Iniciar')).toBeTruthy();
  });
});
