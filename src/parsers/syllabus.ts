import type { Page } from '../page.js';
import { UnexpectedPageError } from '../errors.js';
import { fold, parseBrDate, textOf } from '../util/text.js';

export interface SyllabusScheduleEntry {
  startDate?: Date;
  endDate?: Date;
  description: string;
}

export interface SyllabusEvaluation {
  date?: Date;
  description: string;
}

export interface SyllabusReference {
  /** Tipo do material (ex.: `Livro`). */
  type: string;
  description: string;
}

/** Plano de curso (plano de ensino) da turma. Turma sem plano retorna listas vazias. */
export interface Syllabus {
  methodology?: string;
  assessmentProcedures?: string;
  attendanceSchedule?: string;
  schedule: SyllabusScheduleEntry[];
  evaluations: SyllabusEvaluation[];
  basicReferences: SyllabusReference[];
  complementaryReferences: SyllabusReference[];
}

const empty = (): Syllabus => ({
  schedule: [],
  evaluations: [],
  basicReferences: [],
  complementaryReferences: []
});

/** Extrai o plano de curso (menu "Plano de Curso"). */
export function parseSyllabus(page: Page): Syllabus {
  const $ = page.$;
  const tables = $('table.listagem').toArray();
  if (tables.length === 0) {
    if (page.includesText('ainda não possui um plano')) return empty();
    throw new UnexpectedPageError('Plano de curso não encontrado.', { path: page.url.pathname });
  }

  const syllabus = empty();
  for (const table of tables) {
    const caption = fold(textOf($(table).find('caption').first()));
    const rows = $(table).children('tbody').children('tr').toArray();
    const cells = (row: (typeof rows)[number]) =>
      $(row)
        .children('td')
        .toArray()
        .map((cell) => textOf($(cell)));

    if (caption.startsWith('metodologia')) {
      for (const row of rows) {
        const label = fold(textOf($(row).children('th')).replace(/:$/, ''));
        const value = textOf($(row).children('td'));
        if (!value) continue;
        if (label === 'metodologia') syllabus.methodology = value;
        else if (label.startsWith('procedimentos de avaliacao'))
          syllabus.assessmentProcedures = value;
        else if (label.startsWith('horario de atendimento')) syllabus.attendanceSchedule = value;
      }
    } else if (caption.startsWith('cronograma')) {
      for (const row of rows) {
        const [start = '', end = '', description = ''] = cells(row);
        const startDate = parseBrDate(start);
        const endDate = parseBrDate(end);
        syllabus.schedule.push({
          description,
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {})
        });
      }
    } else if (caption.startsWith('avaliac')) {
      for (const row of rows) {
        const [date = '', description = ''] = cells(row);
        const parsed = parseBrDate(date);
        syllabus.evaluations.push({ description, ...(parsed ? { date: parsed } : {}) });
      }
    } else if (
      caption.startsWith('referencias basicas') ||
      caption.startsWith('referencias complementares')
    ) {
      const target = caption.startsWith('referencias basicas')
        ? syllabus.basicReferences
        : syllabus.complementaryReferences;
      for (const row of rows) {
        const [type = '', description = ''] = cells(row);
        if (description) target.push({ type, description });
      }
    }
  }
  return syllabus;
}
