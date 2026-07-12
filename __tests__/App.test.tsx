import { fireEvent, render, screen } from '@testing-library/react-native';
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

  it('shows the three mode presets', () => {
    render(<App />);
    expect(screen.getByText('25 / 5')).toBeTruthy();
    expect(screen.getByText('40 / 5')).toBeTruthy();
    expect(screen.getByText('50 / 10')).toBeTruthy();
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
});
