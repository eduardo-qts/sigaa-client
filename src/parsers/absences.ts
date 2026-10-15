import { load } from 'cheerio';
import { UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';
import { clean, fold, parseBrIso, textOf } from '../util/text.js';

/** Frequência de um dia de aula. */
export interface AbsenceDay {
  date: string;
  /** Faltas no dia; `0` quando presente. */
  absences: number;
}

/** Frequência do aluno em uma turma. */
export interface AttendanceReport {
  /** Dias com frequência registrada (dias "Não Registrada"/"Não Informada" ficam de fora). */
  days: AbsenceDay[];
  /** Soma das faltas dos dias registrados. */
  totalAbsences: number;
  presencesRecorded?: number;
  /** Aulas com registro de frequência. */
  classesWithRecord?: number;
  /** Aulas definidas pela carga horária do componente. */
  workloadClasses?: number;
  /** Frequência (%) sobre as aulas com registro. */
  attendancePercent?: number;
  /** Frequência (%) sobre a carga horária. */
  workloadAttendancePercent?: number;
}

const integerAfterColon = (text: string): number | undefined => {
  const digits = /:\s*(\d+)/.exec(text)?.[1];
  return digits === undefined ? undefined : Number(digits);
};

/** Extrai a frequência (menu "Frequência"). */
export function parseAttendance(page: Page): AttendanceReport {
  const $ = page.$;
  const table = $('table.listing').first();
  const summary = $('.botoes-show').first();
  if (table.length === 0 && summary.length === 0) {
    throw new UnexpectedPageError('Página de frequência não reconhecida.', {
      path: page.url.pathname
    });
  }

  const days: AbsenceDay[] = [];
  table.find('tbody tr').each((_, row) => {
    const cells = $(row).children('td');
    const date = parseBrIso(textOf(cells.eq(0)));
    const status = fold(textOf(cells.eq(1)));
    if (!date || !status || status.startsWith('nao ')) return;
    if (status === 'presente') days.push({ date, absences: 0 });
    else {
      const count = /(\d+)\s*falta/.exec(status)?.[1];
      if (count !== undefined) days.push({ date, absences: Number(count) });
    }
  });

  const report: AttendanceReport = {
    days,
    totalAbsences: days.reduce((sum, day) => sum + day.absences, 0)
  };
  // Cada informação do resumo está em uma "linha" separada por <br>.
  for (const line of summary.html()?.split(/<br\s*\/?>/i) ?? []) {
    const text = clean(load(line).text());
    const folded = fold(text);
    if (folded.startsWith('presencas registradas')) {
      assign(report, 'presencesRecorded', integerAfterColon(text));
    } else if (folded.startsWith('numero de aulas com registro')) {
      assign(report, 'classesWithRecord', integerAfterColon(text));
    } else if (folded.startsWith('numero de aulas definidas')) {
      assign(report, 'workloadClasses', integerAfterColon(text));
    } else if (folded.startsWith('porcentagem de frequencia em relacao as aulas')) {
      assign(report, 'attendancePercent', percentOf(text));
    } else if (folded.startsWith('porcentagem de frequencia em relacao a ch')) {
      assign(report, 'workloadAttendancePercent', percentOf(text));
    }
  }
  return report;
}

const percentOf = (text: string): number | undefined => {
  const value = /(\d+(?:[.,]\d+)?)\s*%/.exec(text)?.[1];
  return value === undefined ? undefined : Number(value.replace(',', '.'));
};

function assign<K extends keyof AttendanceReport>(
  report: AttendanceReport,
  key: K,
  value: AttendanceReport[K] | undefined
): void {
  if (value !== undefined) report[key] = value;
}
