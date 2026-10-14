import { NetworkError, SigaaError, TimeoutError } from '../errors.js';
import { VERSION } from '../version.js';
import type { CookieJar } from './cookie-jar.js';
import { encodeForm } from './form-encoding.js';

export type FormFields = readonly (readonly [string, string])[];

export interface HttpClientOptions {
  baseUrl: URL;
  fetch: typeof globalThis.fetch;
  jar: CookieJar;
  timeoutMs: number;
  /** Tentativas extras para GET em falhas transitórias. Nunca se aplica a POST. */
  retries: number;
  retryDelayMs: number;
  userAgent: string;
}

export interface HttpResponse {
  status: number;
  /** URL final, depois dos redirecionamentos. */
  url: URL;
  headers: Headers;
  /** Corpo decodificado (ISO-8859-1 por padrão, como o SIGAA). */
  body: string;
}

export interface StreamResponse {
  status: number;
  url: URL;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
}

const MAX_REDIRECTS = 10;
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
const TRANSIENT_STATUS = new Set([502, 503, 504]);

export const defaultUserAgent = `sigaa-client/${VERSION} (+https://github.com/eduardo-qts/sigaa-client)`;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isTimeout = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');

function decode(bytes: Uint8Array, contentType: string | null): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ?? 'iso-8859-1';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('iso-8859-1').decode(bytes);
  }
}

/**
 * Cliente HTTP sobre `fetch`: cookies por domínio, redirecionamentos manuais (somente sem
 * rebaixar HTTPS), timeout, retentativas apenas para GET e decodificação ISO-8859-1.
 */
export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  get baseUrl(): URL {
    return this.options.baseUrl;
  }

  clearCookies(): void {
    this.options.jar.clear();
  }

  resolve(target: string | URL): URL {
    return new URL(target, this.options.baseUrl);
  }

  get(target: string | URL): Promise<HttpResponse> {
    return this.text('GET', target);
  }

  post(target: string | URL, fields: FormFields): Promise<HttpResponse> {
    return this.text('POST', target, fields);
  }

  /** Resposta com corpo em *stream* (downloads). O chamador consome ou cancela o corpo. */
  async stream(target: string | URL, fields?: FormFields): Promise<StreamResponse> {
    const method = fields ? 'POST' : 'GET';
    // O tempo limite vale até os cabeçalhos chegarem; downloads longos não são interrompidos.
    const { response, url, stopTimer } = await this.send(method, this.resolve(target), fields);
    stopTimer();
    return { status: response.status, url, headers: response.headers, body: response.body };
  }

  private async text(
    method: 'GET' | 'POST',
    target: string | URL,
    fields?: FormFields
  ): Promise<HttpResponse> {
    const url = this.resolve(target);
    const attempts = method === 'GET' ? this.options.retries + 1 : 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await sleep(this.options.retryDelayMs * 2 ** (attempt - 1));
      try {
        const { response, url: finalUrl, stopTimer } = await this.send(method, url, fields);
        if (TRANSIENT_STATUS.has(response.status) && attempt < attempts - 1) {
          stopTimer();
          await response.body?.cancel();
          lastError = new NetworkError(`O SIGAA respondeu ${response.status}.`, {
            path: url.pathname
          });
          continue;
        }
        const bytes = new Uint8Array(await response.arrayBuffer().finally(stopTimer));
        return {
          status: response.status,
          url: finalUrl,
          headers: response.headers,
          body: decode(bytes, response.headers.get('content-type'))
        };
      } catch (error) {
        lastError = this.toSigaaError(error, url);
        if (!(lastError instanceof NetworkError)) throw lastError;
      }
    }
    throw lastError;
  }

  private toSigaaError(error: unknown, url: URL): SigaaError {
    if (error instanceof SigaaError) return error;
    if (isTimeout(error)) {
      return new TimeoutError(this.options.timeoutMs, { cause: error, path: url.pathname });
    }
    return new NetworkError(`Falha de rede ao acessar ${url.pathname}.`, {
      cause: error,
      path: url.pathname
    });
  }

  private async send(
    initialMethod: 'GET' | 'POST',
    initialUrl: URL,
    initialFields?: FormFields
  ): Promise<{ response: Response; url: URL; stopTimer: () => void }> {
    let method = initialMethod;
    let url = initialUrl;
    let fields = initialFields;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const headers: Record<string, string> = {
        'user-agent': this.options.userAgent,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'pt-BR,pt;q=0.9'
      };
      const cookie = this.options.jar.header(url);
      if (cookie) headers.cookie = cookie;
      let body: string | undefined;
      if (method === 'POST') {
        headers['content-type'] = 'application/x-www-form-urlencoded';
        body = encodeForm(fields ?? []);
      }
      const controller = new AbortController();
      const timer = setTimeout(() => {
        const reason = new Error('timeout');
        reason.name = 'TimeoutError';
        controller.abort(reason);
      }, this.options.timeoutMs);
      const stopTimer = () => {
        clearTimeout(timer);
      };
      const init: RequestInit = { method, headers, redirect: 'manual', signal: controller.signal };
      if (body !== undefined) init.body = body;
      let response: Response;
      try {
        response = await this.options.fetch(url, init);
      } catch (error) {
        stopTimer();
        throw error;
      }
      this.options.jar.store(url, response.headers.getSetCookie());

      const location = response.headers.get('location');
      if (!REDIRECT_STATUS.has(response.status) || !location) return { response, url, stopTimer };

      stopTimer();
      await response.body?.cancel();
      const next = new URL(location, url);
      if (next.protocol !== 'https:' && !(next.protocol === 'http:' && url.protocol === 'http:')) {
        throw new NetworkError('Redirecionamento para um protocolo inseguro foi bloqueado.', {
          path: url.pathname
        });
      }
      if (response.status !== 307 && response.status !== 308) {
        method = 'GET';
        fields = undefined;
      }
      url = next;
    }
    throw new NetworkError('Excesso de redirecionamentos.', { path: initialUrl.pathname });
  }
}
