# Referência da API

Tudo é exportado por `sigaa-client`. Para a referência gerada do código:
`pnpm docs:api` (saída em `docs/api/`).

## Exportações

| Nome               | Tipo                             |
| ------------------ | -------------------------------- |
| `SigaaClient`      | classe                           |
| `Course`           | classe (criada por `getCourses`) |
| `CourseFile`       | classe (criada por `getFiles`)   |
| `NewsItem`         | classe (criada por `getNews`)    |
| `DEFAULT_BASE_URL` | `'https://sig.ufsj.edu.br'`      |
| `VERSION`          | `string`                         |
| Erros              | veja [Erros](erros.md)           |

## `SigaaClient`

```ts
new SigaaClient(options?: SigaaClientOptions)
```

| `SigaaClientOptions` | Tipo              | Padrão                        |
| -------------------- | ----------------- | ----------------------------- |
| `baseUrl`            | `string \| URL`   | `https://sig.ufsj.edu.br`     |
| `timeoutMs`          | `number`          | `30000`                       |
| `retries`            | `number` (só GET) | `2`                           |
| `retryDelayMs`       | `number`          | `300`                         |
| `userAgent`          | `string`          | `sigaa-client/<versão> (...)` |
| `fetch`              | `typeof fetch`    | `fetch` global                |

| Membro                 | Retorno               | Descrição                                                                                                                   |
| ---------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `isAuthenticated`      | `boolean`             | Há sessão autenticada                                                                                                       |
| `login(credentials)`   | `Promise<void>`       | `Credentials = { username, password }`                                                                                      |
| `logout()`             | `Promise<void>`       | Encerra a sessão e limpa cookies                                                                                            |
| `getProfile()`         | `Promise<Profile>`    | Perfil do discente                                                                                                          |
| `getCourses(options?)` | `Promise<Course[]>`   | `GetCoursesOptions = { period?: string; withDetails?: boolean }` (com `withDetails: true` devolve `{ courses, failures }`) |
| `getEnrollment()`      | `Promise<Enrollment>` | Atestado de matrícula: turmas com `status`, `type`, `room`, `professors`, `slots`, e `declaredTotal`                        |
| `teachers`             | `TeacherDirectory`    | `listUnits()` e `search(options?)`                                                                                          |

`period`: omitido = período mais recente; `'2025.1'` = esse período; `'all'` = todos.

## `Course`

Propriedades: `code`, `name`, `section`, `period`, `schedule` (`string`),
`workloadHours` (`number \| undefined`).

| Método            | Retorno                     |
| ----------------- | --------------------------- |
| `getLessons()`    | `Promise<Lesson[]>`         |
| `getNews()`       | `Promise<NewsItem[]>`       |
| `getFiles()`      | `Promise<CourseFile[]>`     |
| `getAttendance()` | `Promise<AttendanceReport>` |
| `getGrades()`     | `Promise<GradeReport>`      |
| `getMembers()`    | `Promise<MemberList>`       |
| `getSyllabus()`   | `Promise<Syllabus>`         |

## `NewsItem` e `CourseFile`

| Membro                                       | Descrição                                       |
| -------------------------------------------- | ----------------------------------------------- |
| `NewsItem.title`, `NewsItem.date`            | `string`, `string` (ISO)                        |
| `NewsItem.read()`                            | `Promise<NewsContent>`                          |
| `CourseFile.title/description/lessonTopic`   | `string`                                        |
| `CourseFile.download(destination, options?)` | `Promise<DownloadResult>`                       |
| `CourseFile.open()`                          | resposta com `status`, `url`, `headers`, `body` |

```ts
interface DownloadOptions {
  onProgress?: (bytesWritten: number, totalBytes?: number) => void;
  overwrite?: boolean; // padrão false
}
interface DownloadResult {
  path: string;
  filename: string;
  bytes: number;
}
```

## Tipos de dados

```ts
interface Profile {
  name: string;
  registration: string;
  program: string;
  shift?: string;
  level?: string;
  status?: string;
  institutionalEmail?: string;
  entryPeriod?: string;
  currentPeriod?: string;
  photoUrl?: URL;
  academicIndices: AcademicIndex[]; // { code: string; name?: string; value: number }
  curriculum: CurriculumProgress; // requiredPendingHours?, optionalPendingHours?,
  //   complementaryPendingHours?, totalHours?, completionPercent?
}

interface CourseInfo {
  code: string;
  name: string;
  section: string;
  period: string;
  workloadHours?: number;
  schedule: string;
}

interface AttendanceReport {
  days: AbsenceDay[]; // { date: string; // AAAA-MM-DD absences: number }
  totalAbsences: number;
  presencesRecorded?: number;
  classesWithRecord?: number;
  workloadClasses?: number;
  attendancePercent?: number;
  workloadAttendancePercent?: number;
}

interface GradeReport {
  units: GradeUnit[];
  makeUp?: number;
  finalGrade?: number;
  absences?: number;
  situation?: string;
}
interface GradeUnit {
  name: string;
  method: UnitMethod; // 'sum' | 'weighted-average' | 'arithmetic-average' | 'unknown'
  assessments: Assessment[]; // { code; name?; maxValue?; weight?; value? }
  value?: number;
}

interface Lesson {
  title: string;
  startDate?: Date;
  endDate?: Date;
  content: string;
  items: LessonItem[]; // { title; description }
}

interface NewsSummary {
  title: string;
  date: string; // ISO
}
interface NewsContent {
  title: string;
  publishedAt?: Date;
  text: string;
  html: string;
}
interface FileSummary {
  title: string;
  description: string;
  lessonTopic: string;
}

interface MemberList {
  teachers: TeacherMember[];
  students: StudentMember[];
}
interface TeacherMember {
  name: string;
  department?: string;
  formation?: string;
  email?: string;
  sections: string[];
  photoUrl?: URL;
}
interface StudentMember {
  name: string;
  registration?: string;
  program?: string;
  email?: string;
  section?: string;
  photoUrl?: URL;
}

interface Syllabus {
  methodology?: string;
  assessmentProcedures?: string;
  attendanceSchedule?: string;
  schedule: SyllabusScheduleEntry[]; // { startDate?; endDate?; description }
  evaluations: SyllabusEvaluation[]; // { date?; description }
  basicReferences: SyllabusReference[]; // { type; description }
  complementaryReferences: SyllabusReference[];
}

interface TeacherUnit {
  id: string;
  name: string;
}
interface TeacherResult {
  name: string;
  department: string;
  photoUrl?: URL;
  profileUrl?: URL;
}
interface TeacherSearchOptions {
  name?: string;
  unitId?: string;
}
```
