import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  NotAuthenticatedError,
  SessionExpiredError,
  SigaaClient,
  UnsupportedError
} from '../../src/index.js';
import { fakeSigaa, type FakeSigaaOptions } from '../helpers/fake-sigaa.js';

async function loggedIn(options: FakeSigaaOptions = {}) {
  const server = fakeSigaa(options);
  const client = new SigaaClient({ fetch: server.fetch, retryDelayMs: 1 });
  await client.login({ username: 'aluno', password: 'senha-ç' });
  return { server, client };
}

describe('login e logout', () => {
  it('autentica enviando os campos ocultos do formulário e a senha em ISO-8859-1', async () => {
    const { server, client } = await loggedIn();
    expect(client.isAuthenticated).toBe(true);
    const post = server.requests.find((r) => r.method === 'POST')!;
    expect(post.body.get('urlRedirect')).toBe('');
    expect(post.body.get('user.senha')).toBe('senha-ç');
    expect(post.cookie).toMatch(/^JSESSIONID=sess-/);
  });

  it('rejeita credenciais inválidas com AuthenticationError', async () => {
    const client = new SigaaClient({ fetch: fakeSigaa().fetch });
    await expect(client.login({ username: 'aluno', password: 'errada' })).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(client.isAuthenticated).toBe(false);
  });

  it('exige usuário e senha preenchidos sem ir à rede', async () => {
    const server = fakeSigaa();
    const client = new SigaaClient({ fetch: server.fetch });
    await expect(client.login({ username: '', password: 'x' })).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(server.requests).toHaveLength(0);
  });

  it('recusa perfis que não abrem no portal do discente', async () => {
    const client = new SigaaClient({ fetch: fakeSigaa({ profile: 'other' }).fetch });
    await expect(client.login({ username: 'aluno', password: 'senha-ç' })).rejects.toBeInstanceOf(
      UnsupportedError
    );
  });

  it('logout encerra a sessão e descarta cookies', async () => {
    const { server, client } = await loggedIn();
    await client.logout();
    expect(client.isAuthenticated).toBe(false);
    await expect(client.getProfile()).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(server.requests.some((r) => r.url.searchParams.get('dispatch') === 'logOff')).toBe(true);
  });

  it('recursos autenticados exigem login', async () => {
    const client = new SigaaClient({ fetch: fakeSigaa().fetch });
    await expect(client.getProfile()).rejects.toBeInstanceOf(NotAuthenticatedError);
    await expect(client.getCourses()).rejects.toBeInstanceOf(NotAuthenticatedError);
  });
});

describe('sessão expirada', () => {
  it('é reportada como SessionExpiredError', async () => {
    const { server, client } = await loggedIn();
    server.expireSessions();
    await expect(client.getProfile()).rejects.toBeInstanceOf(SessionExpiredError);
    await expect(client.getCourses()).rejects.toBeInstanceOf(SessionExpiredError);
  });
});

describe('perfil e turmas', () => {
  it('lê o perfil', async () => {
    const { client } = await loggedIn();
    expect((await client.getProfile()).registration).toBe('2020000001');
  });

  it('lista por padrão só o período mais recente', async () => {
    const { client } = await loggedIn();
    const courses = await client.getCourses();
    expect(courses.map((c) => c.code)).toEqual(['AAA0001', 'AAA0002']);
    expect(courses[0]).toMatchObject({ period: '2026.2', section: '01', workloadHours: 60 });
  });

  it('filtra por período e aceita "all"', async () => {
    const { client } = await loggedIn();
    expect((await client.getCourses({ period: '2025.1' })).map((c) => c.code)).toEqual(['AAA0003']);
    expect(await client.getCourses({ period: '2020.1' })).toEqual([]);
    expect(await client.getCourses({ period: 'all' })).toHaveLength(3);
  });
});

