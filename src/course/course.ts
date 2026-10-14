import { NotFoundError, UnexpectedPageError } from '../errors.js';
import { buildLinkRequest } from '../jsf/form.js';
import type { StreamResponse } from '../http/http-client.js';
import { parseAttendance, type AttendanceReport } from '../parsers/absences.js';
import type { CourseInfo } from '../parsers/courses.js';
import { parseFileList, type FileSummary } from '../parsers/files.js';
import { parseGrades, type GradeReport } from '../parsers/grades.js';
import { parseLessons, type Lesson } from '../parsers/lessons.js';
import { parseMembers, type MemberList } from '../parsers/members.js';
import {
  parseNewsContent,
  parseNewsList,
  type NewsContent,
  type NewsSummary
} from '../parsers/news.js';
import { parseSyllabus, type Syllabus } from '../parsers/syllabus.js';
import type { Page } from '../page.js';
import type { Session } from '../session.js';
import { saveResponse, type DownloadOptions, type DownloadResult } from './download.js';
import { MENU, type CourseNavigator } from './navigator.js';

interface CourseContext {
  session: Session;
  navigator: CourseNavigator;
  info: CourseInfo;
}

/** Notícia da turma. */
export class NewsItem {
  readonly title: string;
  readonly date: Date;

  /** @internal */
  constructor(
    summary: NewsSummary,
    private readonly index: number,
    private readonly context: CourseContext
  ) {
    this.title = summary.title;
    this.date = summary.date;
  }

  /** Abre a notícia e devolve o conteúdo completo. */
  read(): Promise<NewsContent> {
    const { session, navigator, info } = this.context;
    return navigator.withSection(info, MENU.news, async (page) => {
      const row = parseNewsList(page)[this.index];
      if (row?.summary.title !== this.title) {
        throw new NotFoundError('A notícia não está mais na listagem da turma.');
      }
      const detail = await session.send(buildLinkRequest(page, row.link));
      navigator.invalidate();
      return parseNewsContent(detail);
    });
  }
}

/** Arquivo disponibilizado na turma. */
export class CourseFile {
  readonly title: string;
  readonly description: string;
  /** Tópico de aula associado, ou texto vazio. */
  readonly lessonTopic: string;

  /** @internal */
  constructor(
    summary: FileSummary,
    private readonly index: number,
    private readonly context: CourseContext
  ) {
    this.title = summary.title;
    this.description = summary.description;
    this.lessonTopic = summary.lessonTopic;
  }

  /**
   * Abre o arquivo e devolve a resposta HTTP com o corpo em *stream*. O chamador deve
   * consumir ou cancelar `body`. Prefira {@link CourseFile.download}.
   */
  open(): Promise<StreamResponse> {
    const { session, navigator, info } = this.context;
    return navigator.withSection(info, MENU.files, async (page) => {
      const row = parseFileList(page)[this.index];
      if (row?.summary.title !== this.title) {
        throw new NotFoundError('O arquivo não está mais na listagem da turma.');
      }
      const request = buildLinkRequest(page, row.link);
      const response = await session.http.stream(request.action, request.fields);
      navigator.invalidate();
      if ((response.headers.get('content-type') ?? '').includes('text/html')) {
        // Uma página HTML no lugar do arquivo indica erro ou sessão expirada.
        const body = await new Response(response.body).text();
        session.toPage({ ...response, body });
        throw new UnexpectedPageError('O SIGAA não devolveu o arquivo.', {
          path: response.url.pathname
        });
      }
      return response;
    });
  }

  /**
   * Baixa o arquivo. `destination` é um diretório existente (o nome do arquivo vem do
   * servidor, sanitizado) ou o caminho completo do arquivo de saída.
   */
  async download(destination: string, options?: DownloadOptions): Promise<DownloadResult> {
    return saveResponse(await this.open(), destination, options);
  }
}

/** Turma virtual do aluno. Cada método acessa o SIGAA; as chamadas são serializadas. */
export class Course {
  readonly code: string;
  readonly name: string;
  readonly section: string;
  readonly period: string;
  readonly workloadHours: number | undefined;
  /** Horário em código SIGAA (`35N34`); vazio se não informado. */
  readonly schedule: string;

  private readonly context: CourseContext;

  /** @internal */
  constructor(info: CourseInfo, session: Session, navigator: CourseNavigator) {
    this.code = info.code;
    this.name = info.name;
    this.section = info.section;
    this.period = info.period;
    this.workloadHours = info.workloadHours;
    this.schedule = info.schedule;
    this.context = { session, navigator, info };
  }

  /** Tópicos de aula da página principal da turma. */
  getLessons(): Promise<Lesson[]> {
    return this.read(MENU.main, parseLessons);
  }

  /** Notícias publicadas na turma. */
  async getNews(): Promise<NewsItem[]> {
    const rows = await this.read(MENU.news, parseNewsList);
    return rows.map((row, index) => new NewsItem(row.summary, index, this.context));
  }

  /** Arquivos disponibilizados na turma. */
  async getFiles(): Promise<CourseFile[]> {
    const rows = await this.read(MENU.files, parseFileList);
    return rows.map((row, index) => new CourseFile(row.summary, index, this.context));
  }

  /** Frequência do aluno. */
  getAttendance(): Promise<AttendanceReport> {
    return this.read(MENU.absences, parseAttendance);
  }

  /** Notas do aluno. */
  getGrades(): Promise<GradeReport> {
    return this.read(MENU.grades, parseGrades);
  }

  /** Docentes e colegas de turma. */
  getMembers(): Promise<MemberList> {
    return this.read(MENU.members, parseMembers);
  }

  /** Plano de curso. */
  getSyllabus(): Promise<Syllabus> {
    return this.read(MENU.syllabus, parseSyllabus);
  }

  private read<T>(section: (typeof MENU)[keyof typeof MENU], parse: (page: Page) => T): Promise<T> {
    return this.context.navigator.withSection(this.context.info, section, parse);
  }
}
