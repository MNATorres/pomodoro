import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Phase } from './useTimer';

// Show cycle-end alerts even while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'pomodoro-cycles';

async function ensureSetup() {
  // On Android 13+ the permission prompt only appears after at least one
  // notification channel exists, so the channel must be created first.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Ciclos de Pomodoro',
    importance: Notifications.AndroidImportance.MAX,
  });
  await Notifications.requestPermissionsAsync();
}

/**
 * Schedules a local notification for the exact moment the current phase ends,
 * so the user is alerted even if the OS suspended the app (screen locked).
 * The notification is cancelled and rescheduled whenever the phase or its end
 * timestamp changes, and cancelled while the timer is paused (endsAt null).
 */
export function usePhaseNotifications(phase: Phase, endsAt: number | null) {
  useEffect(() => {
    ensureSetup().catch(() => {});
  }, []);

  useEffect(() => {
    if (endsAt === null) return;

    let id: string | null = null;
    let cancelled = false;

    const content =
      phase === 'work'
        ? { title: '¡Trabajo terminado! 🍅', body: 'Hora de descansar.' }
        : { title: 'Fin del descanso ☕', body: '¡De vuelta al trabajo!' };

    Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(endsAt),
        channelId: CHANNEL_ID,
      },
    })
      .then((identifier) => {
        if (cancelled) {
          // The phase changed before scheduling resolved.
          Notifications.cancelScheduledNotificationAsync(identifier).catch(
            () => {},
          );
        } else {
          id = identifier;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (id) {
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      }
    };
  }, [phase, endsAt]);
}
