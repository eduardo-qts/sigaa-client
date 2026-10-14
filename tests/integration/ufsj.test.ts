/**
 * Testes de integração contra o SIGAA real da UFSJ. Somente leitura.
 *
 *   SIGAA_USERNAME=... SIGAA_PASSWORD=... pnpm test:integration
 *
 * Sem as variáveis, os testes que exigem login são ignorados. Rode com pouca frequência e
 * apenas com a sua própria conta. Nenhum dado é impresso.
 */
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthenticationError, SigaaClient, type Course } from '../../src/index.js';

const { SIGAA_USERNAME: username, SIGAA_PASSWORD: password, SIGAA_BASE_URL: baseUrl } = process.env;
const withLogin = username && password ? describe : describe.skip;
const options = baseUrl ? { baseUrl } : {};

describe('UFSJ (público)', () => {
  it('rejeita credenciais inválidas com AuthenticationError', async () => {
    const client = new SigaaClient(options);
    await expect(
      client.login({ username: '00000000000', password: 'invalida' })
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('busca docentes sem login', async () => {
    const client = new SigaaClient(options);
    const units = await client.teachers.listUnits();
    expect(units[0]).toEqual({ id: '0', name: '-- TODOS --' });
    const results = await client.teachers.search({ name: 'silva' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toMatch(/\S/);
  });
});

withLogin('UFSJ (autenticado, somente leitura)', () => {
  const client = new SigaaClient(options);
  let courses: Course[] = [];

  beforeAll(async () => {
    await client.login({ username: username!, password: password! });
    courses = await client.getCourses({ period: 'all' });
  });
  afterAll(() => client.logout());

  it('lê o perfil', async () => {
    const profile = await client.getProfile();
    expect(profile.name).toMatch(/\S/);
    expect(profile.registration).toMatch(/^\d+$/);
  });

  it('lista turmas', () => {
    expect(courses.length).toBeGreaterThan(0);
    expect(courses[0]?.code).toMatch(/\S/);
  });

  it('lê as seções de uma turma, com chamadas concorrentes', async () => {
    const [a, b] = courses;
    if (!a) return;
    const results = await Promise.all([
      a.getAttendance(),
      (b ?? a).getGrades(),
      a.getMembers(),
      a.getSyllabus(),
      a.getLessons(),
      a.getNews(),
      a.getFiles()
    ]);
    expect(results[0].days).toBeInstanceOf(Array);
    expect(results[1].units).toBeInstanceOf(Array);
  });

  it('baixa um arquivo (o menor da primeira turma que tiver arquivos)', async () => {
    for (const course of courses) {
      const [file] = await course.getFiles();
      if (!file) continue;
      const dir = await mkdtemp(join(tmpdir(), 'sigaa-client-int-'));
      try {
        const result = await file.download(dir);
        expect((await stat(result.path)).size).toBe(result.bytes);
        expect(result.bytes).toBeGreaterThan(0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
      return;
    }
  });
});
