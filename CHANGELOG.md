# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento semântico.

## [1.0.0] - 2026-10-15

### Adicionado

- `client.getEnrollment()`: atestado de matrícula com período, total declarado e, por turma,
  `status`, `type`, `room`, `professors`, `schedule` e `slots`.
- `client.getCourses({ withDetails: true })`: lê todas as seções de cada turma e devolve
  `{ courses, failures }`; uma seção que falha não derruba as demais.
- `Course.slots` e `Course.id` (`período|código|turma`, sem normalização), `Course.sectionBase`
  e `EnrollmentCourse.sectionBase` (dígitos iniciais da turma). Horários em `{ day: 2–7, start, end }`
  com a grade de tempos da UFSJ.
- `GradeReport.status` (`APROVADO`, `REPROVADO`, `MATRICULADO`, `OUTRO`), além do código cru `situation`.
- `UnexpectedPageError.parser` e `.structure` (esqueleto da página, sem texto) para reportar mudanças no HTML.

### Alterado

- **Incompatível:** todas as datas públicas (`AbsenceDay.date`, `NewsItem.date`,
  `NewsSummary.date`, `NewsContent.publishedAt`, datas de aulas e do plano de curso) agora são
  `string` ISO local (`AAAA-MM-DD`, ou `AAAA-MM-DDTHH:MM` quando há hora) em vez de `Date`.

### Corrigido

- `sanitizeFilename` devolvia `"."` para entradas como `" ."`.

## [0.1.0] - 2026-10-14

Primeira versão: biblioteca escrita do zero, focada no SIGAA da UFSJ.

### Adicionado

- `SigaaClient` com login/logout, perfil, turmas por período, e por turma: frequência, notas,
  participantes, notícias (com conteúdo), aulas, plano de curso e arquivos (com download seguro).
- Busca pública de docentes (`client.teachers`).
- Erros tipados (`SigaaError` e subclasses com `code`).
- ESM + CJS com tipos TypeScript; única dependência de produção: `cheerio`.
- Navegação serializada por sessão, retentativas apenas para GET, timeout configurável.
- Suíte de testes offline (SIGAA falso + fixtures sintéticas) e testes de integração opcionais.
- Pipeline: CI (Node 22/24 + instalação do pacote em Node 20/22/24), auditoria, CodeQL, Gitleaks, Scorecard, release com provenance.
