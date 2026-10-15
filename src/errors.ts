/** Códigos estáveis de erro, adequados para `switch` e métricas. */
export type SigaaErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ALREADY_AUTHENTICATED'
  | 'NOT_AUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNEXPECTED_PAGE'
  | 'NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'UNSUPPORTED';

export interface SigaaErrorOptions {
  cause?: unknown;
  /** Caminho (sem query) da página envolvida. Nunca inclui cookies, credenciais ou conteúdo. */
  path?: string;
}

/** Erro base de todas as falhas da biblioteca. */
export class SigaaError extends Error {
  readonly code: SigaaErrorCode;
  readonly path: string | undefined;

  constructor(code: SigaaErrorCode, message: string, options: SigaaErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.path = options.path;
  }
}

/** Usuário ou senha rejeitados pelo SIGAA. */
export class AuthenticationError extends SigaaError {
  constructor(message = 'Usuário e/ou senha inválidos.', options?: SigaaErrorOptions) {
    super('INVALID_CREDENTIALS', message, options);
  }
}

/** A operação exige login, mas a sessão ainda não foi iniciada. */
export class NotAuthenticatedError extends SigaaError {
  constructor(message = 'Faça login antes de usar este recurso.') {
    super('NOT_AUTHENTICATED', message);
  }
}

/** O SIGAA encerrou a sessão (inatividade, logout em outro lugar). Faça login novamente. */
export class SessionExpiredError extends SigaaError {
  constructor(options?: SigaaErrorOptions) {
    super('SESSION_EXPIRED', 'A sessão do SIGAA expirou. Faça login novamente.', options);
  }
}

/** Falha de rede (DNS, conexão, TLS, resposta 5xx persistente). */
export class NetworkError extends SigaaError {
  constructor(message: string, options?: SigaaErrorOptions, code: SigaaErrorCode = 'NETWORK') {
    super(code, message, options);
  }
}

/** A requisição excedeu o tempo limite configurado. */
export class TimeoutError extends NetworkError {
  constructor(timeoutMs: number, options?: SigaaErrorOptions) {
    super(`A requisição excedeu o tempo limite de ${timeoutMs} ms.`, options, 'TIMEOUT');
  }
}

/** O HTML recebido não tem a estrutura esperada (o SIGAA pode ter mudado). */
export class UnexpectedPageError extends SigaaError {
  /** Nome da função de parsing que falhou (ex.: `parseGrades`). */
  parser: string | undefined;
  /** Esqueleto da página (tags, ids e classes, sem texto), seguro para reportar. */
  structure: string | undefined;

  constructor(message: string, options?: SigaaErrorOptions) {
    super('UNEXPECTED_PAGE', message, options);
  }
}

/** O recurso solicitado não existe ou não está disponível para esta conta. */
export class NotFoundError extends SigaaError {
  constructor(message: string, options?: SigaaErrorOptions) {
    super('NOT_FOUND', message, options);
  }
}

/** O SIGAA negou acesso ao recurso. */
export class AccessDeniedError extends SigaaError {
  constructor(message: string, options?: SigaaErrorOptions) {
    super('ACCESS_DENIED', message, options);
  }
}

/** Recurso ou perfil sem suporte nesta biblioteca. */
export class UnsupportedError extends SigaaError {
  constructor(message: string, options?: SigaaErrorOptions) {
    super('UNSUPPORTED', message, options);
  }
}
