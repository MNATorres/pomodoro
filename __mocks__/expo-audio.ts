// Manual mock for expo-audio: native audio is unavailable under Jest.
// Being in the root __mocks__ directory, Jest applies it automatically.
const player = {
  loop: false,
  play: jest.fn(),
  pause: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(),
};

export const useAudioPlayer = jest.fn(() => player);
export const setAudioModeAsync = jest.fn(async () => {});
