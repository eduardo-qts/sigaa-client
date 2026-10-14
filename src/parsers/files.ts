import { UnexpectedPageError } from '../errors.js';
import { parseJsfLink, type JsfLink } from '../jsf/form.js';
import type { Page } from '../page.js';
import { fold, textOf } from '../util/text.js';

/** Arquivo disponibilizado na turma, como aparece na listagem. */
export interface FileSummary {
  title: string;
  description: string;
  /** Tópico de aula ao qual o arquivo está associado, se houver. */
  lessonTopic: string;
}

export interface FileRow {
  summary: FileSummary;
  link: JsfLink;
}

/** Extrai a listagem de arquivos (menu "Arquivos"). Turma sem arquivos retorna lista vazia. */
export function parseFileList(page: Page): FileRow[] {
  const $ = page.$;
  const table = $('table.listing').first();
  if (table.length === 0) {
    if (page.isCoursePage) return [];
    throw new UnexpectedPageError('Tabela de arquivos não encontrada.', {
      path: page.url.pathname
    });
  }
  const headers = table
    .find('thead th')
    .toArray()
    .map((th) => fold(textOf($(th))));
  const column = (label: string, fallback: number): number => {
    const index = headers.indexOf(label);
    return index >= 0 ? index : fallback;
  };
  const titleIndex = column('titulo', 0);
  const descriptionIndex = column('descricao', 1);
  const topicIndex = column('topico de aula', 2);

  const rows: FileRow[] = [];
  table.find('tbody tr').each((_, tr) => {
    const cells = $(tr).children('td');
    const link = parseJsfLink(cells.find('a[onclick]').first().attr('onclick'));
    if (!link) return;
    rows.push({
      link,
      summary: {
        title: textOf(cells.eq(titleIndex)),
        description: textOf(cells.eq(descriptionIndex)),
        lessonTopic: textOf(cells.eq(topicIndex))
      }
    });
  });
  return rows;
}
