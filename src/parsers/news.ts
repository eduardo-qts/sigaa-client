import { UnexpectedPageError } from '../errors.js';
import { parseJsfLink, type JsfLink } from '../jsf/form.js';
import type { Page } from '../page.js';
import { fold, parseBrIso, textOf } from '../util/text.js';

/** Notícia da turma, como aparece na listagem. */
export interface NewsSummary {
  title: string;
  /** Data de publicação (sem horário). */
  date: string;
}

export interface NewsRow {
  summary: NewsSummary;
  link: JsfLink;
}

/** Conteúdo completo de uma notícia. */
export interface NewsContent {
  title: string;
  /** Data e hora de publicação. */
  publishedAt?: string;
  /** Texto simples, com quebras de linha entre parágrafos. */
  text: string;
  /** HTML original do corpo da notícia. */
  html: string;
}

/** Extrai a listagem de notícias (menu "Notícias"). Turma sem notícias retorna lista vazia. */
export function parseNewsList(page: Page): NewsRow[] {
  const $ = page.$;
  const table = $('table.listing').first();
  if (table.length === 0) {
    if (page.isCoursePage) return [];
    throw new UnexpectedPageError('Tabela de notícias não encontrada.', {
      path: page.url.pathname
    });
  }
  const rows: NewsRow[] = [];
  table.find('tbody tr').each((_, tr) => {
    const cells = $(tr).children('td');
    const date = parseBrIso(textOf(cells.eq(1)));
    const link = parseJsfLink(cells.find('a[onclick]').first().attr('onclick'));
    if (!date || !link) return;
    rows.push({ summary: { title: textOf(cells.eq(0)), date }, link });
  });
  return rows;
}

/** Extrai o conteúdo de uma notícia aberta. */
export function parseNewsContent(page: Page): NewsContent {
  const $ = page.$;
  const body = $('td.conteudoNoticia').first();
  if (body.length === 0) {
    throw new UnexpectedPageError('Conteúdo da notícia não encontrado.', {
      path: page.url.pathname
    });
  }
  const field = (label: string): string => {
    const item = $('ul.form li')
      .toArray()
      .find(
        (li) => fold(textOf($(li).children('label').first()).replace(/:$/, '')) === fold(label)
      );
    return item ? textOf($(item).children('span').first()) : '';
  };
  const clone = body.clone();
  clone.find('br').replaceWith('\n');
  clone.find('p, div, li').append('\n');
  const text = clone
    .text()
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  const publishedAt = parseBrIso(field('Data'));
  return {
    title: field('Título'),
    ...(publishedAt ? { publishedAt } : {}),
    text,
    html: (body.html() ?? '').trim()
  };
}
