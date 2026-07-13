import { Directory, File, Paths } from 'expo-file-system';
import { Track } from '../constants/tracks';

// Persistent app storage (not the evictable cache directory): once a track
// is downloaded, sessions never depend on the network again. Streaming from
// Dropbox mid-session proved fragile — Android Doze cuts background network
// and playback dies when the buffer drains.
const TRACKS_DIR = new Directory(Paths.document, 'tracks');

const pending = new Map<string, Promise<string>>();

export function localTrackFile(track: Track): File {
  return new File(TRACKS_DIR, `${track.id}.m4a`);
}

/** Local uri if the track is already downloaded, otherwise null. */
export function cachedTrackUri(track: Track): string | null {
  const file = localTrackFile(track);
  return file.exists ? file.uri : null;
}

/**
 * Downloads the track to local storage (once) and resolves with its local
 * uri. The download goes to a temp file and is renamed at the end, so an
 * interrupted download never leaves a corrupt track behind. Concurrent calls
 * for the same track share one download.
 */
export function ensureTrackCached(track: Track): Promise<string> {
  const cached = cachedTrackUri(track);
  if (cached) return Promise.resolve(cached);

  const inFlight = pending.get(track.id);
  if (inFlight) return inFlight;

  const download = (async () => {
    TRACKS_DIR.create({ intermediates: true, idempotent: true });
    const temp = new File(TRACKS_DIR, `${track.id}.part`);
    if (temp.exists) temp.delete();
    await File.downloadFileAsync(track.uri, temp);
    temp.rename(`${track.id}.m4a`);
    return localTrackFile(track).uri;
  })();

  const tracked = download.finally(() => pending.delete(track.id));
  pending.set(track.id, tracked);
  return tracked;
}
