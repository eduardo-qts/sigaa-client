import { describe, expect, it } from 'vitest';
import { clean, fold, parseBrDate, parseDecimal } from '../../src/util/text.js';

describe('text utils', () => {
  it('clean colapsa espaços, inclusive NBSP', () => {
    expect(clean('  a \n\t b c  ')).toBe('a b c');
    expect(clean(undefined)).toBe('');
  });

  it('fold remove acentos e caixa', () => {
    expect(fold(' Frequência ')).toBe('frequencia');
  });

  it('parseBrDate lê data e hora, e rejeita datas impossíveis', () => {
    expect(parseBrDate('01/10/2026')).toEqual(new Date(2026, 9, 1));
    expect(parseBrDate('01/10/2026 08:17')).toEqual(new Date(2026, 9, 1, 8, 17));
    expect(parseBrDate('31/02/2026')).toBeUndefined();
    expect(parseBrDate('sem data')).toBeUndefined();
  });

  it('parseDecimal aceita vírgula e ponto', () => {
    expect(parseDecimal(' 7,5 ')).toBe(7.5);
    expect(parseDecimal('7.25')).toBe(7.25);
    expect(parseDecimal('-')).toBeUndefined();
    expect(parseDecimal('')).toBeUndefined();
  });
});
