// Manual mock for expo-notifications: native notifications are unavailable
// under Jest. Being in the root __mocks__ directory, Jest applies it
// automatically.
export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn(async () => null);
export const requestPermissionsAsync = jest.fn(async () => ({
  status: 'granted',
}));
export const scheduleNotificationAsync = jest.fn(async () => 'notification-id');
export const cancelScheduledNotificationAsync = jest.fn(async () => {});

export const AndroidImportance = {
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

export const SchedulableTriggerInputTypes = {
  DATE: 'date',
};
