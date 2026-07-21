import { describe, expect, it } from 'vitest';
import {
  formatRawScoreChip,
  formatRelevancePercent,
  toUnitRelevance,
} from './search-utils';

describe('toUnitRelevance / formatRelevancePercent', () => {
  it('maps BM25-like scores with page max to 0-100%', () => {
    expect(formatRelevancePercent(10, 10)).toBe('100%');
    expect(formatRelevancePercent(9, 10)).toBe('90%');
    expect(toUnitRelevance(10)).toBeLessThan(1);
    expect(toUnitRelevance(10)).toBeGreaterThan(0.4);
  });

  it('keeps unit scores as percent', () => {
    expect(formatRelevancePercent(0.87)).toBe('87%');
  });

  it('shows <1% for near-zero relative scores instead of 0% or fake floor', () => {
    expect(formatRelevancePercent(0, 0.98)).toBe('<1%');
    expect(toUnitRelevance(0, 0.98)).toBe(0);
    expect(formatRelevancePercent(0.005, 1)).toBe('<1%');
    expect(formatRelevancePercent(0.02, 1)).toBe('2%');
  });

  it('formats zero as 0.00 not dash', () => {
    expect(formatRawScoreChip(0)).toBe('0.00');
    expect(formatRawScoreChip(Number.NaN)).toBe('-');
  });

  it('formats raw chips without fake percent', () => {
    expect(formatRawScoreChip(12.345)).toBe('12.35');
    expect(formatRawScoreChip(0.91)).toBe('0.91');
  });
});
