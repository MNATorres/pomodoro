// Manual mock for AsyncStorage: an in-memory key/value store. Being under the
// root __mocks__ directory, Jest applies it automatically to the node_modules
// package of the same name.
let store: Record<string, string> = {};

export default {
  getItem: jest.fn(async (key: string) =>
    key in store ? store[key] : null,
  ),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete store[key];
  }),
  clear: jest.fn(async () => {
    store = {};
  }),
};
