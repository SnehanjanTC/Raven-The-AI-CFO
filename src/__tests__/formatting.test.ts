import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatCurrency, getTimeAgo, generateId } from '@/shared/utils/formatting';

describe('formatCurrency', () => {
  it('formats a basic amount with two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    // toLocaleString places the currency symbol before the minus sign
    expect(formatCurrency(-500)).toContain('500.00');
  });

  it('formats compact millions', () => {
    expect(formatCurrency(2_500_000, true)).toBe('$2.50M');
  });

  it('formats compact thousands', () => {
    expect(formatCurrency(45_000, true)).toBe('$45.0k');
  });

  it('formats compact small amounts normally', () => {
    expect(formatCurrency(999, true)).toBe('$999.00');
  });

  it('does not compact when flag is false', () => {
    expect(formatCurrency(2_500_000, false)).toContain('2,500,000.00');
  });
});

describe('getTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for timestamps less than 60 seconds ago', () => {
    const ts = new Date('2026-04-11T11:59:30Z').toISOString();
    expect(getTimeAgo(ts)).toBe('Just now');
  });

  it('returns minutes ago', () => {
    const ts = new Date('2026-04-11T11:50:00Z').toISOString();
    expect(getTimeAgo(ts)).toBe('10m ago');
  });

  it('returns hours ago', () => {
    const ts = new Date('2026-04-11T09:00:00Z').toISOString();
    expect(getTimeAgo(ts)).toBe('3h ago');
  });

  it('returns a date string for timestamps older than 24 hours', () => {
    const ts = new Date('2026-04-09T12:00:00Z').toISOString();
    const result = getTimeAgo(ts);
    // Should be a locale date string, not "Xh ago"
    expect(result).not.toContain('ago');
  });
});

describe('generateId', () => {
  it('returns a string of length 7', () => {
    const id = generateId();
    expect(id).toHaveLength(7);
  });

  it('returns alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBeGreaterThan(90);
  });
});
