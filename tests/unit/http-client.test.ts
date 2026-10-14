import { describe, expect, it, vi } from 'vitest';
import { CookieJar } from '../../src/http/cookie-jar.js';
import { HttpClient } from '../../src/http/http-client.js';
import { NetworkError, TimeoutError } from '../../src/errors.js';

type FetchFn = typeof fetch;

function client(fetchImpl: FetchFn, overrides: { retries?: number; timeoutMs?: number } = {}) {
  return new HttpClient({
    baseUrl: new URL('https://sig.example.org'),
    fetch: fetchImpl,
    jar: new CookieJar(),
    timeoutMs: overrides.timeoutMs ?? 1000,
    retries: overrides.retries ?? 2,
    retryDelayMs: 1,
    userAgent: 'teste'
  });
}

const latin1 = (text: string, init: ResponseInit = {}) =>
  new Response(Buffer.from(text, 'latin1'), {
    ...init,
    headers: { 'content-type': 'text/html;charset=ISO-8859-1', ...(init.headers as object) }
  });

describe('HttpClient', () => {
  it('decodifica ISO-8859-1 e resolve caminhos relativos à base', async () => {
    const fetchMock = vi.fn<FetchFn>(async () => latin1('Frequência – ação'.replace('–', '-')));
    const response = await client(fetchMock).get('/sigaa/x');
    expect(response.body).toBe('Frequência - ação');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://sig.example.org/sigaa/x');
  });

  it('envia formulários codificados em ISO-8859-1', async () => {
    const fetchMock = vi.fn<FetchFn>(async () => latin1('ok'));
    await client(fetchMock).post('/p', [['senha', 'ação']]);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('senha=a%E7%E3o');
    expect((init?.headers as Record<string, string>)['content-type']).toBe(
      'application/x-www-form-urlencoded'
    );
  });

  it('segue redirecionamentos mantendo cookies e trocando POST por GET', async () => {
    const calls: { method: string; url: string; cookie?: string | undefined }[] = [];
    const fetchMock = vi.fn<FetchFn>(async (input, init) => {
      const headers = init?.headers as Record<string, string>;
      calls.push({ method: init?.method ?? 'GET', url: String(input), cookie: headers.cookie });
      if (calls.length === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: '/destino', 'set-cookie': 'S=1; Path=/' }
        });
      }
      return latin1('fim');
    });
    const response = await client(fetchMock).post('/inicio', [['a', '1']]);
    expect(response.url.pathname).toBe('/destino');
    expect(calls[1]).toEqual({
      method: 'GET',
      url: 'https://sig.example.org/destino',
      cookie: 'S=1'
    });
  });

  it('mantém método e corpo em 307', async () => {
    const methods: string[] = [];
    const fetchMock = vi.fn<FetchFn>(async (_input, init) => {
      methods.push(init?.method ?? '');
      return methods.length === 1
        ? new Response(null, { status: 307, headers: { location: '/b' } })
        : latin1('ok');
    });
    await client(fetchMock).post('/a', []);
    expect(methods).toEqual(['POST', 'POST']);
  });

  it('bloqueia redirecionamento de HTTPS para HTTP', async () => {
    const fetchMock = vi.fn<FetchFn>(
      async () => new Response(null, { status: 302, headers: { location: 'http://evil.org/' } })
    );
    await expect(client(fetchMock, { retries: 0 }).get('/')).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('limita a quantidade de redirecionamentos', async () => {
    const fetchMock = vi.fn<FetchFn>(
      async () => new Response(null, { status: 302, headers: { location: '/loop' } })
    );
    await expect(client(fetchMock, { retries: 0 }).get('/')).rejects.toThrow('redirecionamentos');
  });

  it('refaz GET em 503 e em falha de rede, e não refaz POST', async () => {
    const get = vi
      .fn<FetchFn>()
      .mockResolvedValueOnce(new Response('x', { status: 503 }))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(latin1('ok'));
    expect((await client(get).get('/')).body).toBe('ok');
    expect(get).toHaveBeenCalledTimes(3);

    const post = vi.fn<FetchFn>().mockRejectedValue(new TypeError('fetch failed'));
    await expect(client(post).post('/', [])).rejects.toBeInstanceOf(NetworkError);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('esgota as tentativas e preserva a causa', async () => {
    const cause = new TypeError('fetch failed');
    const fetchMock = vi.fn<FetchFn>().mockRejectedValue(cause);
    const error = await client(fetchMock, { retries: 1 })
      .get('/x')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).cause).toBe(cause);
    expect((error as NetworkError).path).toBe('/x');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('traduz o tempo limite em TimeoutError', async () => {
    const fetchMock = vi.fn<FetchFn>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    );
    await expect(client(fetchMock, { retries: 0, timeoutMs: 20 }).get('/')).rejects.toBeInstanceOf(
      TimeoutError
    );
  });
});

describe('HttpClient (streaming)', () => {
  it('o tempo limite não interrompe um corpo que demora mais que o limite', async () => {
    const fetchMock = vi.fn<FetchFn>(async () => {
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          await new Promise((resolve) => setTimeout(resolve, 60));
          controller.enqueue(new TextEncoder().encode('conteúdo lento'));
          controller.close();
        }
      });
      return new Response(body);
    });
    const response = await client(fetchMock, { timeoutMs: 20 }).stream('/arquivo');
    expect(await new Response(response.body).text()).toBe('conteúdo lento');
  });

  it('mas o tempo limite vale enquanto aguarda os cabeçalhos', async () => {
    const fetchMock = vi.fn<FetchFn>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason);
          });
        })
    );
    await expect(client(fetchMock, { timeoutMs: 20 }).stream('/arquivo')).rejects.toBeInstanceOf(
      Error
    );
  });
});
