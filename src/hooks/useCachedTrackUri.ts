import { useEffect, useState } from 'react';
import { Track } from '../constants/tracks';
import { cachedTrackUri, ensureTrackCached } from '../lib/track-cache';

/**
 * Resolves a track to a playable uri, preferring the downloaded local copy.
 * While the first download is still running the remote streaming url is
 * returned as a fallback, and the uri flips to the local file once ready.
 */
export function useCachedTrackUri(track: Track): string {
  const [uri, setUri] = useState(() => cachedTrackUri(track) ?? track.uri);

  useEffect(() => {
    let cancelled = false;
    const cached = cachedTrackUri(track);
    if (cached) {
      setUri(cached);
      return;
    }
    setUri(track.uri);
    ensureTrackCached(track)
      .then((localUri) => {
        if (!cancelled) setUri(localUri);
      })
      .catch(() => {
        // Download failed (offline?); keep streaming and retry next mount.
      });
    return () => {
      cancelled = true;
    };
  }, [track]);

  return uri;
}
