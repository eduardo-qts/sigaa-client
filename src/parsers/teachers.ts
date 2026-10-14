import { UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';
import { textOf } from '../util/text.js';

/** Unidade (departamento, centro) usada como filtro na busca de docentes. */
export interface TeacherUnit {
  id: string;
  name: string;
}

/** Docente encontrado na busca pública. */
export interface TeacherResult {
  name: string;
  department: string;
  photoUrl?: URL;
  /** Página pública do docente no SIGAA. */
  profileUrl?: URL;
}

const NO_PICTURE = 'no_picture';

/** Extrai as unidades do formulário de busca. */
export function parseTeacherUnits(page: Page): TeacherUnit[] {
  const options = page.$('form[name="form"] select option').toArray();
  if (options.length === 0) {
    throw new UnexpectedPageError('Formulário de busca de docentes não reconhecido.', {
      path: page.url.pathname
    });
  }
  return options.map((option) => ({
    id: page.$(option).attr('value') ?? '',
    name: textOf(page.$(option))
  }));
}

/** Extrai os docentes do resultado da busca. */
export function parseTeacherResults(page: Page): TeacherResult[] {
  const $ = page.$;
  if ($('table.listagem').length === 0) {
    if (page.includesText('Nenhum docente') || page.includesText('Nenhum registro')) return [];
    throw new UnexpectedPageError('Resultado da busca de docentes não reconhecido.', {
      path: page.url.pathname
    });
  }
  return $('table.listagem tr.topo')
    .toArray()
    .map((row): TeacherResult => {
      const photo = $(row).find('td.foto img').attr('src');
      const profile = $(row).find('.pagina a').attr('href');
      return {
        name: textOf($(row).find('.nome').first()),
        department: textOf($(row).find('.departamento').first()),
        ...(photo && !photo.includes(NO_PICTURE) ? { photoUrl: new URL(photo, page.url) } : {}),
        ...(profile ? { profileUrl: new URL(profile, page.url) } : {})
      };
    });
}
