interface StoredCookie {
  name: string;
  value: string;
  domain: string;
  hostOnly: boolean;
  path: string;
  secure: boolean;
  expiresAt: number | null;
}

const defaultPath = (pathname: string): string => {
  const end = pathname.lastIndexOf('/');
  return end <= 0 ? '/' : pathname.slice(0, end);
};

const domainMatches = (host: string, cookie: StoredCookie): boolean =>
  cookie.hostOnly
    ? host === cookie.domain
    : host === cookie.domain || host.endsWith(`.${cookie.domain}`);

const pathMatches = (requestPath: string, cookiePath: string): boolean =>
  requestPath === cookiePath ||
  (requestPath.startsWith(cookiePath) &&
    (cookiePath.endsWith('/') || requestPath[cookiePath.length] === '/'));

/**
 * Cookie jar mínimo (RFC 6265): escopo por domínio/caminho, `Secure`, `Max-Age`/`Expires`.
 * Mantido em memória; nunca é registrado em logs nem serializado.
 */
export class CookieJar {
  private cookies: StoredCookie[] = [];

  /** Armazena os cabeçalhos `Set-Cookie` recebidos de `url`. */
  store(url: URL, setCookieHeaders: readonly string[], now = Date.now()): void {
    for (const header of setCookieHeaders) {
      const [pair = '', ...attributes] = header.split(';');
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const cookie: StoredCookie = {
        name: pair.slice(0, eq).trim(),
        value: pair.slice(eq + 1).trim(),
        domain: url.hostname,
        hostOnly: true,
        path: defaultPath(url.pathname),
        secure: false,
        expiresAt: null
      };
      let maxAgeSeen = false;
      for (const attribute of attributes) {
        const [rawKey = '', ...rest] = attribute.split('=');
        const key = rawKey.trim().toLowerCase();
        const value = rest.join('=').trim();
        if (key === 'domain' && value) {
          const domain = value.replace(/^\./, '').toLowerCase();
          if (url.hostname === domain || url.hostname.endsWith(`.${domain}`)) {
            cookie.domain = domain;
            cookie.hostOnly = false;
          }
        } else if (key === 'path' && value.startsWith('/')) {
          cookie.path = value;
        } else if (key === 'secure') {
          cookie.secure = true;
        } else if (key === 'max-age') {
          const seconds = Number(value);
          if (Number.isFinite(seconds)) {
            cookie.expiresAt = now + seconds * 1000;
            maxAgeSeen = true;
          }
        } else if (key === 'expires' && !maxAgeSeen) {
          const time = Date.parse(value);
          if (!Number.isNaN(time)) cookie.expiresAt = time;
        }
      }
      this.cookies = this.cookies.filter(
        (c) => !(c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path)
      );
      if (cookie.expiresAt === null || cookie.expiresAt > now) this.cookies.push(cookie);
    }
  }

  /** Valor do cabeçalho `Cookie` para `url`, ou `undefined` se não houver cookies aplicáveis. */
  header(url: URL, now = Date.now()): string | undefined {
    const applicable = this.cookies
      .filter(
        (c) =>
          (c.expiresAt === null || c.expiresAt > now) &&
          (!c.secure || url.protocol === 'https:') &&
          domainMatches(url.hostname, c) &&
          pathMatches(url.pathname, c.path)
      )
      .sort((a, b) => b.path.length - a.path.length);
    return applicable.length > 0
      ? applicable.map((c) => `${c.name}=${c.value}`).join('; ')
      : undefined;
  }

  clear(): void {
    this.cookies = [];
  }
}
