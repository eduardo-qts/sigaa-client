import type { Page } from '../page.js';
import { UnexpectedPageError } from '../errors.js';
import { clean, parseBrDate, textOf } from '../util/text.js';

/** Material ou atividade anexado a um tópico de aula. */
export interface LessonItem {
  title: string;
  description: string;
}

/** Tópico de aula da página principal da turma. */
export interface Lesson {
  title: string;
  startDate?: Date;
  endDate?: Date;
  /** Texto do tópico, sem os materiais anexados. */
  content: string;
  items: LessonItem[];
}

const PERIOD = /\((\d{1,2}\/\d{1,2}\/\d{4})(?:\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4}))?\)\s*$/;

/** Extrai os tópicos de aula da página principal da turma. */
export function parseLessons(page: Page): Lesson[] {
  const $ = page.$;
  if ($('#formMenu').length === 0) {
    throw new UnexpectedPageError('Página principal da turma não reconhecida.', {
      path: page.url.pathname
    });
  }
  return $('div.topico-aula')
    .toArray()
    .map((topic): Lesson => {
      const headline = clean($(topic).find('.titulo').first().text());
      const period = PERIOD.exec(headline);
      const startDate = period?.[1] ? parseBrDate(period[1]) : undefined;
      const endDate = period?.[2] ? parseBrDate(period[2]) : undefined;

      const body = $(topic).find('.conteudotopico').first().clone();
      const items = body
        .find('div.item')
        .toArray()
        .map((item): LessonItem => ({
          title: textOf($(item).find('a').first()) || textOf($(item).children('span').first()),
          description: textOf($(item).find('.descricao-item').first())
        }));
      body.find('div.item, .drag_indicator, script, style').remove();

      return {
        title: period ? clean(headline.slice(0, period.index)) : headline,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        content: textOf(body),
        items
      };
    });
}
