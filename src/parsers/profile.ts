import { UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';
import { clean, fold, parseDecimal, textOf } from '../util/text.js';

/** Índice acadêmico exibido no portal (MC, IRA, ...). */
export interface AcademicIndex {
  /** Sigla, por exemplo `IRA`. */
  code: string;
  /** Nome por extenso, quando o portal informa. */
  name?: string;
  value: number;
}

/** Situação da integralização curricular (horas). */
export interface CurriculumProgress {
  requiredPendingHours?: number;
  optionalPendingHours?: number;
  complementaryPendingHours?: number;
  totalHours?: number;
  /** Percentual integralizado (0–100). */
  completionPercent?: number;
}

/** Perfil do discente, como exibido no portal. */
export interface Profile {
  name: string;
  registration: string;
  /** Curso, sem o turno final (ex.: `Engenharia Mecatrônica/DETEM - Ouro Branco - Bacharelado`). */
  program: string;
  /** Turno do curso (`M`, `T`, `N`), se informado. */
  shift?: string;
  level?: string;
  status?: string;
  institutionalEmail?: string;
  /** Período de ingresso, por exemplo `2023.1`. */
  entryPeriod?: string;
  /** Período letivo corrente exibido no portal, por exemplo `2026.2`. */
  currentPeriod?: string;
  photoUrl?: URL;
  academicIndices: AcademicIndex[];
  curriculum: CurriculumProgress;
}

const NO_PICTURE = 'no_picture';

function parseProgram(raw: string): Pick<Profile, 'program' | 'shift'> {
  const match = /^(.*?)\s+-\s+([MTN])$/.exec(raw);
  return match ? { program: clean(match[1]), shift: match[2] as string } : { program: raw };
}

/** Extrai o perfil da página inicial do portal do discente. */
export function parseProfile(page: Page): Profile {
  const $ = page.$;
  const root = $('#perfil-docente');
  const table = root.find('table').first();

  const labeled = new Map<string, string>();
  table
    .children('tbody')
    .children('tr')
    .each((_, row) => {
      const cells = $(row).children('td');
      if (cells.length === 2) {
        labeled.set(fold(textOf(cells.eq(0)).replace(/:$/, '')), textOf(cells.eq(1)));
      }
    });

  const name =
    textOf(root.find('.info-docente .nome b').first()) || textOf($('p.usuario span').first());
  const registration = labeled.get('matricula');
  const rawProgram = labeled.get('curso');
  if (!name || !registration || !rawProgram) {
    throw new UnexpectedPageError('Perfil do discente não encontrado na página inicial.', {
      path: page.url.pathname
    });
  }

  const academicIndices: AcademicIndex[] = [];
  table.find('acronym').each((_, acronym) => {
    const value = parseDecimal(textOf($(acronym).closest('td').next('td')));
    if (value === undefined) return;
    const title = clean($(acronym).attr('title'));
    academicIndices.push({
      code: textOf($(acronym)).replace(/:$/, ''),
      ...(title ? { name: title } : {}),
      value
    });
  });

  const hours = new Map<string, number>();
  table.find('table table tr').each((_, row) => {
    const cells = $(row).children('td');
    const value = parseDecimal(textOf(cells.eq(1)));
    if (cells.length === 2 && value !== undefined) hours.set(fold(textOf(cells.eq(0))), value);
  });
  const percent = /(\d+(?:[.,]\d+)?)\s*%\s*integralizado/i.exec(textOf(table));

  const photoSrc = root.find('.foto img').attr('src');
  const set = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } =>
    value === undefined ? {} : ({ [key]: value } as { [P in K]?: V });

  const curriculum: CurriculumProgress = {
    ...set('requiredPendingHours', hours.get('ch. obrigatoria pendente')),
    ...set('optionalPendingHours', hours.get('ch. optativa pendente')),
    ...set('complementaryPendingHours', hours.get('ch. complementar pendente')),
    ...set('totalHours', hours.get('ch. total curriculo')),
    ...set('completionPercent', percent?.[1] ? parseDecimal(percent[1]) : undefined)
  };

  return {
    name,
    registration,
    ...parseProgram(rawProgram),
    ...set('level', labeled.get('nivel')),
    ...set('status', labeled.get('status')),
    ...set('institutionalEmail', labeled.get('e-mail institucional')),
    ...set('entryPeriod', labeled.get('entrada')),
    ...set('currentPeriod', textOf($('#info-usuario .periodo-atual strong').first()) || undefined),
    ...(photoSrc && !photoSrc.includes(NO_PICTURE)
      ? { photoUrl: new URL(photoSrc, page.url) }
      : {}),
    academicIndices,
    curriculum
  };
}
