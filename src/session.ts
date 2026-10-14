import {
  AccessDeniedError,
  NetworkError,
  NotAuthenticatedError,
  NotFoundError,
  SessionExpiredError,
  UnexpectedPageError
} from './errors.js';
import type { FormRequest } from './jsf/form.js';
import { buildLinkRequest, parseJsfLink } from './jsf/form.js';
import type { FormFields, HttpClient, HttpResponse } from './http/http-client.js';
import { Page } from './page.js';
import { SerialQueue } from './util/queue.js';

const UNEXPECTED_MARKERS = [
  'Comportamento Inesperado',
  'O sistema comportou-se de forma inesperada'
];

/**
 * Estado de uma sessão no SIGAA: HTTP com cookies, indicador de autenticação e a fila que
 * serializa a navegação (o servidor guarda a "turma atual" por sessão).
 */
export class Session {
  authenticated = false;
  readonly queue = new SerialQueue();

  constructor(readonly http: HttpClient) {}

  /** GET de uma página HTML. */
  async get(target: string | URL): Promise<Page> {
    return this.toPage(await this.http.get(target));
  }

  /** POST de um formulário. */
  async post(action: URL, fields: FormFields): Promise<Page> {
    return this.toPage(await this.http.post(action, fields));
  }

  async send(request: FormRequest): Promise<Page> {
    return this.post(request.action, request.fields);
  }

  /** Equivale a clicar em um link JSF (`onclick="...jsfcljs(...)"`) de `page`. */
  async click(page: Page, onclick: string | undefined): Promise<Page> {
    const link = parseJsfLink(onclick);
    if (!link) {
      throw new UnexpectedPageError('Link JSF não encontrado.', { path: page.url.pathname });
    }
    return this.send(buildLinkRequest(page, link));
  }

  requireAuthentication(): void {
    if (!this.authenticated) throw new NotAuthenticatedError();
  }

  /** Converte a resposta em `Page`, traduzindo sessão expirada e erros HTTP em erros tipados. */
  toPage(response: HttpResponse): Page {
    const page = new Page(response.url, response.status, response.body);
    const path = response.url.pathname;
    if (path.includes('/expirada')) throw new SessionExpiredError({ path });
    if (response.status === 403) throw new AccessDeniedError('Acesso negado pelo SIGAA.', { path });
    if (response.status === 404) throw new NotFoundError('Página não encontrada.', { path });
    if (response.status >= 500) {
      throw new NetworkError(`O SIGAA respondeu ${response.status}.`, { path });
    }
    if (this.authenticated && page.$('form[name="loginForm"]').length > 0) {
      throw new SessionExpiredError({ path });
    }
    if (UNEXPECTED_MARKERS.some((marker) => page.includesText(marker))) {
      throw new UnexpectedPageError('O SIGAA respondeu com uma página de erro.', { path });
    }
    return page;
  }
}
