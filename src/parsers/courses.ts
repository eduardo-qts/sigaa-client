import { UnexpectedPageError } from '../errors.js';
import { parseJsfLink, type JsfLink } from '../jsf/form.js';
import type { Page } from '../page.js';
import { fold, textOf } from '../util/text.js';

/** Dados de uma turma na listagem "Turmas Virtuais". */
export interface CourseInfo {
  /** Código do componente curricular, por exemplo `EMT0061`. */
  code: string;
  name: string;
  /** Código da turma, por exemplo `01`. */
  section: string;
  /** Período letivo, por exemplo `2026.2`. */
  period: string;
  workloadHours?: number;
  /** Horário em código SIGAA (`35N34`); vazio se não informado. */
  schedule: string;
}

export interface CourseRow {
  info: CourseInfo;
  link: JsfLink;
}

/** Chave estável de uma turma, independente dos tokens de formulário (que mudam por sessão). */
export const courseKey = (info: Pick<CourseInfo, 'code' | 'section' | 'period'>): string =>
  `${info.period}|${info.code}|${info.section}`;

const COLUMNS = {
  title: ['disciplina', 'componente curricular', 'turma virtual'],
  section: ['turma'],
  workload: ['ch total', 'ch'],
  schedule: ['horario']
} as const;

/** Extrai as linhas da tabela de turmas virtuais (`/portais/discente/turmas.jsf`). */
export function parseCourseList(page: Page): CourseRow[] {
  const $ = page.$;
  const table = $('table.listagem').first();
  if (table.length === 0) {
    if (page.includesText('Nenhuma turma') || page.includesText('não possui turmas')) return [];
    throw new UnexpectedPageError('Tabela de turmas não encontrada.', { path: page.url.pathname });
  }

  const headers = table
    .find('thead th, thead td')
    .toArray()
    .map((cell) => fold(textOf($(cell))));
  const indexOf = (labels: readonly string[]): number =>
    headers.findIndex((header) => labels.includes(header));
  const titleIndex = indexOf(COLUMNS.title);
  const sectionIndex = indexOf(COLUMNS.section);
  if (titleIndex < 0 || sectionIndex < 0) {
    throw new UnexpectedPageError('Cabeçalho da tabela de turmas não reconhecido.', {
      path: page.url.pathname
    });
  }
  const workloadIndex = indexOf(COLUMNS.workload);
  const scheduleIndex = indexOf(COLUMNS.schedule);

  const rows: CourseRow[] = [];
  let period = '';
  table.find('tr').each((_, tr) => {
    const cells = $(tr).children('td');
    const periodCell = cells.filter('.periodo');
    if (periodCell.length > 0) {
      period = textOf(periodCell.first());
      return;
    }
    // Linhas separadoras têm uma única célula (colspan) e nenhum dado de turma.
    if (cells.length <= Math.max(titleIndex, sectionIndex) || !period) return;

    const link = parseJsfLink(cells.find('a[onclick]').first().attr('onclick'));
    if (!link) {
      throw new UnexpectedPageError('Turma sem link de acesso na listagem.', {
        path: page.url.pathname
      });
    }
    const title = textOf(cells.eq(titleIndex));
    const separator = title.indexOf(' - ');
    const hours = workloadIndex >= 0 ? /\d+/.exec(textOf(cells.eq(workloadIndex)))?.[0] : undefined;
    rows.push({
      link,
      info: {
        code: separator < 0 ? title : title.slice(0, separator),
        name: separator < 0 ? title : title.slice(separator + 3),
        section: textOf(cells.eq(sectionIndex)),
        period,
        ...(hours === undefined ? {} : { workloadHours: Number(hours) }),
        schedule: scheduleIndex >= 0 ? textOf(cells.eq(scheduleIndex)) : ''
      }
    });
  });
  return rows;
}
