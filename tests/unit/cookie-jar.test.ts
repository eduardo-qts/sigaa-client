import { describe, expect, it } from 'vitest';
import { CookieJar } from '../../src/http/cookie-jar.js';

const url = (value: string) => new URL(value);

describe('CookieJar', () => {
  it('envia o cookie de volta ao mesmo host', () => {
    const jar = new CookieJar();
    jar.store(url('https://sig.example.org/sigaa/login'), [
      'JSESSIONID=abc; Path=/; Secure; HttpOnly'
    ]);
    expect(jar.header(url('https://sig.example.org/sigaa/x'))).toBe('JSESSIONID=abc');
  });

  it('não envia cookies host-only a outros hosts', () => {
    const jar = new CookieJar();
    jar.store(url('https://sig.example.org/'), ['JSESSIONID=abc; Path=/']);
    expect(jar.header(url('https://arquivos.example.org/f'))).toBeUndefined();
    expect(jar.header(url('https://evil.org/'))).toBeUndefined();
  });

  it('respeita Domain e não confunde sufixos parecidos', () => {
    const jar = new CookieJar();
    jar.store(url('https://sig.example.org/'), ['a=1; Domain=example.org; Path=/']);
    expect(jar.header(url('https://arquivos.example.org/'))).toBe('a=1');
    expect(jar.header(url('https://badexample.org/'))).toBeUndefined();
  });

  it('ignora Domain que não cobre o host de origem', () => {
    const jar = new CookieJar();
    jar.store(url('https://sig.example.org/'), ['a=1; Domain=other.org; Path=/']);
    expect(jar.header(url('https://other.org/'))).toBeUndefined();
    expect(jar.header(url('https://sig.example.org/'))).toBe('a=1');
  });

  it('respeita Path e Secure', () => {
    const jar = new CookieJar();
    jar.store(url('https://sig.example.org/'), ['a=1; Path=/sigaa; Secure']);
    expect(jar.header(url('https://sig.example.org/sigaa/x'))).toBe('a=1');
    expect(jar.header(url('https://sig.example.org/sigaaX'))).toBeUndefined();
    expect(jar.header(url('https://sig.example.org/outro'))).toBeUndefined();
    expect(jar.header(url('http://sig.example.org/sigaa/x'))).toBeUndefined();
  });

  it('substitui cookies de mesmo nome e remove os expirados', () => {
    const jar = new CookieJar();
    const now = 1_000_000;
    jar.store(url('https://a.org/'), ['k=1; Path=/'], now);
    jar.store(url('https://a.org/'), ['k=2; Path=/'], now);
    expect(jar.header(url('https://a.org/'), now)).toBe('k=2');
    jar.store(url('https://a.org/'), ['k=3; Path=/; Max-Age=0'], now);
    expect(jar.header(url('https://a.org/'), now)).toBeUndefined();
    jar.store(url('https://a.org/'), ['t=1; Path=/; Max-Age=10'], now);
    expect(jar.header(url('https://a.org/'), now + 9_000)).toBe('t=1');
    expect(jar.header(url('https://a.org/'), now + 11_000)).toBeUndefined();
  });

  it('ignora cabeçalhos malformados e limpa tudo em clear()', () => {
    const jar = new CookieJar();
    jar.store(url('https://a.org/'), ['sem-igual', '=vazio', 'ok=1']);
    expect(jar.header(url('https://a.org/'))).toBe('ok=1');
    jar.clear();
    expect(jar.header(url('https://a.org/'))).toBeUndefined();
  });
});
