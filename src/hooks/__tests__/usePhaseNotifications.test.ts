import { act, renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Phase } from '../useTimer';
import { usePhaseNotifications } from '../usePhaseNotifications';

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelMock = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const channelMock = Notifications.setNotificationChannelAsync as jest.Mock;
const permissionsMock = Notifications.requestPermissionsAsync as jest.Mock;

const ENDS_AT = 1_750_000_000_000;

beforeEach(() => {
  jest.clearAllMocks();
});

/** Flush pending promises (scheduling resolves asynchronously). */
const flush = () => act(async () => {});

function setup(phase: Phase, endsAt: number | null) {
  return renderHook(
    (props: { phase: Phase; endsAt: number | null }) =>
      usePhaseNotifications(props.phase, props.endsAt),
    { initialProps: { phase, endsAt } },
  );
}

describe('usePhaseNotifications', () => {
  it('creates the Android channel before requesting permission', async () => {
    setup('work', null);
    await flush();
    expect(channelMock).toHaveBeenCalledWith(
      'pomodoro-cycles',
      expect.objectContaining({ name: expect.any(String) }),
    );
    expect(channelMock.mock.invocationCallOrder[0]).toBeLessThan(
      permissionsMock.mock.invocationCallOrder[0],
    );
  });

  it('schedules nothing while the timer is paused', async () => {
    setup('work', null);
    await flush();
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('schedules the work-end alert at the exact end of the phase', async () => {
    setup('work', ENDS_AT);
    await flush();
    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Trabajo terminado'),
        }),
        trigger: expect.objectContaining({
          date: new Date(ENDS_AT),
          channelId: 'pomodoro-cycles',
        }),
      }),
    );
  });

  it('uses the break-end message during breaks', async () => {
    setup('break', ENDS_AT);
    await flush();
    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Fin del descanso'),
        }),
      }),
    );
  });

  it('cancels the scheduled alert when the timer pauses', async () => {
    const { rerender } = setup('work', ENDS_AT);
    await flush();
    rerender({ phase: 'work', endsAt: null });
    await flush();
    expect(cancelMock).toHaveBeenCalledWith('notification-id');
  });

  it('reschedules when the phase rolls over', async () => {
    const { rerender } = setup('work', ENDS_AT);
    await flush();
    rerender({ phase: 'break', endsAt: ENDS_AT + 300_000 });
    await flush();
    expect(cancelMock).toHaveBeenCalledWith('notification-id');
    expect(scheduleMock).toHaveBeenCalledTimes(2);
    expect(scheduleMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          date: new Date(ENDS_AT + 300_000),
        }),
      }),
    );
  });

  it('cancels the scheduled alert on unmount', async () => {
    const { unmount } = setup('work', ENDS_AT);
    await flush();
    unmount();
    await flush();
    expect(cancelMock).toHaveBeenCalledWith('notification-id');
  });
});