describe('seções da turma', () => {
  it('lê frequência, notas, participantes, plano e aulas', async () => {
    const { client } = await loggedIn();
    const [course] = await client.getCourses();
    expect((await course!.getAttendance()).totalAbsences).toBe(3);
    expect((await course!.getGrades()).finalGrade).toBe(3.5);
    expect((await course!.getMembers()).students).toHaveLength(2);
    expect((await course!.getSyllabus()).schedule).toHaveLength(2);
    expect(await course!.getLessons()).toHaveLength(2);
  });

  it('trata turma sem notas e sem plano', async () => {
    const { client } = await loggedIn({ noGrades: ['AAA0001'], noSyllabus: ['AAA0001'] });
    const [course] = await client.getCourses();
    expect(await course!.getGrades()).toEqual({ units: [] });
    expect((await course!.getSyllabus()).schedule).toEqual([]);
  });

  it('reaproveita a página da turma: uma requisição por seção na mesma turma', async () => {
    const { server, client } = await loggedIn();
    const [course] = await client.getCourses();
    await course!.getAttendance();
    const before = server.requests.length;
    await course!.getMembers();
    await course!.getGrades();
    expect(server.requests.length - before).toBe(2);
  });

  it('serializa chamadas concorrentes em turmas diferentes (turma atual é estado do servidor)', async () => {
    const { client } = await loggedIn();
    const [first, second] = await client.getCourses();
    const [a, b, c, d] = await Promise.all([
      first!.getNews(),
      second!.getNews(),
      first!.getFiles(),
      second!.getFiles()
    ]);
    expect(a.map((n) => n.title)).toEqual(['Aviso importante']);
    expect(b).toEqual([]);
    expect(c.map((f) => f.title)).toEqual(['Lista 01']);
    expect(d).toEqual([]);
  });

  it('abre o conteúdo de uma notícia', async () => {
    const { client } = await loggedIn();
    const [course] = await client.getCourses();
    const [news] = await course!.getNews();
    expect(news?.date).toEqual(new Date(2026, 9, 1));
    const content = await news!.read();
    expect(content.text).toContain('Primeiro parágrafo.');
    // a navegação continua válida depois de abrir uma notícia
    expect((await course!.getAttendance()).presencesRecorded).toBe(25);
  });

  it('recupera-se quando o token da listagem muda entre sessões de navegação', async () => {
    const { client } = await loggedIn();
    const [first, second] = await client.getCourses();
    await first!.getAttendance();
    await second!.getAttendance();
    expect((await first!.getGrades()).units).toHaveLength(1);
  });
});

describe('download de arquivos', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sigaa-client-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('baixa seguindo o redirecionamento ao servidor de arquivos, sem vazar o cookie', async () => {
    const { server, client } = await loggedIn();
    const [course] = await client.getCourses();
    const [file] = await course!.getFiles();
    const result = await file!.download(dir);
    expect(result.filename).toBe('Lista 01.pdf');
    expect(result.path).toBe(join(dir, 'Lista 01.pdf'));
    expect(await readFile(result.path, 'utf8')).toBe('conteudo do arquivo');
    const fileServer = server.requests.filter((r) => r.url.hostname === 'arquivos.example.org');
    expect(fileServer).toHaveLength(1);
    expect(fileServer[0]?.cookie).toBeUndefined();
  });
});

describe('resiliência', () => {
  it('refaz GET em falha transitória (503)', async () => {
    const { server, client } = await loggedIn();
    server.failNext('GET', '/sigaa/portais/discente/discente.jsf', 2);
    expect((await client.getProfile()).name).toContain('MARIA');
  });

  it('não refaz POST em falha transitória', async () => {
    const { server, client } = await loggedIn();
    const [course] = await client.getCourses();
    server.failNext('POST', '/sigaa/portais/discente/turmas.jsf', 1);
    await expect(course!.getAttendance()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

describe('busca pública de docentes', () => {
  it('funciona sem login', async () => {
    const client = new SigaaClient({ fetch: fakeSigaa().fetch });
    expect((await client.teachers.listUnits())[1]).toEqual({
      id: '10',
      name: 'DEPARTAMENTO A - Cidade'
    });
    const results = await client.teachers.search({ name: 'docente' });
    expect(results.map((r) => r.name)).toEqual(['DOCENTE UM', 'DOCENTE DOIS']);
  });

  it('envia nome, unidade e o botão Buscar', async () => {
    const server = fakeSigaa();
    await new SigaaClient({ fetch: server.fetch }).teachers.search({ name: 'ana', unitId: '10' });
    const post = server.requests.find((r) => r.method === 'POST')!;
    expect(Object.fromEntries(post.body)).toMatchObject({
      'form:nome': 'ana',
      'form:departamento': '10',
      'form:buscar': 'Buscar'
    });
  });
});
