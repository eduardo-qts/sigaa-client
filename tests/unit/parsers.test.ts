import { describe, expect, it } from 'vitest';
import { Page } from '../../src/page.js';
import { parseAttendance } from '../../src/parsers/absences.js';
import { parseCourseList } from '../../src/parsers/courses.js';
import { parseFileList } from '../../src/parsers/files.js';
import { parseGrades } from '../../src/parsers/grades.js';
import { parseLessons } from '../../src/parsers/lessons.js';
import { parseMembers } from '../../src/parsers/members.js';
import { parseNewsContent, parseNewsList } from '../../src/parsers/news.js';
import { parseProfile } from '../../src/parsers/profile.js';
import { parseSyllabus } from '../../src/parsers/syllabus.js';
import { parseTeacherResults, parseTeacherUnits } from '../../src/parsers/teachers.js';
import * as pages from '../fixtures/pages.js';

const page = (html: string) =>
  new Page(new URL('https://sig.example.org/sigaa/ava/index.jsf'), 200, html);
const section = (body: string) => page(pages.courseSection('AAA0001', body));

describe('parseProfile', () => {
  it('extrai perfil, índices e integralização', () => {
    const profile = parseProfile(page(pages.portalPage()));
    expect(profile).toMatchObject({
      name: 'MARIA EXEMPLO DA SILVA',
      registration: '2020000001',
      program: 'Engenharia Exemplo/DEPTO - Campus - Bacharelado',
      shift: 'N',
      level: 'GRADUAÇÃO',
      status: 'ATIVO',
      institutionalEmail: 'maria@example.org',
      entryPeriod: '2020.1',
      currentPeriod: '2026.2'
    });
    expect(profile.academicIndices).toEqual([
      { code: 'MC', name: 'Média de Conclusão', value: 7.5 },
      { code: 'IRA', name: 'Índice de Rendimento Acadêmico', value: 7.25 }
    ]);
    expect(profile.curriculum).toEqual({
      requiredPendingHours: 1000,
      optionalPendingHours: 200,
      complementaryPendingHours: 80,
      totalHours: 3600,
      completionPercent: 48
    });
    expect(profile.photoUrl?.href).toBe('https://arquivos.example.org/foto.jpg');
  });

  it('falha de forma tipada em página sem perfil', () => {
    expect(() => parseProfile(page('<p>nada</p>'))).toThrow(
      expect.objectContaining({ code: 'UNEXPECTED_PAGE' }) as Error
    );
  });
});

describe('parseCourseList', () => {
  it('lê turmas por período, ignora linha separadora e usa o cabeçalho <th>', () => {
    const rows = parseCourseList(page(pages.coursesPage()));
    expect(rows.map((r) => r.info)).toEqual([
      {
        code: 'AAA0001',
        name: 'ALGORITMOS - PARTE I',
        section: '01',
        period: '2026.2',
        workloadHours: 60,
        schedule: '35N34'
      },
      {
        code: 'AAA0002',
        name: 'CIRCUITOS',
        section: '01',
        period: '2026.2',
        workloadHours: 90,
        schedule: ''
      },
      {
        code: 'AAA0003',
        name: 'CÁLCULO',
        section: '01',
        period: '2025.1',
        workloadHours: 60,
        schedule: '24M12'
      }
    ]);
    expect(rows[0]?.link.params.frontEndIdTurma).toBe('T-AAA0001');
  });

  it('rejeita tabela com cabeçalho desconhecido ou sem tabela', () => {
    expect(() =>
      parseCourseList(page('<table class="listagem"><thead><tr><th>X</th></tr></thead></table>'))
    ).toThrow('Cabeçalho');
    expect(() => parseCourseList(page('<p/>'))).toThrow('Tabela de turmas');
  });
});

describe('parseGrades', () => {
  it('lê unidades, avaliações, método e colunas finais', () => {
    const report = parseGrades(page(pages.gradesPage('AAA0001')));
    expect(report).toEqual({
      units: [
        {
          name: 'Unid. 1',
          method: 'sum',
          assessments: [
            { code: 'P1', name: 'Primeira prova', maxValue: 5, weight: 1, value: 3.5 },
            { code: 'TR', name: 'Trabalho', maxValue: 5, weight: 1 }
          ],
          value: 3.5
        }
      ],
      finalGrade: 3.5,
      absences: 4,
      situation: 'REP'
    });
  });

  it('turma sem notas lançadas retorna relatório vazio', () => {
    expect(parseGrades(page(pages.noGradesPage('AAA0001')))).toEqual({ units: [] });
  });

  it('página desconhecida falha de forma tipada', () => {
    expect(() => parseGrades(page('<p/>'))).toThrow('Tabela de notas');
  });
});

describe('parseAttendance', () => {
  it('ignora dias sem registro, soma faltas e lê o resumo', () => {
    const report = parseAttendance(section(pages.attendanceBody()));
    expect(report.days.map((d) => d.absences)).toEqual([2, 0, 1]);
    expect(report).toMatchObject({
      totalAbsences: 3,
      presencesRecorded: 25,
      classesWithRecord: 33,
      workloadClasses: 65,
      attendancePercent: 75,
      workloadAttendancePercent: 38
    });
  });

  it('falha de forma tipada sem tabela nem resumo', () => {
    expect(() => parseAttendance(page('<p/>'))).toThrow('frequência');
  });
});

