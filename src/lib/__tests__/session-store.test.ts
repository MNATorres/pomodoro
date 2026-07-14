import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSession, saveSession, SessionSnapshot } from '../session-store';

const SNAPSHOT: SessionSnapshot = {
  modeId: '25-5',
  workTrackId: 'inception',
  phase: 'work',
  endsAt: 1_000_000,
  secondsLeft: 0,
  completedSessions: 3,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('session-store', () => {
  it('round-trips a saved session', async () => {
    await saveSession(SNAPSHOT);
    expect(await loadSession()).toEqual(SNAPSHOT);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadSession()).toBeNull();
  });

  it('returns null when the stored value is corrupt', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('not json');
    expect(await loadSession()).toBeNull();
  });

  it('swallows storage write errors', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('disk full'),
    );
    await expect(saveSession(SNAPSHOT)).resolves.toBeUndefined();
  });
});
