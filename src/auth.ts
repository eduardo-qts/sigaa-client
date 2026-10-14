import { AuthenticationError, UnexpectedPageError, UnsupportedError } from './errors.js';
import { buildFormRequest } from './jsf/form.js';
import type { Session } from './session.js';
import type { Page } from './page.js';

export const LOGIN_PATH = '/sigaa/verTelaLogin.do';
export const LOGOUT_PATH = '/sigaa/logar.do?dispatch=logOff';
export const STUDENT_PORTAL_PATH = '/sigaa/portais/discente/discente.jsf';

/**
 * Inicia a sessão: abre a tela de login (cookie de sessão), preenche `loginForm` com os
 * campos ocultos do próprio formulário e envia. Retorna a página inicial do portal.
 */
export async function login(session: Session, username: string, password: string): Promise<Page> {
  const loginPage = await session.get(LOGIN_PATH);
  const request = buildFormRequest(loginPage, 'form[name="loginForm"]', {
    'user.login': username,
    'user.senha': password
  });
  const result = await session.send(request);

  if (result.$('form[name="loginForm"]').length > 0) {
    if (result.includesText('Usuário e/ou senha inválidos')) throw new AuthenticationError();
    throw new UnexpectedPageError('Resposta inesperada após a tentativa de login.', {
      path: result.url.pathname
    });
  }
  if (!result.url.pathname.includes('/portais/discente/')) {
    throw new UnsupportedError(
      'Esta conta não abriu no portal do discente (vínculo múltiplo ou perfil não suportado).',
      { path: result.url.pathname }
    );
  }
  session.authenticated = true;
  return result;
}

/** Encerra a sessão no SIGAA. */
export async function logout(session: Session): Promise<void> {
  try {
    // Sem `session.get`: a resposta é a tela de login, que não indica sessão expirada.
    await session.http.get(LOGOUT_PATH);
  } finally {
    session.authenticated = false;
    session.http.clearCookies();
  }
}
