import { LogBox } from 'react-native';

// expo-notifications auto-registers a push token listener as soon as the
// module loads. In Expo Go on Android that logs a Console Error saying push
// (remote) notifications were removed from Expo Go in SDK 53. This app only
// uses LOCAL scheduled notifications, which still work in Expo Go, so the
// error is noise. It does not exist in a development/production build.
//
// This module must be imported before anything that imports
// expo-notifications (see index.ts).
LogBox.ignoreLogs([/expo-notifications: Android Push notifications/]);
