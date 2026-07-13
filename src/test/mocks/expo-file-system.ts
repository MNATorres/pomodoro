// Fake for expo-file-system's SDK 54 File/Directory API. jest-expo's preset
// registers its own legacy-API factory mock for this module, which both
// overrides root __mocks__ AND lacks File/Directory/Paths — so tests that
// touch the track cache must override it explicitly:
//
//   jest.mock('expo-file-system', () => require('<relative>/test/mocks/expo-file-system'));
//
// Downloads never resolve by default (no stray state updates outside act);
// tests that exercise the download flow override downloadFileAsync.
const existing = new Set<string>();

export const Paths = { document: '/mock-documents', cache: '/mock-cache' };

type PathLike = string | { path: string };

function joinPath(base: PathLike, name?: string): string {
  const basePath = typeof base === 'string' ? base : base.path;
  return name ? `${basePath}/${name}` : basePath;
}

export class Directory {
  path: string;

  constructor(base: PathLike, name?: string) {
    this.path = joinPath(base, name);
  }

  get uri() {
    return `file://${this.path}`;
  }

  create = jest.fn();
}

export class File {
  path: string;

  constructor(base: PathLike, name?: string) {
    this.path = joinPath(base, name);
  }

  get uri() {
    return `file://${this.path}`;
  }

  get exists() {
    return existing.has(this.path);
  }

  delete() {
    existing.delete(this.path);
  }

  rename(newName: string) {
    existing.delete(this.path);
    this.path = this.path.split('/').slice(0, -1).concat(newName).join('/');
    existing.add(this.path);
  }

  static downloadFileAsync = jest.fn(
    (_url: string, _destination: File) => new Promise<File>(() => {}),
  );
}

/** Test helper: mark a path as existing on the fake filesystem. */
export function __setExists(path: string) {
  existing.add(path);
}

/** Test helper: wipe the fake filesystem state. */
export function __reset() {
  existing.clear();
  File.downloadFileAsync.mockReset();
  File.downloadFileAsync.mockImplementation(
    (_url: string, _destination: File) => new Promise<File>(() => {}),
  );
}
