import {
  NotAuthenticatedError,
  SessionExpiredError,
  UnexpectedPageError,
  type SigaaErrorCode
} from '../errors.js';
import type { AttendanceReport } from '../parsers/absences.js';
import type { GradeReport } from '../parsers/grades.js';
import type { Lesson } from '../parsers/lessons.js';
import type { MemberList } from '../parsers/members.js';
import type { NewsSummary } from '../parsers/news.js';
import type { FileSummary } from '../parsers/files.js';
import type { Syllabus } from '../parsers/syllabus.js';
import type { Course } from './course.js';

/** Tudo o que a turma virtual expõe; seções que falharam ficam ausentes (veja `failures`). */
export interface CourseDetails {
  lessons?: Lesson[];
  news?: NewsSummary[];
  files?: FileSummary[];
  attendance?: AttendanceReport;
  grades?: GradeReport;
  members?: MemberList;
  syllabus?: Syllabus;
}

/** Falha ao ler uma seção de uma turma. Não contém dados pessoais. */
export interface DetailFailure {
  courseId: string;
  section: keyof CourseDetails;
  code: SigaaErrorCode | 'UNKNOWN';
  message: string;
  /** Presentes quando o HTML não tinha a estrutura esperada. */
  parser?: string;
  structure?: string;
}

export interface DetailedCourse {
  course: Course;
  details: CourseDetails;
}

export interface DetailedCourses {
  courses: DetailedCourse[];
  failures: DetailFailure[];
}

/**
 * Lê todas as seções da turma, uma de cada vez (o SIGAA guarda a turma atual na sessão).
 * Erro de uma seção vira `failure`; sessão expirada interrompe tudo, pois nada mais funcionaria.
 */
export async function loadDetails(courses: Course[]): Promise<DetailedCourses> {
  const result: DetailedCourses = { courses: [], failures: [] };
  for (const course of courses) {
    const details: CourseDetails = {};
    const sections: [keyof CourseDetails, () => Promise<unknown>][] = [
      ['lessons', () => course.getLessons()],
      ['news', async () => (await course.getNews()).map(({ title, date }) => ({ title, date }))],
      [
        'files',
        async () =>
          (await course.getFiles()).map(({ title, description, lessonTopic }) => ({
            title,
            description,
            lessonTopic
          }))
      ],
      ['attendance', () => course.getAttendance()],
      ['grades', () => course.getGrades()],
      ['members', () => course.getMembers()],
      ['syllabus', () => course.getSyllabus()]
    ];
    for (const [section, load] of sections) {
      try {
        Object.assign(details, { [section]: await load() });
      } catch (error) {
        if (error instanceof SessionExpiredError || error instanceof NotAuthenticatedError) {
          throw error;
        }
        const failure: DetailFailure = {
          courseId: course.id,
          section,
          code: (error as { code?: SigaaErrorCode }).code ?? 'UNKNOWN',
          message: error instanceof Error ? error.message : String(error)
        };
        if (error instanceof UnexpectedPageError) {
          if (error.parser) failure.parser = error.parser;
          if (error.structure) failure.structure = error.structure;
        }
        result.failures.push(failure);
      }
    }
    result.courses.push({ course, details });
  }
  return result;
}
