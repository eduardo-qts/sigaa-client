import {
  COURSES,
  MENU_KEYS,
  attendanceBody,
  courseSection,
  coursesPage,
  filesBody,
  gradesPage,
  lessonsBody,
  loginInvalidPage,
  loginPage,
  membersBody,
  newsBody,
  newsDetailPage,
  noGradesPage,
  noSyllabusBody,
  portalPage,
  syllabusBody,
  teacherFormPage,
  teacherResultsPage,
  type CourseSpec
} from '../fixtures/pages.js';

export interface RecordedRequest {
  method: string;
  url: URL;
  body: URLSearchParams;
  cookie: string | undefined;
}

export interface FakeSigaaOptions {
  courses?: CourseSpec[];
  /** Códigos de turma sem notas lançadas. */
  noGrades?: string[];
  /** Códigos de turma sem plano de curso. */
  noSyllabus?: string[];
  /** Resposta de login: `student` (padrão) ou `other` (portal de outro perfil). */
  profile?: 'student' | 'other';
}

/** Decodifica `application/x-www-form-urlencoded` em ISO-8859-1 (como o SIGAA). */
function parseLatin1Form(raw: string): URLSearchParams {
  const decode = (text: string): string =>
    text
      .replace(/\+/g, ' ')
      .replace(/%([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  const params = new URLSearchParams();
  for (const pair of raw.split('&').filter(Boolean)) {
    const [key = '', ...value] = pair.split('=');
    params.append(decode(key), decode(value.join('=')));
  }
  return params;
}

const FILE_BYTES = Buffer.from('conteudo do arquivo');

const html = (body: string, init: ResponseInit = {}): Response =>
  new Response(Buffer.from(body, 'latin1'), {
    ...init,
    headers: { 'content-type': 'text/html;charset=ISO-8859-1', ...(init.headers as object) }
  });

const redirect = (location: string, status = 302, extra: Record<string, string> = {}): Response =>
  new Response(null, { status, headers: { location, ...extra } });

/** SIGAA falso (em memória) que atende ao `fetch` da biblioteca. */
export function fakeSigaa(options: FakeSigaaOptions = {}) {
  const courses = options.courses ?? COURSES;
  const requests: RecordedRequest[] = [];
  const sessions = new Set<string>();
  const state = {
    currentCourse: '',
    counter: 0,
    expireAll: false,
    failures: new Map<string, number>()
  };

  const menuLabelOf = (body: URLSearchParams): string | undefined => {
    const key = [...body.keys()].find((k) => /^formMenu:k\d$/.test(k));
    return Object.entries(MENU_KEYS).find(([, v]) => `formMenu:${v}` === key)?.[0];
  };

  const sectionBody = (label: string, code: string): string => {
    switch (label) {
      case 'Principal':
        return lessonsBody();
      case 'Frequência':
        return attendanceBody();
      case 'Participantes':
        return membersBody();
      case 'Notícias':
        return newsBody(
          code === 'AAA0001' ? [{ title: 'Aviso importante', date: '01/10/2026' }] : []
        );
      case 'Arquivos':
        return filesBody(
          code === 'AAA0001' ? [{ title: 'Lista 01', description: 'Exercícios', id: '77' }] : []
        );
      case 'Plano de Curso':
        return options.noSyllabus?.includes(code) ? noSyllabusBody() : syllabusBody();
      default:
        return '';
    }
  };

  const handler = (input: URL | string | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input);
    const method = init?.method ?? 'GET';
    const headers = new Headers(init?.headers);
    const body = parseLatin1Form(typeof init?.body === 'string' ? init.body : '');
    const cookie = headers.get('cookie') ?? undefined;
    requests.push({ method, url, body, cookie });
    return Promise.resolve(route(url, method, body, cookie));
  };

  const route = (url: URL, method: string, body: URLSearchParams, cookie?: string): Response => {
    const path = url.pathname.replace(/;jsessionid=[^/?]*/i, '');
    const key = `${method} ${path}`;
    const injected = state.failures.get(key);
    if (injected) {
      state.failures.set(key, injected - 1);
      return new Response('indisponível', { status: 503 });
    }
    const session = /JSESSIONID=([^;]+)/.exec(cookie ?? '')?.[1];
    const authed = !!session && sessions.has(session) && !state.expireAll;

    if (url.hostname === 'arquivos.example.org') {
      return new Response(FILE_BYTES, {
        headers: {
          'content-type': 'application/pdf',
          'content-length': String(FILE_BYTES.length),
          'content-disposition': 'attachment; filename="../../Lista 01.pdf"'
        }
      });
    }

    if (key === 'GET /sigaa/verTelaLogin.do') {
      const id = `sess-${++state.counter}`;
      sessions.add(id);
      return html(loginPage(), {
        headers: { 'set-cookie': `JSESSIONID=${id}; Path=/; Secure; HttpOnly` }
      });
    }
    if (key === 'POST /sigaa/logar.do') {
      if (body.get('user.login') === 'aluno' && body.get('user.senha') === 'senha-ç') {
        return redirect(
          options.profile === 'other'
            ? '/sigaa/portais/docente/docente.jsf'
            : '/sigaa/portais/discente/discente.jsf'
        );
      }
      return html(loginInvalidPage());
    }
    if (path === '/sigaa/logar.do' && url.searchParams.get('dispatch') === 'logOff') {
      if (session) sessions.delete(session);
      return redirect('/sigaa/verTelaLogin.do');
    }
    if (path.startsWith('/sigaa/public/docente/busca_docentes.jsf')) {
      return html(method === 'POST' ? teacherResultsPage() : teacherFormPage());
    }
    if (path.startsWith('/sigaa/portais/')) {
      if (!authed) return redirect('/sigaa/expirada.jsp');
      if (key === 'GET /sigaa/portais/discente/discente.jsf') return html(portalPage());
      if (key === 'GET /sigaa/portais/docente/docente.jsf') return html('<p>docente</p>');
      if (key === 'GET /sigaa/portais/discente/turmas.jsf') {
        return html(coursesPage(courses, `t${++state.counter}`));
      }
      if (key === 'POST /sigaa/portais/discente/turmas.jsf') {
        const token = body.get('frontEndIdTurma') ?? '';
        state.currentCourse = token.split('-')[1] ?? '';
        return html(courseSection(state.currentCourse, lessonsBody()));
      }
    }
    if (path.startsWith('/sigaa/ava/')) {
      if (!authed) return redirect('/sigaa/expirada.jsp');
      const code = state.currentCourse;
      if (path === '/sigaa/ava/NoticiaTurma/listar.jsf' && body.has('formNews:open')) {
        return html(newsDetailPage('Aviso importante'));
      }
      if (path === '/sigaa/ava/index.jsf' && method === 'POST') {
        if (body.has('formAva:dl')) return redirect('https://arquivos.example.org/f/x.pdf', 301);
        const label = menuLabelOf(body);
        if (label === 'Ver Notas') {
          return html(options.noGrades?.includes(code) ? noGradesPage(code) : gradesPage(code));
        }
        if (label) return html(courseSection(code, sectionBody(label, code)));
      }
    }
    return new Response('não encontrado', { status: 404 });
  };

  return {
    fetch: handler,
    requests,
    /** Simula o SIGAA encerrando todas as sessões por inatividade. */
    expireSessions: () => (state.expireAll = true),
    /** Faz as próximas `times` requisições `method path` responderem 503. */
    failNext: (method: string, path: string, times = 1) =>
      state.failures.set(`${method} ${path}`, times),
    get currentCourse() {
      return state.currentCourse;
    }
  };
}
