import { buildLinkRequest } from '../jsf/form.js';
import { NotFoundError, UnexpectedPageError } from '../errors.js';
import type { Page } from '../page.js';
import { courseKey, parseCourseList, type CourseInfo, type CourseRow } from '../parsers/courses.js';
import type { Session } from '../session.js';
import { fold, textOf } from '../util/text.js';

export const COURSES_PATH = '/sigaa/portais/discente/turmas.jsf';

/** Rótulos dos botões do menu lateral da turma virtual. */
export const MENU = {
  main: 'Principal',
  syllabus: 'Plano de Curso',
  members: 'Participantes',
  news: 'Notícias',
  absences: 'Frequência',
  grades: 'Ver Notas',
  files: 'Arquivos'
} as const;

export type MenuLabel = (typeof MENU)[keyof typeof MENU];

/** Código da turma exibido em uma página da turma virtual (ou `undefined`). */
export function pageCourseCode(page: Page): string | undefined {
  const fromHeader = textOf(page.$('#linkCodigoTurma').first()).replace(/\s*-$/, '');
  if (fromHeader) return fromHeader;
  const fromReport = textOf(page.$('#relatorio h3').first()).split(' - ')[0];
  return fromReport || undefined;
}

/**
 * Navega pela turma virtual. O SIGAA guarda a turma atual na sessão, então todas as
 * operações rodam em série e a página da última turma visitada é reaproveitada: acessar
 * outra seção da mesma turma custa uma única requisição.
 */
export class CourseNavigator {
  private current: { key: string; page: Page } | undefined;

  constructor(private readonly session: Session) {}

  /** Descarta a página em cache (use após navegar para fora do menu da turma). */
  invalidate(): void {
    this.current = undefined;
  }

  /** Lista as turmas de todos os períodos. */
  list(): Promise<CourseRow[]> {
    this.session.requireAuthentication();
    return this.session.queue.run(async () => {
      this.invalidate();
      return parseCourseList(await this.session.get(COURSES_PATH));
    });
  }

  /**
   * Abre a seção `label` da turma e executa `use` com a página resultante,
   * ainda dentro da fila de navegação (outras operações esperam).
   */
  withSection<T>(
    info: CourseInfo,
    label: MenuLabel,
    use: (page: Page) => Promise<T> | T
  ): Promise<T> {
    this.session.requireAuthentication();
    return this.session.queue.run(async () => {
      const page = await this.openSection(info, label);
      return use(page);
    });
  }

  private async openSection(info: CourseInfo, label: MenuLabel): Promise<Page> {
    const key = courseKey(info);
    for (const attempt of [0, 1]) {
      try {
        const base =
          this.current?.key === key && attempt === 0 ? this.current.page : await this.enter(info);
        const page = await this.clickMenu(base, label);
        const code = pageCourseCode(page);
        if (code !== info.code) {
          throw new UnexpectedPageError('O SIGAA abriu uma turma diferente da solicitada.', {
            path: page.url.pathname
          });
        }
        this.current = page.$('div.itemMenu').length > 0 ? { key, page } : undefined;
        return page;
      } catch (error) {
        this.invalidate();
        if (attempt === 1 || !(error instanceof UnexpectedPageError)) throw error;
      }
    }
    throw new UnexpectedPageError('Não foi possível abrir a turma.');
  }

  /** Entra na turma a partir da listagem atual (os tokens mudam, a chave da turma não). */
  private async enter(info: CourseInfo): Promise<Page> {
    const listing = await this.session.get(COURSES_PATH);
    const row = parseCourseList(listing).find((r) => courseKey(r.info) === courseKey(info));
    if (!row) {
      throw new NotFoundError(`Turma ${info.code} (${info.period}) não encontrada na listagem.`, {
        path: listing.url.pathname
      });
    }
    return this.session.send(buildLinkRequest(listing, row.link));
  }

  private async clickMenu(page: Page, label: MenuLabel): Promise<Page> {
    const button = page
      .$('div.itemMenu')
      .toArray()
      .find((el) => fold(textOf(page.$(el))) === fold(label));
    if (!button) {
      throw new UnexpectedPageError(`Botão "${label}" não encontrado no menu da turma.`, {
        path: page.url.pathname
      });
    }
    return this.session.click(page, page.$(button).closest('a').attr('onclick'));
  }
}
