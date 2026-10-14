import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';
import { clean, fold, textOf } from '../util/text.js';

/**
 * Docente da turma.
 *
 * O SIGAA também exibe o "usuário" (CPF) dos participantes; a biblioteca o descarta
 * propositalmente para não propagar dados pessoais sensíveis.
 */
export interface TeacherMember {
  name: string;
  department?: string;
  formation?: string;
  email?: string;
  /** Turmas em que leciona (ex.: `['01A', '01B']`). */
  sections: string[];
  photoUrl?: URL;
}

/** Colega de turma (mesma observação de privacidade de {@link TeacherMember}). */
export interface StudentMember {
  name: string;
  registration?: string;
  program?: string;
  email?: string;
  section?: string;
  photoUrl?: URL;
}

export interface MemberList {
  teachers: TeacherMember[];
  students: StudentMember[];
}

const NO_PICTURE = 'no_picture';
const FIELD = /([^<>:]+):\s*<em>([\s\S]*?)<\/em>/g;

function fieldsOf(cell: Cheerio<AnyNode>): Map<string, string> {
  const fields = new Map<string, string>();
  for (const match of (cell.html() ?? '').matchAll(FIELD)) {
    fields.set(fold(clean(match[1])), clean(match[2]?.replace(/<[^>]*>/g, '')));
  }
  return fields;
}

const optional = <K extends string>(key: K, value: string | undefined) =>
  value ? ({ [key]: value } as { [P in K]: string }) : ({} as { [P in K]?: string });

/** Extrai docentes e discentes da turma (menu "Participantes"). */
export function parseMembers(page: Page): MemberList {
  const $ = page.$;
  const legends = $('fieldset > legend')
    .toArray()
    .map((el) => fold(textOf($(el))));
  const tables = $('table.participantes').toArray();
  if (tables.length === 0 && legends.length === 0) {
    throw new UnexpectedPageError('Página de participantes não reconhecida.', {
      path: page.url.pathname
    });
  }

  const result: MemberList = { teachers: [], students: [] };
  tables.forEach((table, index) => {
    const legend = legends[index] ?? '';
    const isTeacher = /^(docentes?|professores)/.test(legend);
    const isStudent = /^(discentes?|alunos)/.test(legend);
    if (!isTeacher && !isStudent) return;

    $(table)
      .find('td[valign]')
      .each((_, cell) => {
        const cellEl = $(cell);
        const nameEl = cellEl.find('strong').first().clone();
        nameEl.find('a.naoImprimir, img, script').remove();
        const name = textOf(nameEl);
        if (!name) return;
        const fields = fieldsOf(cellEl);
        const src = cellEl.prevAll('td').first().find('img').attr('src');
        const photo = src && !src.includes(NO_PICTURE) ? { photoUrl: new URL(src, page.url) } : {};
        const email = fields.get('e-mail');
        if (isTeacher) {
          result.teachers.push({
            name,
            ...optional('department', fields.get('departamento')),
            ...optional('formation', fields.get('formacao')),
            ...optional('email', email),
            sections: (fields.get('turma(s)') ?? '').split(' ').filter(Boolean),
            ...photo
          });
        } else {
          result.students.push({
            name,
            ...optional('registration', fields.get('matricula')),
            ...optional('program', fields.get('curso')),
            ...optional('email', email),
            ...optional('section', fields.get('turma')),
            ...photo
          });
        }
      });
  });
  return result;
}
