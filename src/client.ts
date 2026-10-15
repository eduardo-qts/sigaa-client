import { login, logout, STUDENT_PORTAL_PATH } from './auth.js';
import { Course } from './course/course.js';
import { loadDetails, type DetailedCourses } from './course/details.js';
import { CourseNavigator } from './course/navigator.js';
import { AuthenticationError, UnexpectedPageError } from './errors.js';
import { CookieJar } from './http/cookie-jar.js';
import { defaultUserAgent, HttpClient } from './http/http-client.js';
import { buildFormRequest } from './jsf/form.js';
import { runParser } from './page.js';
import { parseEnrollment, type Enrollment } from './parsers/enrollment.js';
import { parseProfile, type Profile } from './parsers/profile.js';
import { Session } from './session.js';
import { TeacherDirectory } from './teachers.js';

export const DEFAULT_BASE_URL = 'https://sig.ufsj.edu.br';

export interface SigaaClientOptions {
  /** URL base do SIGAA. Padrão: `https://sig.ufsj.edu.br`. */
  baseUrl?: string | URL;
  /** Tempo limite de cada requisição, em ms. Padrão: 30000. */
  timeoutMs?: number;
  /** Tentativas extras para GET em falhas transitórias (rede, 502/503/504). Padrão: 2. */
  retries?: number;
  /** Espera base entre tentativas, em ms (dobra a cada tentativa). Padrão: 300. */
  retryDelayMs?: number;
  /** Valor do cabeçalho `User-Agent`. */
  userAgent?: string;
  /** Implementação de `fetch` (testes, proxies). Padrão: `fetch` global. */
  fetch?: typeof globalThis.fetch;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface GetCoursesOptions {
  /**
   * Período letivo (`'2026.1'`) ou `'all'` para todos. Padrão: o período mais recente
   * entre as turmas do aluno.
   */
  period?: string;
  /**
   * Lê também todas as seções de cada turma e devolve `{ courses, failures }`: uma seção
   * que falha não derruba as demais. Faz várias requisições por turma.
   */
  withDetails?: boolean;
}

/** Cliente do SIGAA da UFSJ. Uma instância representa uma sessão. */
export class SigaaClient {
  /** Busca pública de docentes (não exige login). */
  readonly teachers: TeacherDirectory;

  private readonly session: Session;
  private readonly navigator: CourseNavigator;

  constructor(options: SigaaClientOptions = {}) {
    const http = new HttpClient({
      baseUrl: new URL(options.baseUrl ?? DEFAULT_BASE_URL),
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      jar: new CookieJar(),
      timeoutMs: options.timeoutMs ?? 30_000,
      retries: options.retries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 300,
      userAgent: options.userAgent ?? defaultUserAgent
    });
    this.session = new Session(http);
    this.navigator = new CourseNavigator(this.session);
    this.teachers = new TeacherDirectory(this.session);
  }

  get isAuthenticated(): boolean {
    return this.session.authenticated;
  }

  /** Inicia a sessão. Lança `AuthenticationError` se as credenciais forem recusadas. */
  async login({ username, password }: Credentials): Promise<void> {
    if (!username || !password) throw new AuthenticationError('Informe usuário e senha.');
    await this.session.queue.run(() => login(this.session, username, password));
  }

  /** Encerra a sessão no SIGAA e descarta os cookies locais. */
  async logout(): Promise<void> {
    this.navigator.invalidate();
    await this.session.queue.run(() => logout(this.session));
  }

  /** Perfil do discente (nome, curso, matrícula, índices acadêmicos). */
  async getProfile(): Promise<Profile> {
    this.session.requireAuthentication();
    return this.session.queue.run(async () => {
      this.navigator.invalidate();
      return runParser(parseProfile, await this.session.get(STUDENT_PORTAL_PATH));
    });
  }

  /** Atestado de matrícula do período corrente: todas as turmas, com status, sala, docentes e horários. */
  async getEnrollment(): Promise<Enrollment> {
    this.session.requireAuthentication();
    return this.session.queue.run(async () => {
      this.navigator.invalidate();
      const home = await this.session.get(STUDENT_PORTAL_PATH);
      // O menu do portal é JSCook: o item é um valor de `jscook_action`, não um link.
      const action =
        /menu_form_menu_discente[^'"]*?:A\]#\{\s*portalDiscente\.atestadoMatricula\s*\}/.exec(
          home.html
        )?.[0];
      if (!action) {
        throw new UnexpectedPageError('Item "Atestado de Matrícula" não encontrado no menu.', {
          path: home.url.pathname
        });
      }
      const request = buildFormRequest(home, 'form[id="menu:form_menu_discente"]', {
        jscook_action: action
      });
      return runParser(parseEnrollment, await this.session.send(request));
    });
  }

  /** Turmas do aluno. Por padrão, as do período mais recente. */
  async getCourses(options: GetCoursesOptions & { withDetails: true }): Promise<DetailedCourses>;
  async getCourses(options?: GetCoursesOptions): Promise<Course[]>;
  async getCourses({ period, withDetails }: GetCoursesOptions = {}): Promise<
    Course[] | DetailedCourses
  > {
    const rows = await this.navigator.list();
    const wanted =
      period ?? rows.map((row) => row.info.period).reduce((a, b) => (b > a ? b : a), '');
    const courses = rows
      .filter((row) => period === 'all' || row.info.period === wanted)
      .map((row) => new Course(row.info, this.session, this.navigator));
    return withDetails ? loadDetails(courses) : courses;
  }
}