describe('parseMembers', () => {
  it('lê docentes e discentes, e descarta o "usuário" (CPF)', () => {
    const members = parseMembers(section(pages.membersBody()));
    expect(members.teachers).toEqual([
      {
        name: 'PROFESSOR EXEMPLO',
        department: 'DEPARTAMENTO X',
        formation: 'DOUTORADO',
        email: 'prof@example.org',
        sections: ['01A', '01B'],
        photoUrl: new URL('https://arquivos.example.org/prof.jpg')
      }
    ]);
    expect(members.students).toEqual([
      {
        name: 'ALUNO UM',
        registration: '2020000002',
        program: 'Curso X',
        email: 'um@example.org',
        section: '01B'
      },
      {
        name: 'ALUNO DOIS',
        registration: '2020000003',
        program: 'Curso X',
        email: 'dois@example.org',
        section: '01A'
      }
    ]);
    expect(JSON.stringify(members)).not.toContain('00000000000');
  });
});

describe('parseNews', () => {
  it('lê a listagem e trata turma sem notícias', () => {
    const rows = parseNewsList(section(pages.newsBody([{ title: 'Aviso', date: '01/10/2026' }])));
    expect(rows.map((r) => r.summary)).toEqual([{ title: 'Aviso', date: new Date(2026, 9, 1) }]);
    expect(parseNewsList(section(pages.newsBody([])))).toEqual([]);
  });

  it('lê o conteúdo completo da notícia', () => {
    const content = parseNewsContent(page(pages.newsDetailPage('Aviso importante')));
    expect(content.title).toBe('Aviso importante');
    expect(content.publishedAt).toEqual(new Date(2026, 9, 1, 8, 17));
    expect(content.text).toBe('Primeiro parágrafo.\nSegundo parágrafo.\nLinha nova.');
    expect(content.html).toContain('<p>Primeiro parágrafo.</p>');
  });
});

describe('parseFileList', () => {
  it('lê arquivos e trata turma sem arquivos', () => {
    const rows = parseFileList(
      section(pages.filesBody([{ title: 'Lista 01', description: 'Exercícios', id: '77' }]))
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.summary).toEqual({
      title: 'Lista 01',
      description: 'Exercícios',
      lessonTopic: 'Introdução ao curso'
    });
    expect(rows[0]?.link.params.id).toBe('77');
    expect(parseFileList(section(pages.filesBody([])))).toEqual([]);
  });

  it('página que não é de turma falha de forma tipada', () => {
    expect(() => parseFileList(page('<p/>'))).toThrow('Tabela de arquivos');
  });
});

describe('parseLessons', () => {
  it('lê título, período, conteúdo e itens', () => {
    const lessons = parseLessons(section(pages.lessonsBody()));
    expect(lessons).toEqual([
      {
        title: 'Introdução ao curso',
        startDate: new Date(2026, 7, 10),
        endDate: new Date(2026, 7, 10),
        content: 'Leitura inicial recomendada.',
        items: [{ title: 'Lista 01', description: 'Exercícios' }]
      },
      { title: 'Não haverá aula', startDate: new Date(2026, 7, 12), content: '', items: [] }
    ]);
  });
});

describe('parseSyllabus', () => {
  it('lê metodologia, cronograma, avaliações e referências', () => {
    const syllabus = parseSyllabus(section(pages.syllabusBody()));
    expect(syllabus).toEqual({
      methodology: 'Aulas expositivas.',
      assessmentProcedures: 'Duas provas.',
      attendanceSchedule: 'Quartas, 14h.',
      schedule: [
        {
          description: 'Apresentação',
          startDate: new Date(2025, 2, 25),
          endDate: new Date(2025, 2, 25)
        },
        { description: 'Revisão', startDate: new Date(2025, 2, 27) }
      ],
      evaluations: [{ description: '1ª Avaliação', date: new Date(2025, 6, 15) }],
      basicReferences: [],
      complementaryReferences: [{ type: 'Livro', description: 'AUTOR, Fulano. Título do livro.' }]
    });
  });

  it('turma sem plano retorna estrutura vazia', () => {
    expect(parseSyllabus(section(pages.noSyllabusBody()))).toEqual({
      schedule: [],
      evaluations: [],
      basicReferences: [],
      complementaryReferences: []
    });
  });
});

describe('parseTeachers', () => {
  it('lê unidades e resultados', () => {
    expect(parseTeacherUnits(page(pages.teacherFormPage()))).toEqual([
      { id: '0', name: '-- TODOS --' },
      { id: '10', name: 'DEPARTAMENTO A - Cidade' }
    ]);
    const results = parseTeacherResults(page(pages.teacherResultsPage()));
    expect(results).toEqual([
      {
        name: 'DOCENTE UM',
        department: 'DEPARTAMENTO A',
        photoUrl: new URL('https://arquivos.example.org/a.jpg'),
        profileUrl: new URL('https://sig.example.org/sigaa/public/docente/portal.jsf?siape=1')
      },
      { name: 'DOCENTE DOIS', department: 'DEPARTAMENTO B' }
    ]);
  });
});
