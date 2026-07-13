jest.mock('expo-file-system', () =>
  require('../../test/mocks/expo-file-system'),
);

import {
  File,
  __reset,
  __setExists,
} from '../../test/mocks/expo-file-system';
import { Track } from '../../constants/tracks';
import { cachedTrackUri, ensureTrackCached } from '../track-cache';

const downloadMock = File.downloadFileAsync as jest.Mock;

/** Make downloads succeed instantly on the fake filesystem. */
function resolveDownloads() {
  downloadMock.mockImplementation(async (_url: string, destination: File) => {
    __setExists(destination.path);
    return destination;
  });
}

function track(id: string): Track {
  return { id, label: id, uri: `https://example.com/${id}.m4a` };
}

beforeEach(() => {
  __reset();
});

describe('cachedTrackUri', () => {
  it('returns null when the track was never downloaded', () => {
    expect(cachedTrackUri(track('never-downloaded'))).toBeNull();
  });

  it('returns the local uri when the file exists', () => {
    __setExists('/mock-documents/tracks/downloaded.m4a');
    expect(cachedTrackUri(track('downloaded'))).toBe(
      'file:///mock-documents/tracks/downloaded.m4a',
    );
  });
});

describe('ensureTrackCached', () => {
  it('downloads to a temp file and resolves with the local uri', async () => {
    // Capture the destination path at call time: rename() mutates the File
    // object after the download finishes.
    let downloadPath = '';
    downloadMock.mockImplementation(async (_url: string, destination: File) => {
      downloadPath = destination.path;
      __setExists(destination.path);
      return destination;
    });
    const uri = await ensureTrackCached(track('fresh'));
    expect(uri).toBe('file:///mock-documents/tracks/fresh.m4a');
    expect(downloadMock).toHaveBeenCalledWith(
      'https://example.com/fresh.m4a',
      expect.anything(),
    );
    expect(downloadPath).toBe('/mock-documents/tracks/fresh.part');
  });

  it('does not download again once cached', async () => {
    resolveDownloads();
    await ensureTrackCached(track('once'));
    await ensureTrackCached(track('once'));
    expect(downloadMock).toHaveBeenCalledTimes(1);
  });

  it('shares one download between concurrent calls', async () => {
    resolveDownloads();
    const t = track('concurrent');
    const [a, b] = await Promise.all([
      ensureTrackCached(t),
      ensureTrackCached(t),
    ]);
    expect(a).toBe(b);
    expect(downloadMock).toHaveBeenCalledTimes(1);
  });

  it('rejects when the download fails and allows retrying', async () => {
    downloadMock.mockRejectedValueOnce(new Error('offline'));
    await expect(ensureTrackCached(track('flaky'))).rejects.toThrow('offline');
    resolveDownloads();
    await expect(ensureTrackCached(track('flaky'))).resolves.toBe(
      'file:///mock-documents/tracks/flaky.m4a',
    );
  });
});
