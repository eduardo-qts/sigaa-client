import { load, type CheerioAPI } from 'cheerio';

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
}
