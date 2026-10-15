import { UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';
import { parseSchedule, sectionBase, type Slot } from '../schedule.js';
import { clean, parseBrDate, textOf, toIsoDate } from '../util/text.js';

/** Turma do atestado de matrícula. */
export interface EnrollmentCourse {
  code: string;
  name: string;
  section: string;
  /** Só os dígitos iniciais de `section` (`01A` → `01`). */
  sectionBase: string;
  /** Chave estável `período|código|turma` (mesmo formato de {@link Course.id}, sem normalização: serve para deduplicar dentro da fonte, não para casar entre fontes). */
  id: string;
  /** Situação da matrícula, como no atestado (`MATRICULADO`). */
  status: string;
  /** `DISCIPLINA`, `ATIVIDADE`, `MÓDULO`... */
  type: string;
  professors: string[];
  /** Sala/bloco; ausente quando o SIGAA informa "A definir". */
  room?: string;
  /** Horário em código SIGAA (`35N34`). */
  schedule: string;
  slots: Slot[];
}

export interface Enrollment {
  period: string;
  /** Início e fim do período letivo (`AAAA-MM-DD`). */
  periodStart?: string;
  periodEnd?: string;
  /** Total de turmas que o próprio atestado declara ("Turmas Matriculadas: N"). */
  declaredTotal: number;
  courses: EnrollmentCourse[];
}

const labeled = (text: string, label: string): string => clean(text.replace(label, ''));

/** Extrai o atestado de matrícula ("Emitir Atestado de Matrícula"). */
export function parseEnrollment(page: Page): Enrollment {
  const $ = page.$;
  const ident = textOf($('table#identificacao').first());
  const period = /(\d{4}\.\d)/.exec(ident)?.[1];
  const total = /Turmas Matriculadas:\s*(\d+)/.exec(textOf($('#relatorio h4').first()))?.[1];
  const table = $('table#matriculas').first();
  if (!period || total === undefined || table.length === 0) {
    throw new UnexpectedPageError('Atestado de matrícula não reconhecido.', {
      path: page.url.pathname
    });
  }
  const [start, end] = [...ident.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => parseBrDate(m[0]));

  const courses: EnrollmentCourse[] = [];
  table.find('tbody tr').each((_, tr) => {
    const row = $(tr);
    const code = textOf(row.find('.codigo'));
    if (!code) return;
    const section = textOf(row.find('.turma'));
    const room = labeled(textOf(row.find('.local')), 'Local:');
    const schedule = textOf(row.find('.horario'));
    courses.push({
      code,
      name: textOf(row.find('.componente')),
      section,
      sectionBase: sectionBase(section),
      id: `${period}|${code}|${section}`,
      status: textOf(row.find('.status')),
      type: labeled(textOf(row.find('.tipoComponente')), 'Tipo:'),
      professors: row
        .find('.docente')
        .toArray()
        .map((el) => textOf($(el))),
      ...(room && room !== 'A definir' ? { room } : {}),
      schedule,
      slots: parseSchedule(schedule)
    });
  });
  return {
    period,
    ...(start ? { periodStart: toIsoDate(start) } : {}),
    ...(end ? { periodEnd: toIsoDate(end) } : {}),
    declaredTotal: Number(total),
    courses
  };
}
