import { load, type CheerioAPI } from 'cheerio';
import { UnexpectedPageError } from './errors.js';

/** Página HTML do SIGAA já baixada e decodificada, com DOM sob demanda. */
export class Page {
  private dom: CheerioAPI | undefined;
  private plainText: string | undefined;

  constructor(
    readonly url: URL,
    readonly status: number,
    readonly html: string
  ) {}

  /** DOM (cheerio), construído na primeira utilização. */
  get $(): CheerioAPI {
    return (this.dom ??= load(this.html));
  }

  /** Texto da página já decodificado (entidades HTML resolvidas) e com espaços normalizados. */
  get text(): string {
    return (this.plainText ??= this.$.root().text().replace(/\s+/g, ' '));
  }

  /** `true` se o texto da página contém `needle` (útil para detectar mensagens do SIGAA). */
  includesText(needle: string): boolean {
    return this.text.includes(needle);
  }

  /** `true` se é uma página da turma virtual (tem o menu lateral). */
  get isCoursePage(): boolean {
    return this.$('div.itemMenu').length > 0;
  }

  /** Tags, ids e classes do `body` até `maxLength` caracteres; nunca inclui texto nem valores. */
  skeleton(maxLength = 1500): string {
    const walk = (
      el: { children?: unknown[]; name?: string; attribs?: Record<string, string> },
      depth: number
    ): string => {
      const kids =
        depth < 8 ? (el.children ?? []).filter((c) => (c as { type?: string }).type === 'tag') : [];
      const id = el.attribs?.id ? `#${el.attribs.id}` : '';
      const cls = el.attribs?.class ? `.${el.attribs.class.split(/\s+/).join('.')}` : '';
      const head = `${el.name}${id}${cls}`;
      return kids.length
        ? `${head}(${kids.map((k) => walk(k as typeof el, depth + 1)).join(',')})`
        : head;
    };
    const body = this.$('body').get(0);
    return body ? walk(body, 0).slice(0, maxLength) : '';
  }
}

/** Executa `parse(page)`; se falhar com `UnexpectedPageError`, anexa o nome do parser e o esqueleto da página. */
export function runParser<T>(parse: (page: Page) => T, page: Page): T {
  try {
    return parse(page);
  } catch (error) {
    if (error instanceof UnexpectedPageError && !error.parser) {
      error.parser = parse.name;
      error.structure = page.skeleton();
    }
    throw error;
  }
}
