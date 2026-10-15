export { SigaaClient, DEFAULT_BASE_URL } from './client.js';
export type { Credentials, GetCoursesOptions, SigaaClientOptions } from './client.js';
export { Course, CourseFile, NewsItem } from './course/course.js';
export type {
  CourseDetails,
  DetailedCourse,
  DetailedCourses,
  DetailFailure
} from './course/details.js';
export type { DownloadOptions, DownloadResult } from './course/download.js';
export * from './errors.js';
export type { AbsenceDay, AttendanceReport } from './parsers/absences.js';
export type { CourseInfo } from './parsers/courses.js';
export type { Enrollment, EnrollmentCourse } from './parsers/enrollment.js';
export type { Slot } from './schedule.js';
export type { FileSummary } from './parsers/files.js';
export type {
  Assessment,
  GradeReport,
  GradeStatus,
  GradeUnit,
  UnitMethod
} from './parsers/grades.js';
export type { Lesson, LessonItem } from './parsers/lessons.js';
export type { MemberList, StudentMember, TeacherMember } from './parsers/members.js';
export type { NewsContent, NewsSummary } from './parsers/news.js';
export type { AcademicIndex, CurriculumProgress, Profile } from './parsers/profile.js';
export type {
  Syllabus,
  SyllabusEvaluation,
  SyllabusReference,
  SyllabusScheduleEntry
} from './parsers/syllabus.js';
export type { TeacherResult, TeacherUnit } from './parsers/teachers.js';
export type { TeacherSearchOptions } from './teachers.js';
export { VERSION } from './version.js';
