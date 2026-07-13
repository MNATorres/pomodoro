jest.mock('expo-file-system', () =>
  require('../../test/mocks/expo-file-system'),
);

import { act, renderHook } from '@testing-library/react-native';
import {
  File,
  __reset,
  __setExists,
} from '../../test/mocks/expo-file-system';
import { Track } from '../../constants/tracks';
import { useCachedTrackUri } from '../useCachedTrackUri';

const downloadMock = File.downloadFileAsync as jest.Mock;

function track(id: string): Track {
  return { id, label: id, uri: `https://example.com/${id}.m4a` };
}

beforeEach(() => {
  __reset();
});

describe('useCachedTrackUri', () => {
  it('returns the local uri immediately when already downloaded', () => {
    __setExists('/mock-documents/tracks/ready.m4a');
    const { result } = renderHook(() => useCachedTrackUri(track('ready')));
    expect(result.current).toBe('file:///mock-documents/tracks/ready.m4a');
  });

  it('falls back to the remote url while the download is in progress', () => {
    const { result } = renderHook(() => useCachedTrackUri(track('pending')));
    expect(result.current).toBe('https://example.com/pending.m4a');
  });

  it('flips to the local uri once the download finishes', async () => {
    downloadMock.mockImplementation(async (_url: string, destination: File) => {
      __setExists(destination.path);
      return destination;
    });
    const { result } = renderHook(() => useCachedTrackUri(track('flip')));
    expect(result.current).toBe('https://example.com/flip.m4a');
    await act(async () => {});
    expect(result.current).toBe('file:///mock-documents/tracks/flip.m4a');
  });

  it('keeps streaming when the download fails', async () => {
    downloadMock.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCachedTrackUri(track('broken')));
    await act(async () => {});
    expect(result.current).toBe('https://example.com/broken.m4a');
  });
});
