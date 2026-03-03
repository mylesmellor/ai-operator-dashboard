import { describe, it, expect } from 'vitest';
import { generateRunId } from '../lib/workspace';

// ---------------------------------------------------------------------------
// generateRunId
// ---------------------------------------------------------------------------
describe('generateRunId', () => {
  it('returns a string matching the YYYYMMDD-HHMMSS-xxxx format', () => {
    const id = generateRunId();
    expect(id).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
  });

  it('embeds a valid date in the first segment', () => {
    const id = generateRunId();
    const [datePart] = id.split('-');
    const year = parseInt(datePart.slice(0, 4), 10);
    const month = parseInt(datePart.slice(4, 6), 10);
    const day = parseInt(datePart.slice(6, 8), 10);

    expect(year).toBeGreaterThanOrEqual(2024);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it('embeds a valid time in the second segment', () => {
    const id = generateRunId();
    const [, timePart] = id.split('-');
    const hours = parseInt(timePart.slice(0, 2), 10);
    const minutes = parseInt(timePart.slice(2, 4), 10);
    const seconds = parseInt(timePart.slice(4, 6), 10);

    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThanOrEqual(23);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThanOrEqual(59);
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThanOrEqual(59);
  });

  it('produces unique IDs on consecutive calls', () => {
    // The random suffix makes collisions astronomically unlikely; 20 calls is
    // enough to verify the uniqueness guarantee in practice.
    const ids = Array.from({ length: 20 }, generateRunId);
    expect(new Set(ids).size).toBe(20);
  });

  it('has exactly three hyphen-separated segments', () => {
    const id = generateRunId();
    expect(id.split('-')).toHaveLength(3);
  });
});
