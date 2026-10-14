import { join, relative } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from '../../src/course/download.js';
import { CookieJar } from '../../src/http/cookie-jar.js';
import { encodeForm } from '../../src/http/form-encoding.js';
import { parseJsfLink } from '../../src/jsf/form.js';
import { clean, parseBrDate } from '../../src/util/text.js';

/** Testes baseados em propriedades (fuzzing): entradas geradas aleatoriamente. */

const percentDecodeLatin1 = (text: string): string =>
  text
    .replace(/\+/g, ' ')
    .replace(/%([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));

describe('encodeForm', () => {
  const latin1 = fc.string({
    unit: fc.integer({ min: 0, max: 255 }).map((n) => String.fromCharCode(n))
  });

  it('só emite caracteres seguros e decodifica de volta ao original (Latin-1)', () => {
    fc.assert(
      fc.property(latin1, latin1, (key, value) => {
        const encoded = encodeForm([[key, value]]);
        expect(encoded).toMatch(/^[A-Za-z0-9*\-._+%=]*$/);
        const [encodedKey = '', encodedValue = ''] = encoded.split('=');
        expect(percentDecodeLatin1(encodedKey)).toBe(key);
        expect(percentDecodeLatin1(encodedValue)).toBe(value);
      })
    );
  });

  it('nunca produz caracteres de controle nem separadores soltos para texto Unicode qualquer', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (value) => {
        expect(encodeForm([['k', value]])).toMatch(/^k=[A-Za-z0-9*\-._+%]*$/);
      })
    );
  });
});

describe('sanitizeFilename', () => {
  it('resulta sempre em um nome simples que não escapa do diretório', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (input) => {
        const name = sanitizeFilename(input);
        expect(name.length).toBeGreaterThan(0);
        expect(name.length).toBeLessThanOrEqual(200);
        expect(name).not.toMatch(/[/\\]/);
        expect(name.startsWith('.')).toBe(false);
        // eslint-disable-next-line no-control-regex
        expect(name).not.toMatch(/[\u0000-\u001f\u007f]/);
        const dir = '/tmp/destino';
        expect(relative(dir, join(dir, name)).startsWith('..')).toBe(false);
      })
    );
  });

  it('é idempotente', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const once = sanitizeFilename(input);
        expect(sanitizeFilename(once)).toBe(once);
      })
    );
  });
});

describe('clean', () => {
  it('é idempotente e não deixa espaços nas pontas nem sequências de espaços', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = clean(input);
        expect(clean(result)).toBe(result);
        expect(result).toBe(result.trim());
        expect(result).not.toMatch(/\s{2,}/);
      })
    );
  });
});

describe('parseBrDate', () => {
  it('lê de volta qualquer data válida', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(1990, 0, 1), max: new Date(2100, 0, 1), noInvalidDate: true }),
        (date) => {
          const text = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
          const parsed = parseBrDate(text);
          expect(parsed?.getFullYear()).toBe(date.getFullYear());
          expect(parsed?.getMonth()).toBe(date.getMonth());
          expect(parsed?.getDate()).toBe(date.getDate());
        }
      )
    );
  });

  it('nunca lança exceção, qualquer que seja o texto', () => {
    fc.assert(fc.property(fc.string({ unit: 'binary' }), (text) => void parseBrDate(text)));
  });
});

describe('parseJsfLink', () => {
  const jsString = fc.string({ unit: 'binary' }).map((s) => s.replace(/[\n\r]/g, ' '));
  const escapeJs = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  it('recupera os parâmetros de qualquer link bem formado', () => {
    fc.assert(
      fc.property(fc.dictionary(jsString, jsString, { minKeys: 1, maxKeys: 6 }), (params) => {
        const body = Object.entries(params)
          .map(([k, v]) => `'${escapeJs(k)}':'${escapeJs(v)}'`)
          .join(',');
        const onclick = `var a=function(){};if(typeof jsfcljs == 'function'){jsfcljs(document.getElementById('form1'),{${body}},'');}return false`;
        const link = parseJsfLink(onclick);
        expect(link?.formId).toBe('form1');
        expect(link?.params).toEqual(params);
      })
    );
  });

  it('nunca lança exceção para texto arbitrário', () => {
    fc.assert(fc.property(fc.string({ unit: 'binary' }), (text) => void parseJsfLink(text)));
  });
});

describe('CookieJar', () => {
  const label = fc.stringMatching(/^[a-z]{3,8}$/);

  it('cookies host-only nunca vazam para outro host', () => {
    fc.assert(
      fc.property(label, label, fc.stringMatching(/^[A-Za-z0-9]{1,12}$/), (a, b, value) => {
        fc.pre(a !== b);
        const jar = new CookieJar();
        jar.store(new URL(`https://${a}.example.org/`), [`s=${value}; Path=/`]);
        expect(jar.header(new URL(`https://${b}.example.org/`))).toBeUndefined();
        expect(jar.header(new URL(`https://${a}.example.org/x`))).toBe(`s=${value}`);
      })
    );
  });

  it('não lança exceção com cabeçalhos Set-Cookie arbitrários', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ unit: 'binary' }), { maxLength: 5 }), (headers) => {
        const jar = new CookieJar();
        jar.store(new URL('https://a.example.org/'), headers);
        void jar.header(new URL('https://a.example.org/'));
      })
    );
  });
});
