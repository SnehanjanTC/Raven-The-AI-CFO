import { describe, it, expect } from 'vitest';
import { cn } from '@/shared/utils/cn';

describe('cn (classname merge utility)', () => {
  it('merges multiple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'text-sm')).toBe('base text-sm');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles empty string', () => {
    expect(cn('')).toBe('');
  });

  it('deduplicates identical classes', () => {
    expect(cn('font-bold', 'font-bold')).toBe('font-bold');
  });

  it('resolves complex Tailwind merges', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });
});
