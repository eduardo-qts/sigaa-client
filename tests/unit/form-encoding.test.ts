import { describe, expect, it } from 'vitest';
import { encodeForm } from '../../src/http/form-encoding.js';

describe('encodeForm', () => {
  it('codifica em ISO-8859-1', () => {
    expect(encodeForm([['senha', 'ação é']])).toBe('senha=a%E7%E3o+%E9');
  });

  it('escapa caracteres reservados e mantém os não reservados', () => {
    expect(encodeForm([['a b', 'x&y=z/ç*-._']])).toBe('a+b=x%26y%3Dz%2F%E7*-._');
  });

  it('usa entidade numérica para caracteres fora do Latin-1', () => {
    expect(encodeForm([['k', 'a€b']])).toBe('k=a%26%238364%3Bb');
  });

  it('une vários campos', () => {
    expect(
      encodeForm([
        ['a', '1'],
        ['b', '2']
      ])
    ).toBe('a=1&b=2');
  });
});
