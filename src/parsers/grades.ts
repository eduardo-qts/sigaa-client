import { UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';
import { clean, fold, parseDecimal, textOf } from '../util/text.js';

/** Como o total da unidade é calculado a partir das avaliações. */
export type UnitMethod = 'sum' | 'weighted-average' | 'arithmetic-average' | 'unknown';

export interface Assessment {
  /** Sigla da avaliação (ex.: `1AT`). */
  code: string;
  name?: string;
  maxValue?: number;
  weight?: number;
  /** Nota obtida; `undefined` se ainda não lançada. */
  value?: number;
}

export interface GradeUnit {
  /** Nome da unidade (ex.: `Unid. 1`). */
  name: string;
  method: UnitMethod;
  assessments: Assessment[];
  /** Nota da unidade; `undefined` se ainda não calculada. */
  value?: number;
}

/** Notas do aluno em uma turma. */
export interface GradeReport {
  units: GradeUnit[];
  /** Nota da prova de reposição. */
  makeUp?: number;
  /** Resultado final. */
  finalGrade?: number;
  absences?: number;
  /** Situação, código cru do SIGAA (ex.: `APR`, `REP`, `MATR`). */
  situation?: string;
  /** `situation` normalizada. `REP` não distingue nota de falta no SIGAA. */
  status?: GradeStatus;
}

export type GradeStatus = 'APROVADO' | 'REPROVADO' | 'MATRICULADO' | 'OUTRO';

const STATUS: Record<string, GradeStatus> = {
  APR: 'APROVADO',
  REP: 'REPROVADO',
  MATR: 'MATRICULADO'
};

const METHODS: Record<string, UnitMethod> = {
  S: 'sum',
  P: 'weighted-average',
  A: 'arithmetic-average'
};

/** Extrai o relatório de notas ("Ver Notas"). Turma sem notas lançadas gera relatório vazio. */
export function parseGrades(page: Page): GradeReport {
  const $ = page.$;
  const table = $('table.tabelaRelatorio').first();
  if (table.length === 0) {
    if (page.includesText('Ainda não foram lançadas notas')) return { units: [] };
    throw new UnexpectedPageError('Tabela de notas não encontrada.', { path: page.url.pathname });
  }

  const headerRows = table.find('thead tr');
  const groupHeaders = headerRows.first().children('th').toArray();
  const detailHeaders = table.find('tr#trAval').first().children('th').toArray();
  const dataRow = table.find('tbody tr').first();
  const cells = dataRow.children('td').toArray();
  if (detailHeaders.length === 0 || cells.length === 0) {
    throw new UnexpectedPageError('Estrutura da tabela de notas não reconhecida.', {
      path: page.url.pathname
    });
  }

  // Rótulo do primeiro cabeçalho que cobre cada coluna (colspan expandido).
  const columnGroup: string[] = [];
  for (const th of groupHeaders) {
    const span = Number($(th).attr('colspan') ?? 1);
    for (let i = 0; i < span; i++) columnGroup.push(textOf($(th)));
  }

  const hidden = (prefix: string, id: string): string | undefined => {
    const value = $(`[id="${prefix}${id}"]`).attr('value');
    return value === undefined ? undefined : clean(value);
  };

  const units: GradeUnit[] = [];
  const report: GradeReport = { units };
  let unitNumber = 0;
  let pending: Assessment[] = [];
  const valueAt = (index: number): number | undefined => parseDecimal(textOf($(cells[index])));

  detailHeaders.forEach((th, index) => {
    const id = $(th).attr('id') ?? '';
    if (id.startsWith('aval_')) {
      const key = id.slice('aval_'.length);
      const name = hidden('denAval_', key);
      const maxValue = parseDecimal(hidden('notaAval_', key) ?? '');
      const weight = parseDecimal(hidden('pesoAval_', key) ?? '');
      const value = valueAt(index);
      pending.push({
        code: textOf($(th)),
        ...(name ? { name } : {}),
        ...(maxValue === undefined ? {} : { maxValue }),
        ...(weight === undefined ? {} : { weight }),
        ...(value === undefined ? {} : { value })
      });
    } else if (id === 'unid') {
      unitNumber += 1;
      const total = valueAt(index);
      units.push({
        name: columnGroup[index] || `Unid. ${unitNumber}`,
        method: METHODS[hidden('tipoUnid', String(unitNumber)) ?? ''] ?? 'unknown',
        assessments: pending,
        ...(total === undefined ? {} : { value: total })
      });
      pending = [];
    } else {
      const label = fold(columnGroup[index] ?? '');
      const value = valueAt(index);
      if (label.startsWith('reposicao') && value !== undefined) report.makeUp = value;
      else if (label === 'resultado' && value !== undefined) report.finalGrade = value;
      else if (label === 'faltas' && value !== undefined) report.absences = value;
      else if (label.startsWith('sit')) {
        const situation = textOf($(cells[index]));
        if (situation) {
          report.situation = situation;
          report.status = STATUS[situation] ?? 'OUTRO';
        }
      }
    }
  });
  return report;
}
