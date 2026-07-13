import { BREAK_TRACK, DEFAULT_WORK_TRACK, WORK_TRACKS } from '../tracks';

describe('tracks', () => {
  it('offers two selectable work tracks', () => {
    expect(WORK_TRACKS.map((t) => t.label)).toEqual(['Inception', 'Vikings']);
  });

  it('has unique ids across all tracks', () => {
    const ids = [...WORK_TRACKS, BREAK_TRACK].map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every track to a remote https url', () => {
    for (const track of [...WORK_TRACKS, BREAK_TRACK]) {
      expect(track.uri).toMatch(/^https:\/\//);
    }
  });

  it('defaults to the first work track', () => {
    expect(DEFAULT_WORK_TRACK).toBe(WORK_TRACKS[0]);
  });
});
