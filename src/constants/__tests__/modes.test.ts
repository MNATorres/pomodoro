import { DEFAULT_MODE, MODES } from '../modes';

describe('MODES', () => {
  it('exposes the three default presets in order', () => {
    expect(MODES.map((m) => m.label)).toEqual(['25 / 5', '40 / 5', '50 / 10']);
  });

  it('maps each preset to its work/break minutes', () => {
    expect(MODES.map((m) => [m.work, m.break])).toEqual([
      [25, 5],
      [40, 5],
      [50, 10],
    ]);
  });

  it('has unique ids', () => {
    const ids = MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses positive work and break durations', () => {
    for (const m of MODES) {
      expect(m.work).toBeGreaterThan(0);
      expect(m.break).toBeGreaterThan(0);
    }
  });

  it('defaults to the 25/5 preset', () => {
    expect(DEFAULT_MODE).toBe(MODES[0]);
    expect(DEFAULT_MODE.work).toBe(25);
    expect(DEFAULT_MODE.break).toBe(5);
  });
});
