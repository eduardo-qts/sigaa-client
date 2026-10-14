import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/index.js';

describe('VERSION', () => {
  it('acompanha o package.json', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    ) as {
      version: string;
    };
    expect(VERSION).toBe(pkg.version);
  });
});
