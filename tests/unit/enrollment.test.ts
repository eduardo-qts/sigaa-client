import { describe, expect, it } from 'vitest';
import { UnexpectedPageError } from '../../src/errors.js';
import { Page, runParser } from '../../src/page.js';
import { parseEnrollment } from '../../src/parsers/enrollment.js';
import { parseGrades } from '../../src/parsers/grades.js';
import { parseSchedule } from '../../src/schedule.js';

const page = (body: string): Page =>
  new Page(new URL('https://sigaa.test/sigaa/x.jsf'), 200, `<html><body>${body}</body></html>`);

const row = (code: string, room: string, schedule: string): string => `<tr>
  <td class="codigo">${code}</td>
  <td><span class="componente">CÁLCULO</span><span class="docente">ANA</span><span class="docente">BIA</span>
  <span class="tipoComponente"><b>Tipo:</b> DISCIPLINA</span><span class="local"><b>Local:</b> ${room}</span></td>
  <td class="turma">01B</td><td class="status">MATRICULADO</td><td class="horario">${schedule} </td></tr>`;

describe('parseSchedule', () => {
  it('junta tempos seguidos e expande dias', () => {
    expect(parseSchedule('35N34 2T12')).toEqual([
      { day: 3, start: '21:00', end: '22:50' },
      { day: 5, start: '21:00', end: '22:50' },
      { day: 2, start: '13:15', end: '15:05' }
    ]);
    expect(parseSchedule('')).toEqual([]);
    expect(parseSchedule(`${'2'.repeat(100_000)}x`)).toEqual([]); // sem backtracking quadrático
  });
});

describe('parseEnrollment', () => {
  const html = `<table id="identificacao"><tr><td>Período Letivo:</td>
    <td><strong>2026.2</strong> (10/08/2026 à 19/12/2026)</td></tr></table>
    <div id="relatorio"><h4> Turmas Matriculadas: 2 </h4></div>
    <table id="matriculas"><tbody>${row('AAA1', 'SL201 BL04', '4T56')}${row('AAA2', 'A definir', '')}</tbody></table>`;

  it('lê turmas, status, sala, docentes e período', () => {
    const result = parseEnrollment(page(html));
    expect(result).toMatchObject({
      period: '2026.2',
      periodStart: '2026-08-10',
      periodEnd: '2026-12-19',
      declaredTotal: 2
    });
    expect(result.courses[0]).toEqual({
      code: 'AAA1',
      name: 'CÁLCULO',
      section: '01B',
      sectionBase: '01',
      id: '2026.2|AAA1|01B',
      status: 'MATRICULADO',
      type: 'DISCIPLINA',
      professors: ['ANA', 'BIA'],
      room: 'SL201 BL04',
      schedule: '4T56',
      slots: [{ day: 4, start: '17:05', end: '18:55' }]
    });
    expect(result.courses[1]?.room).toBeUndefined();
  });
});

describe('runParser', () => {
  it('anexa parser e esqueleto sem texto da página', () => {
    const error = (() => {
      try {
        return runParser(parseGrades, page('<div id="x" class="a b">Maria 123</div>'));
      } catch (e) {
        return e as UnexpectedPageError;
      }
    })();
    expect(error).toBeInstanceOf(UnexpectedPageError);
    expect((error as UnexpectedPageError).parser).toBe('parseGrades');
    expect((error as UnexpectedPageError).structure).toBe('body(div#x.a.b)');
  });
});
